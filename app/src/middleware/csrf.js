const crypto = require('crypto');

const CSRF_COOKIE = '_csrf';
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS', 'TRACE']);
const TOKEN_RE = /^[a-f0-9]{64}$/;

function parseCookies(req) {
  const header = req.get('cookie');
  if (!header) return {};

  return Object.fromEntries(
    String(header).split(/;\s*/).map((part) => {
      const separator = part.indexOf('=');
      return separator < 0
        ? [part, '']
        : [part.slice(0, separator), decodeURIComponent(part.slice(separator + 1))];
    })
  );
}

function issueToken(res) {
  const token = crypto.randomBytes(32).toString('hex');
  const secure = process.env.NODE_ENV === 'production' ? 'Secure; ' : '';
  res.append('Set-Cookie', `${CSRF_COOKIE}=${token}; Path=/; ${secure}HttpOnly; SameSite=Strict; Max-Age=86400`);
  return token;
}

function csrfProtection(req, res, next) {
  const cookies = parseCookies(req);
  const cookieToken = TOKEN_RE.test(cookies[CSRF_COOKIE]) ? cookies[CSRF_COOKIE] : null;
  const token = cookieToken || issueToken(res);
  res.locals.csrfToken = token;

  if (SAFE_METHODS.has(req.method.toUpperCase())) {
    return next();
  }

  const fetchSite = (req.get('sec-fetch-site') || '').toLowerCase();
  if (fetchSite === 'cross-site') {
    return res.status(403).render('pages/error', {
      title: 'Forbidden',
      status: 403,
      message: 'Cross-site requests are not allowed.',
      user: req.user || null,
    });
  }

  const origin = req.get('origin');
  if (origin) {
    try {
      if (new URL(origin).host !== req.get('host')) {
        return res.status(403).render('pages/error', {
          title: 'Forbidden',
          status: 403,
          message: 'Origin not allowed.',
          user: req.user || null,
        });
      }
    } catch {
      return res.status(403).render('pages/error', {
        title: 'Forbidden',
        status: 403,
        message: 'Invalid origin.',
        user: req.user || null,
      });
    }
  }

  const submitted = req.body && (req.body._csrf || req.get('x-csrf-token') || req.get('x-xsrf-token'));
  if (!cookieToken || !TOKEN_RE.test(submitted) || submitted !== cookieToken) {
    return res.status(403).render('pages/error', {
      title: 'Forbidden',
      status: 403,
      message: 'Invalid or missing CSRF token.',
      user: req.user || null,
    });
  }

  return next();
}

module.exports = csrfProtection;
