const bcrypt = require('bcryptjs');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const db = require('../db');

function validatePasswordStrength(password) {
  const errors = [];
  if (!password) {
    errors.push('Mật khẩu là bắt buộc');
    return errors;
  }
  if (password.length < 8) errors.push('Ít nhất 8 ký tự');
  if (!/[A-Z]/.test(password)) errors.push('Ít nhất 1 chữ HOA');
  if (!/[a-z]/.test(password)) errors.push('Ít nhất 1 chữ thường');
  if (!/[0-9]/.test(password)) errors.push('Ít nhất 1 số');
  if (!/[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/.test(password)) errors.push('Ít nhất 1 ký tự đặc biệt (!@#$%^&*...)');
  return errors;
}

const authController = {
  renderLogin: (req, res) => {
    res.render('pages/login', { 
      title: 'Login',
      error: req.flash('error'),
      success: req.flash('success'),
      user: null
    });
  },

  renderRegister: (req, res) => {
    res.render('pages/register', { 
      title: 'Register',
      error: req.flash('error'),
      user: null
    });
  },

  register: (req, res) => {
    const { username, email, password, confirm_password } = req.body;

    if (password !== confirm_password) {
      req.flash('error', 'Passwords do not match');
      return res.redirect('/register');
    }

    const passwordErrors = validatePasswordStrength(password);
    if (passwordErrors.length > 0) {
      req.flash('error', passwordErrors.join('; '));
      return res.redirect('/register');
    }

    const hashedPassword = bcrypt.hashSync(password, 10);
    const query = 'INSERT INTO users (username, email, password) VALUES (?, ?, ?)';
    
    db.query(query, [username, email, hashedPassword], (err) => {
      if (err) {
        if (err.code === 'ER_DUP_ENTRY') {
          req.flash('error', 'Username or email already exists');
        } else {
          req.flash('error', 'Registration failed');
        }
        return res.redirect('/register');
      }
      req.flash('success', 'Registration successful. Please log in.');
      res.redirect('/login');
    });
  },

  login: (req, res, next) => {
    passport.authenticate('local', {
      successRedirect: '/albums',
      failureRedirect: '/login',
      failureFlash: true
    })(req, res, next);
  },

  logout: (req, res, next) => {
    req.logout((err) => {
      if (err) {
        return next(err);
      }
      req.session.destroy(() => {
        res.clearCookie('connect.sid');
        res.redirect('/');
      });
    });
  },

  renderHome: async (req, res) => {
    try {
      const isAuth = !!req.user;
      const userId = isAuth ? req.user.id : -1;

      // Stats calculation
      const [[statsResult]] = await db.promise().query(
        isAuth
          ? `SELECT 
               COUNT(p.id) as photoCount,
               (SELECT COUNT(*) FROM albums WHERE user_id = ?) as albumCount,
               (SELECT COUNT(DISTINCT pt.tag_id) FROM photo_tags pt JOIN photos p2 ON p2.id = pt.photo_id WHERE p2.user_id = ?) as tagCount
             FROM photos p WHERE p.user_id = ?`
          : `SELECT 
               COUNT(p.id) as photoCount,
               (SELECT COUNT(*) FROM albums WHERE is_public = TRUE) as albumCount,
               (SELECT COUNT(*) FROM tags) as tagCount
             FROM photos p WHERE p.is_public = TRUE`,
        isAuth ? [userId, userId, userId] : []
      );

      // Recent photos
      const [recentPhotos] = await db.promise().query(
        `SELECT p.*, u.username, a.title as album_title
         FROM photos p
         JOIN users u ON u.id = p.user_id
         LEFT JOIN albums a ON a.id = p.album_id
         WHERE ${isAuth ? 'p.user_id = ?' : 'p.is_public = TRUE'}
         ORDER BY p.created_at DESC
         LIMIT 6`,
        isAuth ? [userId] : []
      );

      // Recent / Top Albums
      const [albums] = await db.promise().query(
        `SELECT a.*, u.username,
                COUNT(p.id) as photo_count
         FROM albums a
         JOIN users u ON u.id = a.user_id
         LEFT JOIN photos p ON p.album_id = a.id AND (${isAuth ? 'p.user_id = ?' : 'p.is_public = TRUE'})
         WHERE ${isAuth ? 'a.user_id = ?' : 'a.is_public = TRUE'}
         GROUP BY a.id
         ORDER BY a.created_at DESC
         LIMIT 4`,
        isAuth ? [userId, userId] : []
      );

      recentPhotos.forEach(p => {
        p.path = `/photos/${p.id}/original`;
        p.thumbnailPath = `/photos/${p.id}/thumbnail`;
      });

      res.render('pages/home', {
        title: isAuth ? 'Lumina Dashboard' : 'Gallery - Thư viện Ảnh Hiện đại',
        user: req.user,
        stats: {
          photoCount: statsResult?.photoCount || 0,
          albumCount: statsResult?.albumCount || 0,
          tagCount: statsResult?.tagCount || 0
        },
        recentPhotos,
        albums
      });
    } catch (err) {
      console.error('Error rendering home/dashboard:', err.message);
      res.render('pages/home', {
        title: 'Gallery - Image Library',
        user: req.user,
        stats: { photoCount: 0, albumCount: 0, tagCount: 0 },
        recentPhotos: [],
        albums: []
      });
    }
  }
};

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser((id, done) => {
  db.query(
    'SELECT id, username, email, role FROM users WHERE id = ? AND is_locked = FALSE',
    [id],
    (err, results) => {
      if (err) return done(err);
      done(null, results[0] || false);
    }
  );
});

passport.use(new LocalStrategy({
  usernameField: 'email',
  passwordField: 'password'
}, (email, password, done) => {
  db.query('SELECT * FROM users WHERE email = ?', [email], (err, results) => {
    if (err) return done(err);
    if (results.length === 0) return done(null, false, { message: 'Incorrect email.' });
    
    const user = results[0];
    if (user.is_locked) return done(null, false, { message: 'This account is locked.' });
    const isValid = bcrypt.compareSync(password, user.password);
    
    if (!isValid) return done(null, false, { message: 'Incorrect password.' });
    
    return done(null, user);
  });
}));

module.exports = authController;