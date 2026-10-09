const db = require('../db');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const sharp = require('sharp');

const uploadDirectory = path.join(__dirname, '../../public/uploads');
const maxUploadBytes = 10 * 1024 * 1024;
const sharpOptions = { failOn: 'error', limitInputPixels: 20000000 };
const imageFormats = {
  jpeg: { mime: 'image/jpeg', extensions: ['.jpg', '.jpeg'] },
  png: { mime: 'image/png', extensions: ['.png'] },
  webp: { mime: 'image/webp', extensions: ['.webp'] }
};

function notFound(res) {
  return res.status(404).render('pages/404', { title: 'Photo not found' });
}

async function loadImage(file) {
  if (!file || file.truncated || !Buffer.isBuffer(file.data) || file.data.length > maxUploadBytes) {
    throw new Error('Each image must be no larger than 10 MB');
  }
  let format;
  try {
    format = await sharp(file.data, sharpOptions).metadata();
  } catch {
    throw new Error('Image file is not a valid JPEG, PNG or WebP image');
  }
  const expected = imageFormats[format.format];
  const extension = path.extname(file.name).toLowerCase();
  if (!expected || file.mimetype !== expected.mime || !expected.extensions.includes(extension)) {
    throw new Error('Image content, MIME type and file extension must match (JPEG, PNG or WebP)');
  }
  try {
    await sharp(file.data, sharpOptions).stats();
  } catch {
    throw new Error('Image file is corrupt or unsupported');
  }
  return { file, format: format.format, extension };
}

async function removeStoredFiles(files) {
  await Promise.all(files.map(async file => {
    try {
      await fs.promises.unlink(file);
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
  }));
}

const photoController = {
  getAllPhotos: async (req, res) => {
    const query = `
      SELECT p.*, u.username, a.title as album_title
      FROM photos p
      JOIN users u ON p.user_id = u.id
      LEFT JOIN albums a ON p.album_id = a.id
      WHERE (p.is_public = TRUE AND (a.id IS NULL OR a.is_public = TRUE)) OR p.user_id = ?
      ORDER BY p.created_at DESC
    `;
    
    try {
      const [results] = await db.promise().query(query, [req.user ? req.user.id : -1]);
      results.forEach(photo => {
        photo.path = `/photos/${photo.id}/thumbnail`;
      });
      res.render('pages/photos', { 
        title: 'Photos',
        photos: results,
        user: req.user,
        messages: { error: req.flash('error'), success: req.flash('success') }
      });
    } catch (error) {
      console.error('Unable to load photos:', error.message);
      res.status(500).send('Unable to load photos');
    }
  },

  renderUpload: async (req, res) => {
    if (!req.user) return res.redirect('/login');
    try {
      const [albums] = await db.promise().query(
        'SELECT id, title FROM albums WHERE user_id = ? ORDER BY title',
        [req.user.id]
      );
      res.render('pages/photo-upload', {
        title: 'Upload Photos',
        albums,
        selectedAlbumId: req.query.album_id || '',
        user: req.user,
        messages: { error: req.flash('error'), success: req.flash('success') }
      });
    } catch (error) {
      console.error('Unable to load upload form:', error.message);
      res.status(500).send('Unable to load upload form');
    }
  },

  uploadPhoto: async (req, res) => {
    if (!req.user) {
      return res.redirect('/login');
    }

    const submitted = req.files && (req.files.photos || req.files.photo);
    if (!submitted) {
      req.flash('error', 'Choose at least one image');
      return res.redirect('/photos/upload');
    }

    const files = Array.isArray(submitted) ? submitted : [submitted];
    if (files.length > 10) {
      req.flash('error', 'Upload no more than 10 images at a time');
      return res.redirect('/photos/upload');
    }

    const createdFiles = [];
    let connection;
    let transactionStarted = false;
    try {
      const validImages = [];
      for (const file of files) {
        validImages.push(await loadImage(file));
      }
      const albumId = req.body.album_id || null;
      let albumIsPublic = true;
      if (albumId) {
        const [albums] = await db.promise().query(
          'SELECT id, is_public FROM albums WHERE id = ? AND user_id = ?',
          [albumId, req.user.id]
        );
        if (!albums.length) {
          req.flash('error', 'Select an album that you own');
          return res.redirect('/photos/upload');
        }
        albumIsPublic = Boolean(albums[0].is_public);
      }

      await fs.promises.mkdir(uploadDirectory, { recursive: true });
      connection = await db.promise().getConnection();
      await connection.beginTransaction();
      transactionStarted = true;
      for (const image of validImages) {
        const id = crypto.randomUUID();
        const extension = image.extension === '.jpeg' ? '.jpg' : image.extension;
        const filename = `${id}${extension}`;
        const thumbnailFilename = `${id}-thumb.webp`;
        const originalPath = path.join(uploadDirectory, filename);
        const thumbnailPath = path.join(uploadDirectory, thumbnailFilename);
        await sharp(image.file.data, sharpOptions).rotate().toFile(originalPath);
        createdFiles.push(originalPath);
        await sharp(image.file.data, sharpOptions)
          .rotate()
          .resize({ width: 480, height: 360, fit: 'inside', withoutEnlargement: true })
          .webp({ quality: 82 })
          .toFile(thumbnailPath);
        createdFiles.push(thumbnailPath);

        const photoTitle = req.body.title && validImages.length === 1
          ? req.body.title.trim()
          : path.parse(image.file.name).name;
        const [insertResult] = await connection.query(
          `INSERT INTO photos
            (title, description, filename, path, thumbnail_path, album_id, user_id, is_public)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            photoTitle || filename,
            req.body.description || '',
            filename,
            `/uploads/${filename}`,
            `/uploads/${thumbnailFilename}`,
            albumId,
            req.user.id,
            albumIsPublic ? 1 : 0
          ]
        );
        image.photoId = insertResult.insertId;
      }

      await connection.commit();
      transactionStarted = false;
      req.app.locals.metrics?.photosUploadedTotal?.inc(validImages.length);
      req.flash('success', `${validImages.length} image(s) uploaded successfully`);
      res.redirect(albumId ? `/albums/${albumId}` : '/photos');
    } catch (error) {
      if (transactionStarted && connection) {
        try {
          await connection.rollback();
        } catch (rollbackError) {
          console.error('Unable to roll back incomplete photo upload:', rollbackError.message);
        }
      }
      try {
        await removeStoredFiles(createdFiles);
      } catch (cleanupError) {
        console.error('Unable to remove incomplete upload files:', cleanupError.message);
      }
      if (error.message.startsWith('Each image') || error.message.startsWith('Image')) {
        req.flash('error', error.message);
        return res.redirect('/photos/upload');
      }
      console.error('Photo upload failed:', error.message);
      res.status(500).send('Photo upload failed');
    } finally {
      if (connection) connection.release();
    }
  },

  getPhotoById: async (req, res) => {
    const query = `
      SELECT p.*, u.username, a.title as album_title
      FROM photos p
      JOIN users u ON p.user_id = u.id
      LEFT JOIN albums a ON p.album_id = a.id
      WHERE p.id = ? AND ((p.is_public = TRUE AND (a.id IS NULL OR a.is_public = TRUE)) OR p.user_id = ?)
    `;
    
    try {
      const [results] = await db.promise().query(query, [req.params.id, req.user ? req.user.id : -1]);
      if (!results.length) return notFound(res);
      const photo = results[0];
      photo.path = `/photos/${photo.id}/original`;
      photo.thumbnailPath = `/photos/${photo.id}/thumbnail`;
      res.render('pages/photo-detail', { 
        title: photo.title,
        photo,
        user: req.user,
        messages: { error: req.flash('error'), success: req.flash('success') }
      });
    } catch (error) {
      console.error('Unable to load photo:', error.message);
      res.status(500).send('Unable to load photo');
    }
  },

  renderEditPhoto: async (req, res) => {
    if (!req.user) return res.redirect('/login');
    try {
      const [photos] = await db.promise().query(
        'SELECT * FROM photos WHERE id = ? AND user_id = ?',
        [req.params.id, req.user.id]
      );
      if (!photos.length) return notFound(res);
      res.render('pages/photo-edit', {
        title: 'Edit Photo',
        photo: photos[0],
        user: req.user,
        messages: { error: req.flash('error'), success: req.flash('success') }
      });
    } catch (error) {
      console.error('Unable to load photo edit form:', error.message);
      res.status(500).send('Unable to load photo');
    }
  },

  updatePhoto: async (req, res) => {
    if (!req.user) return res.redirect('/login');
    if (!req.body.title || !req.body.title.trim()) {
      req.flash('error', 'Photo title is required');
      return res.redirect(`/photos/${req.params.id}/edit`);
    }
    try {
      const [result] = await db.promise().query(
        'UPDATE photos SET title = ?, description = ? WHERE id = ? AND user_id = ?',
        [req.body.title.trim(), req.body.description || '', req.params.id, req.user.id]
      );
      if (!result.affectedRows) return notFound(res);
      req.flash('success', 'Photo updated successfully');
      res.redirect(`/photos/${req.params.id}`);
    } catch (error) {
      console.error('Unable to update photo:', error.message);
      res.status(500).send('Unable to update photo');
    }
  },

  deletePhoto: async (req, res) => {
    if (!req.user) return res.redirect('/login');
    try {
      const [photos] = await db.promise().query(
        'SELECT path, thumbnail_path, album_id FROM photos WHERE id = ? AND user_id = ?',
        [req.params.id, req.user.id]
      );
      if (!photos.length) return notFound(res);
      const photo = photos[0];
      const storedPaths = [photo.path, photo.thumbnail_path]
        .map(value => path.join(uploadDirectory, path.basename(value)));
      await removeStoredFiles(storedPaths);
      await db.promise().query('DELETE FROM photos WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
      req.flash('success', 'Photo deleted successfully');
      res.redirect(photo.album_id ? `/albums/${photo.album_id}` : '/photos');
    } catch (error) {
      console.error('Unable to delete photo:', error.message);
      res.status(500).send('Unable to delete photo');
    }
  },

  getMedia: async (req, res) => {
    if (!['original', 'thumbnail'].includes(req.params.variant)) return res.sendStatus(404);
    try {
      const [photos] = await db.promise().query(
        `SELECT p.path, p.thumbnail_path
         FROM photos p
         LEFT JOIN albums a ON a.id = p.album_id
         WHERE p.id = ?
           AND ((p.is_public = TRUE AND (a.id IS NULL OR a.is_public = TRUE)) OR p.user_id = ?)`,
        [req.params.id, req.user ? req.user.id : -1]
      );
      if (!photos.length) return res.sendStatus(404);
      const storedPath = req.params.variant === 'thumbnail'
        ? photos[0].thumbnail_path
        : photos[0].path;
      if (!storedPath || !storedPath.startsWith('/uploads/')
          || path.posix.basename(storedPath) !== storedPath.slice('/uploads/'.length)) {
        return res.sendStatus(404);
      }
      const fullPath = path.join(uploadDirectory, path.posix.basename(storedPath));
      res.set('Cache-Control', 'private, no-store');
      res.sendFile(fullPath, error => {
        if (error && !res.headersSent) {
          if (error.code === 'ENOENT') return res.sendStatus(404);
          console.error('Unable to serve photo media:', error.message);
          res.sendStatus(500);
        }
      });
    } catch (error) {
      console.error('Unable to authorize photo media:', error.message);
      res.sendStatus(500);
    }
  },

  sharePhoto: async (req, res) => {
    try {
      const [photos] = await db.promise().query(
        `SELECT p.* FROM photos p
         LEFT JOIN albums a ON a.id = p.album_id
         WHERE p.id = ?
           AND ((p.is_public = TRUE AND (a.id IS NULL OR a.is_public = TRUE)) OR p.user_id = ?)`,
        [req.params.id, req.user ? req.user.id : -1]
      );
      if (!photos.length) return res.status(404).json({ error: 'Photo not found' });
      res.json({
        url: `${req.protocol}://${req.get('host')}/photos/${photos[0].id}`,
        photo: photos[0]
      });
    } catch (error) {
      console.error('Unable to create photo share URL:', error.message);
      res.status(500).json({ error: 'Unable to create share URL' });
    }
  }
};

module.exports = photoController;