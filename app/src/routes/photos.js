const express = require('express');
const router = express.Router();
const photoController = require('../controllers/photoController');

router.get('/', photoController.getAllPhotos);
router.post('/upload', photoController.uploadPhoto);
router.get('/:id/share', photoController.sharePhoto);
router.get('/:id', photoController.getPhotoById);

module.exports = router;