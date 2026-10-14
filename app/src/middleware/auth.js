function requireAuthentication(req, res, next) {
  if (req.isAuthenticated && req.isAuthenticated()) return next();
  if (req.accepts('html')) return res.redirect('/login');
  res.sendStatus(401);
}

function requireAdmin(req, res, next) {
  if (!req.user) return res.sendStatus(401);
  if (req.user.role !== 'admin') return res.sendStatus(403);
  next();
}

module.exports = { requireAuthentication, requireAdmin };
