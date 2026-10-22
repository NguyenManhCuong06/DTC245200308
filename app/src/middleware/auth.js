function requireAuthentication(req, res, next) {
  if (req.isAuthenticated && req.isAuthenticated()) return next();
  if (req.accepts('html')) return res.redirect('/login');
  res.sendStatus(401);
}

function requireAdmin(req, res, next) {
  if (!req.user) {
    if (req.accepts('html')) return res.redirect('/login');
    return res.sendStatus(401);
  }
  if (req.user.role !== 'admin') {
    if (req.accepts('html')) {
      return res.status(403).render('pages/error', {
        title: 'Không có quyền truy cập',
        status: 403,
        message: 'Tài khoản của bạn không có quyền truy cập trang quản trị.',
        user: req.user
      });
    }
    return res.sendStatus(403);
  }
  next();
}

module.exports = { requireAuthentication, requireAdmin };
