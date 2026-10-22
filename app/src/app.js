const express = require('express');
const session = require('express-session');
const fileUpload = require('express-fileupload');
const path = require('path');
const passport = require('passport');
const dotenv = require('dotenv');
const promClient = require('prom-client');
const flash = require('connect-flash');
const fs = require('fs');

dotenv.config();

const requiredEnvironment = ['DB_HOST', 'DB_USER', 'DB_PASSWORD', 'DB_NAME', 'SESSION_SECRET'];
const missingEnvironment = requiredEnvironment.filter(name => !process.env[name]);
if (missingEnvironment.length > 0) {
  throw new Error(`Missing required environment variables: ${missingEnvironment.join(', ')}`);
}

const app = express();
const PORT = process.env.PORT || 3000;
app.set('trust proxy', 1);
app.disable('x-powered-by');

// Ensure logs directory exists
const logsDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Simple file logger
const logFile = path.join(logsDir, 'app.log');
const writeLog = (level, message, meta = {}) => {
  const logEntry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...meta
  };
  fs.appendFileSync(logFile, JSON.stringify(logEntry) + '\n');
};

// Prometheus metrics
const register = new promClient.Registry();
promClient.collectDefaultMetrics({ register });
const httpRequestDuration = new promClient.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5]
});
const httpRequestsTotal = new promClient.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code']
});
const photosUploadedTotal = new promClient.Counter({
  name: 'photos_uploaded_total',
  help: 'Total number of photos uploaded'
});
register.registerMetric(httpRequestDuration);
register.registerMetric(httpRequestsTotal);
register.registerMetric(photosUploadedTotal);

// Metrics middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;
    const route = req.route?.path || req.path;
    httpRequestDuration.observe({ method: req.method, route, status_code: res.statusCode }, duration);
    httpRequestsTotal.inc({ method: req.method, route, status_code: res.statusCode });

    // Log request
    writeLog('info', 'HTTP request', {
      method: req.method,
      route,
      status_code: res.statusCode,
      duration_ms: Math.round(duration * 1000),
      ip: req.ip
    });
  });
  next();
});

// Metrics endpoint (internal only - not exposed via nginx)
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});

// Export logger and metrics for use in controllers
app.locals.logger = { writeLog };
app.locals.metrics = {
  httpRequestDuration,
  httpRequestsTotal,
  photosUploadedTotal
};

// Database connection pool
const db = require('./db');
app.set('db', db);

const requiredSecretLength = 32;
if (process.env.NODE_ENV === 'production' && (!process.env.SESSION_SECRET || process.env.SESSION_SECRET.length < requiredSecretLength)) {
  throw new Error('SESSION_SECRET must be at least ' + requiredSecretLength + ' characters in production');
}

const MySQLSessionStore = require('./sessionStore');
const sessionStore = new MySQLSessionStore(db);

const startServer = () => {
  // Read-only readiness probe. The runtime account is intentionally DML-only,
  // so the sessions table must be created by db/init-scripts/init.sql.
  db.query('SELECT 1 FROM sessions LIMIT 0', (err) => {
    if (err) {
      if (err.code === 'ER_NO_SUCH_TABLE' || err.code === 'ER_TABLEACCESS_DENIED_ERROR' || err.code === 'ER_DBACCESS_DENIED_ERROR') {
        console.error('Session schema is not ready:', err.message);
        console.error('Apply db/init-scripts/init.sql with a privileged account before starting the app.');
        process.exit(1);
      }
      console.error('Database connection error:', err.message);
      setTimeout(startServer, 1000);
      return;
    }

    console.log('Connected to MySQL database; session schema ready');
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  });
};

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/css', express.static(path.join(__dirname, '../public/css')));
app.use('/js', express.static(path.join(__dirname, '../public/js')));
app.use('/vendor/bootstrap', express.static(path.join(__dirname, '../node_modules/bootstrap/dist')));
app.use(fileUpload({
  createParentPath: true,
  limits: { fileSize: 10 * 1024 * 1024, files: 10 },
  abortOnLimit: true,
  responseOnLimit: 'Upload limit exceeded'
}));

// CSRF protection for state-changing same-origin requests
app.use(require('./middleware/csrf'));

// Session configuration
app.use(session({
  name: 'gallery.sid',
  secret: process.env.SESSION_SECRET,
  store: sessionStore,
  resave: false,
  saveUninitialized: false,
  rolling: true,
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 24 * 60 * 60 * 1000
  }
}));
app.use(flash());

// Passport initialization
app.use(passport.initialize());
app.use(passport.session());

// View engine setup
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '../views'));

// Routes
const authRoutes = require('./routes/auth');
const albumRoutes = require('./routes/albums');
const photoRoutes = require('./routes/photos');
const apiRoutes = require('./routes/api');
const shareRoutes = require('./routes/shares');
const adminRoutes = require('./routes/admin');

app.use('/', authRoutes);
app.use('/albums', albumRoutes);
app.use('/photos', photoRoutes);
app.use('/share', shareRoutes);
app.use('/admin', adminRoutes);
app.use('/api', apiRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  db.query('SELECT 1 as health', (err) => {
    if (err) {
      // Never leak driver/connection details to unauthenticated callers.
      console.error('Health check failed:', err.message);
      return res.status(503).json({ status: 'unhealthy' });
    }
    res.json({ status: 'healthy', timestamp: new Date().toISOString() });
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).render('pages/404', { title: 'Page Not Found' });
});

// Error handler
app.use((err, req, res, next) => {
  if (res.headersSent) return next(err);
  const status = err.status >= 400 && err.status < 600 ? err.status : 500;
  console.error(err.stack);
  if (req.accepts('html')) {
    return res.status(status).render('pages/error', {
      title: 'Request failed',
      status,
      message: status >= 500 ? 'The request could not be completed.' : err.message
    });
  }
  res.status(status).json({ error: status >= 500 ? 'The request could not be completed.' : err.message });
});

// Schema creation is handled once by db/init-scripts/init.sql. Startup only
// verifies that the runtime account can read the sessions table.
startServer();

module.exports = { app, db };