const express = require('express');
const router = express.Router();
const albumController = require('../controllers/albumController');

router.get('/', albumController.getAllAlbums);
router.post('/', albumController.createAlbum);
router.get('/:id', albumController.getAlbumById);
router.delete('/:id', albumController.deleteAlbum);

module.exports = router;