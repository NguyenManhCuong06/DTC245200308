const db = require('../db');
const notFound = (res) => res.status(404).render('pages/404', { title: 'Album not found' });

const albumController = {
  getAllAlbums: (req, res) => {
    const query = `
      SELECT a.*, u.username,
             COUNT(CASE WHEN p.is_public = TRUE OR a.user_id = ? THEN p.id END) as photo_count
      FROM albums a 
      JOIN users u ON a.user_id = u.id 
      LEFT JOIN photos p ON a.id = p.album_id 
      WHERE a.is_public = TRUE OR a.user_id = ?
      GROUP BY a.id 
      ORDER BY a.created_at DESC
    `;
    
    const userId = req.user ? req.user.id : -1;
    db.query(query, [userId, userId], (err, results) => {
      if (err) {
        return res.status(500).send('Unable to load albums');
      }
      res.render('pages/albums', { 
        title: 'Albums',
        albums: results,
        user: req.user,
        messages: { error: req.flash('error'), success: req.flash('success') }
      });
    });
  },

  renderCreateAlbum: (req, res) => {
    if (!req.user) return res.redirect('/login');
    res.render('pages/album-create', {
      title: 'Create Album',
      user: req.user,
      messages: { error: req.flash('error'), success: req.flash('success') }
    });
  },

  createAlbum: (req, res) => {
    if (!req.user) {
      return res.redirect('/login');
    }

    const { title, description, is_public } = req.body;
    if (!title || !title.trim()) {
      req.flash('error', 'Album title is required');
      return res.redirect('/albums/create');
    }
    const query = 'INSERT INTO albums (title, description, user_id, is_public) VALUES (?, ?, ?, ?)';
    
    db.query(query, [title.trim(), description || '', req.user.id, is_public === 'on' ? 1 : 0], (err, result) => {
      if (err) {
        req.flash('error', 'Failed to create album');
        return res.redirect('/albums/create');
      }
      req.flash('success', 'Album created successfully');
      res.redirect(`/albums/${result.insertId}`);
    });
  },

  getAlbumById: (req, res) => {
    const query = `
      SELECT a.*, u.username, p.id as photo_id, p.title as photo_title, p.filename, p.path, p.thumbnail_path, p.is_public as photo_is_public, p.description as photo_desc,
             (SELECT GROUP_CONCAT(t.name ORDER BY t.name SEPARATOR ',')
              FROM photo_tags pt JOIN tags t ON t.id = pt.tag_id
              WHERE pt.photo_id = p.id) AS photo_tags
      FROM albums a
      JOIN users u ON a.user_id = u.id
      LEFT JOIN photos p ON a.id = p.album_id AND (p.is_public = TRUE OR a.user_id = ?)
      WHERE a.id = ? AND (a.is_public = TRUE OR a.user_id = ?)
    `;
    const userId = req.user ? req.user.id : -1;
    db.query(query, [userId, req.params.id, userId], (err, results) => {
      if (err) {
        return res.status(500).send('Unable to load album');
      }
      
      if (results.length === 0) {
        return notFound(res);
      }
      
      const album = {
        id: results[0].id,
        title: results[0].title,
        description: results[0].description,
        user_id: results[0].user_id,
        username: results[0].username,
        is_public: results[0].is_public,
        created_at: results[0].created_at
      };
      
      const photos = results
        .filter(row => row.photo_id)
        .map(row => ({
          id: row.photo_id,
          title: row.photo_title,
          filename: row.filename,
          path: `/photos/${row.photo_id}/thumbnail`,
          originalPath: `/photos/${row.photo_id}/original`,
          is_public: row.photo_is_public,
          description: row.photo_desc,
          tags: row.photo_tags ? row.photo_tags.split(',') : []
        }));
      
      const renderAlbum = (shareLinks = []) => {
        res.render('pages/album-detail', {
          title: album.title,
          album,
          photos,
          shareLinks,
          user: req.user,
          messages: { error: req.flash('error'), success: req.flash('success') }
        });
      };
      if (!req.user || album.user_id !== req.user.id) return renderAlbum();
      db.query(
        'SELECT id, token, expires_at, revoked_at FROM share_links WHERE album_id = ? ORDER BY created_at DESC',
        [album.id],
        (shareErr, shareLinks) => {
          if (shareErr) {
            return res.status(500).send('Unable to load album share links');
          }
          renderAlbum(shareLinks);
        }
      );
    });
  },

  renderEditAlbum: (req, res) => {
    if (!req.user) return res.redirect('/login');
    db.query('SELECT * FROM albums WHERE id = ? AND user_id = ?', [req.params.id, req.user.id], (err, results) => {
      if (err) return res.status(500).send('Unable to load album');
      if (results.length === 0) return notFound(res);
      res.render('pages/album-edit', {
        title: 'Edit Album',
        album: results[0],
        user: req.user,
        messages: { error: req.flash('error'), success: req.flash('success') }
      });
    });
  },

  updateAlbum: (req, res) => {
    if (!req.user) return res.redirect('/login');
    const { title, description, is_public } = req.body;
    if (!title || !title.trim()) {
      req.flash('error', 'Album title is required');
      return res.redirect(`/albums/${req.params.id}/edit`);
    }
    db.query(
      'UPDATE albums SET title = ?, description = ?, is_public = ? WHERE id = ? AND user_id = ?',
      [title.trim(), description || '', is_public === 'on' ? 1 : 0, req.params.id, req.user.id],
      (err, result) => {
        if (err) return res.status(500).send('Unable to update album');
        if (!result.affectedRows) return notFound(res);
        req.flash('success', 'Album updated successfully');
        res.redirect(`/albums/${req.params.id}`);
      }
    );
  },

  deleteAlbum: (req, res) => {
    if (!req.user) {
      return res.redirect('/login');
    }

    const query = 'DELETE FROM albums WHERE id = ? AND user_id = ?';
    db.query(query, [req.params.id, req.user.id], (err, result) => {
      if (err) {
        return res.status(500).send('Unable to delete album');
      }
      if (!result.affectedRows) return notFound(res);
      req.flash('success', 'Album deleted successfully');
      res.redirect('/albums');
    });
  }
};

module.exports = albumController;