const SessionStore = require('express-session').Store;

function parseExpires(session, callback) {
  let maxAge = 24 * 60 * 60 * 1000;

  if (session && session.cookie && Number.isFinite(Number(session.cookie.maxAge))) {
    maxAge = Number(session.cookie.maxAge);
  }

  return new Date(Date.now() + maxAge);
}

class MySQLSessionStore extends SessionStore {
  constructor(pool, options = {}) {
    super(options);
    this.pool = pool;
    this.cleanupTimer = setInterval(() => this.clearExpired(), 15 * 60 * 1000).unref();
  }

  get(sid, callback) {
    this.pool.query(
      'SELECT sess FROM sessions WHERE sid = ? AND expired >= NOW()',
      [sid],
      (err, rows) => {
        if (err) return callback(err);
        if (!rows || rows.length === 0) return callback(null, null);

        try {
          return callback(null, JSON.parse(rows[0].sess));
        } catch (parseError) {
          return callback(parseError);
        }
      }
    );
  }

  set(sid, session, callback) {
    let raw;
    try {
      raw = JSON.stringify(session);
    } catch (serializeError) {
      return callback(serializeError);
    }

    this.pool.query(
      `INSERT INTO sessions (sid, sess, expired)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE sess = VALUES(sess), expired = VALUES(expired)`,
      [sid, raw, parseExpires(session)],
      (err) => callback(err || null)
    );
  }

  destroy(sid, callback) {
    this.pool.query('DELETE FROM sessions WHERE sid = ?', [sid], (err) => callback(err || null));
  }

  touch(sid, session, callback) {
    const maxAge = session && session.cookie && Number.isFinite(Number(session.cookie.maxAge))
      ? Number(session.cookie.maxAge)
      : 24 * 60 * 60 * 1000;

    this.pool.query(
      'UPDATE sessions SET expired = ? WHERE sid = ? AND expired >= NOW()',
      [new Date(Date.now() + maxAge), sid],
      (err) => callback(err || null)
    );
  }

  clearExpired() {
    this.pool.query('DELETE FROM sessions WHERE expired < NOW()', (err) => {
      if (err) {
        console.error('Unable to prune expired sessions:', err.message);
      }
    });
  }

  stopCleanup() {
    if (this.cleanupTimer) clearInterval(this.cleanupTimer);
  }
}

module.exports = MySQLSessionStore;
