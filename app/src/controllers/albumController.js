const db = require('../db');

const albumController = {
  getAllAlbums: (req, res) => {
    const query = `
      SELECT a.*, u.username, COUNT(p.id) as photo_count 
      FROM albums a 
      JOIN users u ON a.user_id = u.id 
      LEFT JOIN photos p ON a.id = p.album_id 
      WHERE a.is_public = TRUE OR a.user_id = ?
      GROUP BY a.id 
      ORDER BY a.created_at DESC
    `;
    
    db.query(query, [req.user ? req.user.id : -1], (err, results) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.render('pages/albums', { 
        title: 'Albums',
        albums: results,
        user: req.user
      });
    });
  },

  createAlbum: (req, res) => {
    if (!req.user) {
      return res.redirect('/login');
    }

    const { title, description, is_public } = req.body;
    const query = 'INSERT INTO albums (title, description, user_id, is_public) VALUES (?, ?, ?, ?)';
    
    db.query(query, [title, description, req.user.id, is_public === 'on' ? 1 : 0], (err) => {
      if (err) {
        req.flash('error', 'Failed to create album');
        return res.redirect('/albums');
      }
      req.flash('success', 'Album created successfully');
      res.redirect('/albums');
    });
  },

  getAlbumById: (req, res) => {
    const query = `
      SELECT a.*, u.username, p.id as photo_id, p.title as photo_title, p.filename, p.path, p.description as photo_desc
      FROM albums a
      JOIN users u ON a.user_id = u.id
      LEFT JOIN photos p ON a.id = p.album_id
      WHERE a.id = ?
    `;
    
    db.query(query, [req.params.id], (err, results) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      
      if (results.length === 0) {
        return res.status(404).render('pages/404', { title: 'Album not found' });
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
          path: row.path,
          description: row.photo_desc
        }));
      
      res.render('pages/album-detail', { 
        title: album.title,
        album,
        photos,
        user: req.user
      });
    });
  },

  deleteAlbum: (req, res) => {
    if (!req.user) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const query = 'DELETE FROM albums WHERE id = ? AND user_id = ?';
    db.query(query, [req.params.id, req.user.id], (err) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.redirect('/albums');
    });
  }
};

module.exports = albumController;