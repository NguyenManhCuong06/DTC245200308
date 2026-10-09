const express = require('express');
const router = express.Router();
const albumController = require('../controllers/albumController');

router.get('/', albumController.getAllAlbums);
router.get('/create', albumController.renderCreateAlbum);
router.post('/', albumController.createAlbum);
router.get('/:id/edit', albumController.renderEditAlbum);
router.post('/:id/update', albumController.updateAlbum);
router.post('/:id/delete', albumController.deleteAlbum);
router.get('/:id', albumController.getAlbumById);

module.exports = router;