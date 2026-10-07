const bcrypt = require('bcryptjs');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const { db } = require('../app');

const authController = {
  renderLogin: (req, res) => {
    res.render('pages/login', { 
      title: 'Login',
      error: req.flash('error'),
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

  logout: (req, res) => {
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

  renderHome: (req, res) => {
    if (req.user) {
      return res.redirect('/albums');
    }
    res.render('pages/home', { title: 'Gallery - Image Library', user: null });
  }
};

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser((id, done) => {
  db.query('SELECT * FROM users WHERE id = ?', [id], (err, results) => {
    done(err, results[0]);
  });
});

passport.use(new LocalStrategy({
  usernameField: 'email',
  passwordField: 'password'
}, (email, password, done) => {
  db.query('SELECT * FROM users WHERE email = ?', [email], (err, results) => {
    if (err) return done(err);
    if (results.length === 0) return done(null, false, { message: 'Incorrect email.' });
    
    const user = results[0];
    const isValid = bcrypt.compareSync(password, user.password);
    
    if (!isValid) return done(null, false, { message: 'Incorrect password.' });
    
    return done(null, user);
  });
}));

module.exports = authController;