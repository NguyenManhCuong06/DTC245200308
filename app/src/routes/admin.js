const express = require('express');
const adminController = require('../controllers/adminController');
const { requireAuthentication, requireAdmin } = require('../middleware/auth');

const router = express.Router();

router.use(requireAuthentication, requireAdmin);
router.get('/', adminController.getDashboard);
router.post('/users/:userId/:action(lock|unlock)', adminController.setUserLock);
router.post('/albums/:albumId/delete', adminController.deleteAlbum);
router.post('/photos/:photoId/delete', adminController.deletePhoto);

module.exports = router;
