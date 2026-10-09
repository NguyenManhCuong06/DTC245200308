const crypto = require('crypto');
const path = require('path');
const db = require('../db');

const uploadDirectory = path.join(__dirname, '../../public/uploads');
const allowedExpiryDays = new Set([1, 7, 30]);

function renderNotFound(res) {
  return res.status(404).render('pages/404', { title: 'Share not found' });
}

function sendMedia(res, storedPath) {
  if (!storedPath || !storedPath.startsWith('/uploads/')
      || path.posix.basename(storedPath) !== storedPath.slice('/uploads/'.length)) {
    return res.sendStatus(404);
  }
  res.set('Cache-Control', 'private, no-store');
  res.sendFile(path.join(uploadDirectory, path.posix.basename(storedPath)), error => {
    if (error && !res.headersSent) {
      if (error.code === 'ENOENT') return res.sendStatus(404);
      console.error('Unable to serve shared photo:', error.message);
      res.sendStatus(500);
    }
  });
}

const shareController = {
  createAlbumShare: async (req, res) => {
    if (!req.user) return res.redirect('/login');
    const days = Number(req.body.expires_in_days || 7);
    if (!allowedExpiryDays.has(days)) {
      req.flash('error', 'Choose a valid share-link expiry');
      return res.redirect(`/albums/${req.params.id}`);
    }
    try {
      const [albums] = await db.promise().query(
        'SELECT id FROM albums WHERE id = ? AND user_id = ?',
        [req.params.id, req.user.id]
      );
      if (!albums.length) return renderNotFound(res);
      const token = crypto.randomBytes(32).toString('base64url');
      const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
      await db.promise().query(
        'INSERT INTO share_links (album_id, token, expires_at, created_by) VALUES (?, ?, ?, ?)',
        [req.params.id, token, expiresAt, req.user.id]
      );
      req.flash('success', 'Share link created');
      res.redirect(`/albums/${req.params.id}`);
    } catch (error) {
      console.error('Unable to create album share:', error.message);
      res.status(500).send('Unable to create share link');
    }
  },

  revokeAlbumShare: async (req, res) => {
    if (!req.user) return res.redirect('/login');
    try {
      const [result] = await db.promise().query(
        `UPDATE share_links s
         JOIN albums a ON a.id = s.album_id
         SET s.revoked_at = CURRENT_TIMESTAMP
         WHERE s.id = ? AND s.album_id = ? AND s.created_by = ? AND a.user_id = ? AND s.revoked_at IS NULL`,
        [req.params.shareId, req.params.id, req.user.id, req.user.id]
      );
      if (!result.affectedRows) return renderNotFound(res);
      req.flash('success', 'Share link revoked');
      res.redirect(`/albums/${req.params.id}`);
    } catch (error) {
      console.error('Unable to revoke album share:', error.message);
      res.status(500).send('Unable to revoke share link');
    }
  },

  getSharedAlbum: async (req, res) => {
    try {
      const [links] = await db.promise().query(
        `SELECT s.id, s.album_id, s.expires_at, s.revoked_at, a.title, a.description,
                a.created_at, u.username
         FROM share_links s
         JOIN albums a ON a.id = s.album_id
         JOIN users u ON u.id = a.user_id
         WHERE s.token = ?
         LIMIT 1`,
        [req.params.token]
      );
      if (!links.length || links[0].revoked_at) return renderNotFound(res);
      if (new Date(links[0].expires_at).getTime() <= Date.now()) {
        return res.status(410).send('This share link has expired');
      }

      const [photos] = await db.promise().query(
        `SELECT id, title, description, is_public
         FROM photos WHERE album_id = ? ORDER BY created_at DESC`,
        [links[0].album_id]
      );
      photos.forEach(photo => {
        photo.thumbnailPath = `/share/${req.params.token}/photos/${photo.id}/thumbnail`;
        photo.originalPath = `/share/${req.params.token}/photos/${photo.id}/original`;
      });
      res.render('pages/share-album', {
        title: links[0].title,
        album: links[0],
        photos,
        user: null
      });
    } catch (error) {
      console.error('Unable to load shared album:', error.message);
      res.status(500).send('Unable to load shared album');
    }
  },

  getSharedMedia: async (req, res) => {
    if (!['original', 'thumbnail'].includes(req.params.variant)) return res.sendStatus(404);
    try {
      const column = req.params.variant === 'thumbnail' ? 'thumbnail_path' : 'path';
      const [photos] = await db.promise().query(
        `SELECT p.${column} AS stored_path
         FROM share_links s
         JOIN photos p ON p.album_id = s.album_id
         WHERE s.token = ? AND p.id = ? AND s.revoked_at IS NULL AND s.expires_at > NOW()
         LIMIT 1`,
        [req.params.token, req.params.photoId]
      );
      if (!photos.length) return res.sendStatus(404);
      sendMedia(res, photos[0].stored_path);
    } catch (error) {
      console.error('Unable to authorize shared photo:', error.message);
      res.sendStatus(500);
    }
  }
};

module.exports = shareController;
