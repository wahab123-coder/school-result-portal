const express = require('express');
const path    = require('path');
const fs      = require('fs');
const multer  = require('multer');
const { getDB } = require('../db/database');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// Upload directory
const UPLOAD_DIR = path.join(__dirname, '../../uploads');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const ext  = path.extname(file.originalname).toLowerCase();
    cb(null, `user_${req.user.id}_${Date.now()}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['.jpg', '.jpeg', '.png', '.webp'];
    if (allowed.includes(path.extname(file.originalname).toLowerCase())) {
      return cb(null, true);
    }
    cb(new Error('Only JPG, PNG or WEBP images are allowed'));
  }
});

// GET /api/profile
router.get('/', authenticate, (req, res) => {
  try {
    const db   = getDB();

    // Add profile_picture column to users if it doesn't exist yet
    try { db.prepare('ALTER TABLE users ADD COLUMN profile_picture TEXT').run(); } catch(e) {}

    const user = db.prepare(
      'SELECT id, username, role, full_name, email, profile_picture, created_at FROM users WHERE id = ?'
    ).get(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    let extra = null;
    if (user.role === 'student') {
      extra = db.prepare(`
        SELECT s.*, c.name AS class_name
        FROM students s LEFT JOIN classes c ON s.class_id = c.id
        WHERE s.user_id = ?
      `).get(user.id);
    } else if (user.role === 'teacher') {
      extra = db.prepare('SELECT * FROM teachers WHERE user_id = ?').get(user.id);
    }

    res.json({ ...user, profile: extra });
  } catch (err) {
    console.error('GET /profile:', err);
    res.status(500).json({ error: 'Failed to load profile' });
  }
});

// PUT /api/profile  — update name and email
router.put('/', authenticate, (req, res) => {
  try {
    const db = getDB();
    const { full_name, email } = req.body;
    if (!full_name || !full_name.trim())
      return res.status(400).json({ error: 'Full name is required' });

    db.prepare(
      'UPDATE users SET full_name = ?, email = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
    ).run(full_name.trim(), email?.trim() || null, req.user.id);

    if (req.user.role === 'student') {
      db.prepare(
        'UPDATE students SET full_name = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?'
      ).run(full_name.trim(), req.user.id);
    } else if (req.user.role === 'teacher') {
      db.prepare(
        'UPDATE teachers SET full_name = ? WHERE user_id = ?'
      ).run(full_name.trim(), req.user.id);
    }

    res.json({ message: 'Profile updated successfully' });
  } catch (err) {
    console.error('PUT /profile:', err);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// POST /api/profile/photo  — upload profile picture
router.post('/photo', authenticate, (req, res) => {
  upload.single('photo')(req, res, (err) => {
    if (err) {
      return res.status(400).json({ error: err.message || 'Upload failed' });
    }
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    try {
      const db       = getDB();
      const photoUrl = `/uploads/${req.file.filename}`;

      // Delete old photo file if it exists
      const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
      if (req.user.role === 'student') {
        const student = db.prepare('SELECT profile_picture FROM students WHERE user_id = ?').get(req.user.id);
        if (student?.profile_picture) {
          const oldPath = path.join(__dirname, '../../', student.profile_picture);
          if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
        }
        db.prepare(
          'UPDATE students SET profile_picture = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?'
        ).run(photoUrl, req.user.id);
      } else {
        // For admin and teacher store on users table via email field workaround
        // We add a profile_picture column via ALTER if needed
        try {
          db.prepare('ALTER TABLE users ADD COLUMN profile_picture TEXT').run();
        } catch (e) { /* column already exists */ }
        db.prepare(
          'UPDATE users SET profile_picture = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
        ).run(photoUrl, req.user.id);
      }

      res.json({ message: 'Photo uploaded successfully', photo_url: photoUrl });
    } catch (err) {
      console.error('POST /profile/photo:', err);
      res.status(500).json({ error: 'Failed to save photo' });
    }
  });
});

// DELETE /api/profile/photo — remove profile picture
router.delete('/photo', authenticate, (req, res) => {
  try {
    const db = getDB();
    try { db.prepare('ALTER TABLE users ADD COLUMN profile_picture TEXT').run(); } catch(e) {}

    if (req.user.role === 'student') {
      const student = db.prepare('SELECT profile_picture FROM students WHERE user_id = ?').get(req.user.id);
      if (student?.profile_picture) {
        const filePath = path.join(__dirname, '../../', student.profile_picture);
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      }
      db.prepare(
        'UPDATE students SET profile_picture = NULL, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?'
      ).run(req.user.id);
    } else {
      const user = db.prepare('SELECT profile_picture FROM users WHERE id = ?').get(req.user.id);
      if (user?.profile_picture) {
        const filePath = path.join(__dirname, '../../', user.profile_picture);
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      }
      db.prepare(
        'UPDATE users SET profile_picture = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
      ).run(req.user.id);
    }
    res.json({ message: 'Photo removed' });
  } catch (err) {
    console.error('DELETE /profile/photo:', err);
    res.status(500).json({ error: 'Failed to remove photo' });
  }
});

module.exports = router;
