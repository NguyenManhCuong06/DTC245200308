const express = require('express');
const shareController = require('../controllers/shareController');

const router = express.Router();

router.get('/:token', shareController.getSharedAlbum);
router.get('/:token/photos/:photoId/:variant', shareController.getSharedMedia);

module.exports = router;
