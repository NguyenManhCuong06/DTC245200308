const express = require('express');
const router = express.Router();
const albumController = require('../controllers/albumController');
const shareController = require('../controllers/shareController');
const { requireAuthentication } = require('../middleware/auth');

router.get('/', albumController.getAllAlbums);
router.get('/create', requireAuthentication, albumController.renderCreateAlbum);
router.post('/', requireAuthentication, albumController.createAlbum);
router.get('/:id/edit', requireAuthentication, albumController.renderEditAlbum);
router.post('/:id/update', requireAuthentication, albumController.updateAlbum);
router.post('/:id/delete', requireAuthentication, albumController.deleteAlbum);
router.post('/:id/shares', requireAuthentication, shareController.createAlbumShare);
router.post('/:id/shares/:shareId/revoke', requireAuthentication, shareController.revokeAlbumShare);
router.get('/:id', albumController.getAlbumById);

module.exports = router;