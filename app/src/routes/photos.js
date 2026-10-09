const express = require('express');
const router = express.Router();
const photoController = require('../controllers/photoController');
const { requireAuthentication } = require('../middleware/auth');

router.get('/', photoController.getAllPhotos);
router.get('/upload', requireAuthentication, photoController.renderUpload);
router.post('/upload', requireAuthentication, photoController.uploadPhoto);
router.get('/:id/edit', requireAuthentication, photoController.renderEditPhoto);
router.post('/:id/update', requireAuthentication, photoController.updatePhoto);
router.post('/:id/delete', requireAuthentication, photoController.deletePhoto);
router.post('/:id/tags', requireAuthentication, photoController.addTag);
router.post('/:id/tags/:tagId/remove', requireAuthentication, photoController.removeTag);
router.get('/:id/share', photoController.sharePhoto);
router.get('/:id/:variant', photoController.getMedia);
router.get('/:id', photoController.getPhotoById);

module.exports = router;