const express = require('express');
const router = express.Router();
const photoController = require('../controllers/photoController');
const albumController = require('../controllers/albumController');
const db = require('../db');

// API Health Check
router.get('/health', (req, res) => {
  res.json({ 
    status: 'ok',
    timestamp: new Date().toISOString(),
    services: {
      database: 'connected',
      uploads: 'enabled'
    }
  });
});

// API Routes for Albums
router.get('/albums', (req, res) => {
  const query = `
    SELECT a.id, a.title, a.description, a.is_public, COUNT(p.id) as photo_count
    FROM albums a
    LEFT JOIN photos p ON a.id = p.album_id
    WHERE a.is_public = TRUE OR a.user_id = ?
    GROUP BY a.id
    ORDER BY a.created_at DESC
  `;
  
  db.query(query, [req.user ? req.user.id : -1], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

// API Routes for Photos
router.get('/photos', (req, res) => {
  const query = `
    SELECT p.id, p.title, p.filename, p.path, p.is_public, u.username, a.title as album_title
    FROM photos p
    JOIN users u ON p.user_id = u.id
    LEFT JOIN albums a ON p.album_id = a.id
    WHERE p.is_public = TRUE OR p.user_id = ?
    ORDER BY p.created_at DESC
  `;
  
  db.query(query, [req.user ? req.user.id : -1], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

// API Metrics endpoint
router.get('/metrics', (req, res) => {
  const metrics = {
    'http_requests_total': 1,
    'active_sessions': 1
  };
  res.json(metrics);
});

module.exports = router;