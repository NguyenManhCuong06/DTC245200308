const fs = require('fs');
const path = require('path');
const db = require('../db');

const uploadDirectory = path.join(__dirname, '../../public/uploads');

async function deleteStoredFiles(paths) {
  await Promise.all(paths.filter(Boolean).map(async storedPath => {
    if (!storedPath.startsWith('/uploads/')
        || path.posix.basename(storedPath) !== storedPath.slice('/uploads/'.length)) {
      throw new Error('Invalid stored media path');
    }
    try {
      await fs.promises.unlink(path.join(uploadDirectory, path.posix.basename(storedPath)));
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
  }));
}

const adminController = {
  getDashboard: async (req, res) => {
    try {
      const [[{ userCount }]] = await db.promise().query('SELECT COUNT(*) AS userCount FROM users');
      const [[{ albumCount }]] = await db.promise().query('SELECT COUNT(*) AS albumCount FROM albums');
      const [[{ photoCount }]] = await db.promise().query('SELECT COUNT(*) AS photoCount FROM photos');
      const [users] = await db.promise().query(
        `SELECT u.id, u.username, u.email, u.role, u.is_locked, u.created_at,
                COUNT(DISTINCT a.id) AS album_count, COUNT(DISTINCT p.id) AS photo_count
         FROM users u
         LEFT JOIN albums a ON a.user_id = u.id
         LEFT JOIN photos p ON p.user_id = u.id
         GROUP BY u.id
         ORDER BY u.created_at DESC`
      );
      const [albums] = await db.promise().query(
        `SELECT a.id, a.title, a.user_id, a.is_public, a.created_at, u.username
         FROM albums a JOIN users u ON u.id = a.user_id
         ORDER BY a.created_at DESC LIMIT 20`
      );
      const [photos] = await db.promise().query(
        `SELECT p.id, p.title, p.user_id, p.album_id, p.created_at, u.username
         FROM photos p JOIN users u ON u.id = p.user_id
         ORDER BY p.created_at DESC LIMIT 20`
      );
      const [media] = await db.promise().query('SELECT path, thumbnail_path FROM photos');
      let storageBytes = 0;
      let missingFiles = 0;
      for (const item of media) {
        for (const storedPath of [item.path, item.thumbnail_path]) {
          if (!storedPath) continue;
          if (!storedPath.startsWith('/uploads/')
              || path.posix.basename(storedPath) !== storedPath.slice('/uploads/'.length)) {
            throw new Error('Invalid stored media path in database');
          }
          try {
            const file = await fs.promises.stat(path.join(uploadDirectory, path.posix.basename(storedPath)));
            storageBytes += file.size;
          } catch (error) {
            if (error.code === 'ENOENT') {
              missingFiles++;
            } else {
              throw error;
            }
          }
        }
      }
      res.render('pages/admin', {
        title: 'Admin Dashboard',
        user: req.user,
        users,
        albums,
        photos,
        stats: { userCount, albumCount, photoCount, storageBytes, missingFiles },
        messages: { error: req.flash('error'), success: req.flash('success') }
      });
    } catch (error) {
      console.error('Unable to load admin dashboard:', error.message);
      res.status(500).send('Unable to load admin dashboard');
    }
  },

  setUserLock: async (req, res) => {
    const lock = req.params.action === 'lock';
    try {
      const [users] = await db.promise().query(
        'SELECT id FROM users WHERE id = ?',
        [req.params.userId]
      );
      if (!users.length) return res.sendStatus(404);
      if (Number(req.params.userId) === Number(req.user.id)) {
        req.flash('error', 'You cannot lock your own admin account');
        return res.redirect('/admin');
      }
      await db.promise().query(
        'UPDATE users SET is_locked = ? WHERE id = ?',
        [lock ? 1 : 0, req.params.userId]
      );
      req.flash('success', `User ${lock ? 'locked' : 'unlocked'}`);
      res.redirect('/admin');
    } catch (error) {
      console.error('Unable to change user lock status:', error.message);
      res.status(500).send('Unable to change user lock status');
    }
  },

  deletePhoto: async (req, res) => {
    let connection;
    try {
      connection = await db.promise().getConnection();
      await connection.beginTransaction();
      const [photos] = await connection.query(
        'SELECT path, thumbnail_path FROM photos WHERE id = ?',
        [req.params.photoId]
      );
      if (!photos.length) {
        await connection.rollback();
        return res.sendStatus(404);
      }
      await connection.query('DELETE FROM photos WHERE id = ?', [req.params.photoId]);
      await connection.commit();
      await deleteStoredFiles([photos[0].path, photos[0].thumbnail_path]);
      req.flash('success', 'Photo removed by admin');
      res.redirect('/admin');
    } catch (error) {
      if (connection) {
        try {
          await connection.rollback();
        } catch (rollbackError) {
          console.error('Unable to roll back photo moderation:', rollbackError.message);
        }
      }
      console.error('Unable to remove photo:', error.message);
      res.status(500).send('Unable to remove photo');
    } finally {
      if (connection) connection.release();
    }
  },

  deleteAlbum: async (req, res) => {
    let connection;
    let storedPaths = [];
    try {
      connection = await db.promise().getConnection();
      await connection.beginTransaction();
      const [albums] = await connection.query('SELECT id FROM albums WHERE id = ?', [req.params.albumId]);
      if (!albums.length) {
        await connection.rollback();
        return res.sendStatus(404);
      }
      const [photos] = await connection.query(
        'SELECT path, thumbnail_path FROM photos WHERE album_id = ?',
        [req.params.albumId]
      );
      storedPaths = photos.flatMap(photo => [photo.path, photo.thumbnail_path]);
      await connection.query('DELETE FROM photos WHERE album_id = ?', [req.params.albumId]);
      await connection.query('DELETE FROM albums WHERE id = ?', [req.params.albumId]);
      await connection.commit();
      await deleteStoredFiles(storedPaths);
      req.flash('success', 'Album and its photos removed by admin');
      res.redirect('/admin');
    } catch (error) {
      if (connection) {
        try {
          await connection.rollback();
        } catch (rollbackError) {
          console.error('Unable to roll back album moderation:', rollbackError.message);
        }
      }
      console.error('Unable to remove album:', error.message);
      res.status(500).send('Unable to remove album');
    } finally {
      if (connection) connection.release();
    }
  }
};

module.exports = adminController;
