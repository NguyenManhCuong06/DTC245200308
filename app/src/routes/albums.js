const express = require('express');
const router = express.Router();
const albumController = require('../controllers/albumController');
const { requireAuthentication } = require('../middleware/auth');

router.get('/', albumController.getAllAlbums);
router.get('/create', requireAuthentication, albumController.renderCreateAlbum);
router.post('/', requireAuthentication, albumController.createAlbum);
router.get('/:id/edit', requireAuthentication, albumController.renderEditAlbum);
router.post('/:id/update', requireAuthentication, albumController.updateAlbum);
router.post('/:id/delete', requireAuthentication, albumController.deleteAlbum);
router.get('/:id', albumController.getAlbumById);

module.exports = router;