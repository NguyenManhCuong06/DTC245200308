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

const startServer = () => {
  db.query('SELECT 1', (err) => {
    if (err) {
      console.error('Database connection error:', err.message);
      setTimeout(startServer, 1000);
      return;
    }

    console.log('Connected to MySQL database');
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
app.use(fileUpload({
  createParentPath: true,
  limits: { fileSize: 10 * 1024 * 1024, files: 10 },
  abortOnLimit: true,
  responseOnLimit: 'Upload limit exceeded'
}));

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: { 
    secure: process.env.NODE_ENV === 'production',
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

app.use('/', authRoutes);
app.use('/albums', albumRoutes);
app.use('/photos', photoRoutes);
app.use('/share', shareRoutes);
app.use('/api', apiRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  db.query('SELECT 1 as health', (err) => {
    if (err) {
      return res.status(503).json({ status: 'unhealthy', error: err.message });
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
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

startServer();

module.exports = { app, db };