const { db } = require('../app');
const path = require('path');
const fs = require('fs');

const photoController = {
  getAllPhotos: (req, res) => {
    const query = `
      SELECT p.*, u.username, a.title as album_title
      FROM photos p
      JOIN users u ON p.user_id = u.id
      LEFT JOIN albums a ON p.album_id = a.id
      WHERE p.is_public = TRUE OR p.user_id = ?
      ORDER BY p.created_at DESC
    `;
    
    db.query(query, [req.user ? req.user.id : -1], (err, results) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.render('pages/photos', { 
        title: 'Photos',
        photos: results,
        user: req.user
      });
    });
  },

  uploadPhoto: (req, res) => {
    if (!req.user) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    if (!req.files || Object.keys(req.files).length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }

    const file = req.files.photo;
    const fileName = `${Date.now()}-${file.name}`;
    const uploadPath = path.join(__dirname, '../../public/uploads', fileName);
    
    file.mv(uploadPath, (err) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      const { title, description, album_id } = req.body;
      const filePath = `/uploads/${fileName}`;
      
      const query = 'INSERT INTO photos (title, description, filename, path, album_id, user_id) VALUES (?, ?, ?, ?, ?, ?)';
      db.query(query, [title || fileName, description, fileName, filePath, album_id || null, req.user.id], (dbErr) => {
        if (dbErr) {
          fs.unlinkSync(uploadPath);
          return res.status(500).json({ error: dbErr.message });
        }
        res.redirect('/albums/' + (album_id || ''));
      });
    });
  },

  getPhotoById: (req, res) => {
    const query = `
      SELECT p.*, u.username, a.title as album_title
      FROM photos p
      JOIN users u ON p.user_id = u.id
      LEFT JOIN albums a ON p.album_id = a.id
      WHERE p.id = ?
    `;
    
    db.query(query, [req.params.id], (err, results) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      
      if (results.length === 0) {
        return res.status(404).render('pages/404', { title: 'Photo not found' });
      }
      
      res.render('pages/photo-detail', { 
        title: results[0].title,
        photo: results[0],
        user: req.user
      });
    });
  },

  sharePhoto: (req, res) => {
    const query = 'SELECT * FROM photos WHERE id = ?';
    db.query(query, [req.params.id], (err, results) => {
      if (err || results.length === 0) {
        return res.status(404).json({ error: 'Photo not found' });
      }
      res.json({ 
        url: `${req.protocol}://${req.get('host')}/photos/${results[0].id}`,
        photo: results[0]
      });
    });
  }
};

module.exports = photoController;