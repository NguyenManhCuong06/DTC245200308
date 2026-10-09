const express = require('express');
const router = express.Router();
const photoController = require('../controllers/photoController');

router.get('/', photoController.getAllPhotos);
router.get('/upload', photoController.renderUpload);
router.post('/upload', photoController.uploadPhoto);
router.get('/:id/edit', photoController.renderEditPhoto);
router.post('/:id/update', photoController.updatePhoto);
router.post('/:id/delete', photoController.deletePhoto);
router.get('/:id/share', photoController.sharePhoto);
router.get('/:id/:variant', photoController.getMedia);
router.get('/:id', photoController.getPhotoById);

module.exports = router;