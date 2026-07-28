const express  = require('express');
const bcrypt   = require('bcryptjs');
const { getDB, saveDB } = require('../db/database');
const { signToken }     = require('../utils/jwt');
const { authenticate }  = require('../middleware/auth');

const router = express.Router();

// POST /api/auth/login
router.post('/login', (req, res) => {
  try {
    const db = getDB();
    const { username, password } = req.body;

    if (!username || !password)
      return res.status(400).json({ error: 'Username and password are required' });

    const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username.trim());
    if (!user)
      return res.status(401).json({ error: 'Invalid credentials' });

    if (!bcrypt.compareSync(password, user.password))
      return res.status(401).json({ error: 'Invalid credentials' });

    let profile = null;
    if (user.role === 'student') {
      profile = db.prepare(`
        SELECT s.*, c.name AS class_name
        FROM students s LEFT JOIN classes c ON s.class_id = c.id
        WHERE s.user_id = ?
      `).get(user.id);
    } else if (user.role === 'teacher') {
      profile = db.prepare('SELECT * FROM teachers WHERE user_id = ?').get(user.id);
    }

    const token = signToken({
      id: user.id, username: user.username,
      role: user.role, full_name: user.full_name
    });

    res.json({
      token,
      user: {
        id: user.id, username: user.username,
        role: user.role, full_name: user.full_name,
        email: user.email, profile
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Login failed. Please try again.' });
  }
});

// GET /api/auth/me
router.get('/me', authenticate, (req, res) => {
  try {
    const db   = getDB();
    const user = db.prepare(
      'SELECT id, username, role, full_name, email, created_at FROM users WHERE id = ?'
    ).get(req.user.id);

    if (!user) return res.status(404).json({ error: 'User not found' });

    let profile = null;
    if (user.role === 'student') {
      profile = db.prepare(`
        SELECT s.*, c.name AS class_name
        FROM students s LEFT JOIN classes c ON s.class_id = c.id
        WHERE s.user_id = ?
      `).get(user.id);
    } else if (user.role === 'teacher') {
      profile = db.prepare('SELECT * FROM teachers WHERE user_id = ?').get(user.id);
    }

    res.json({ ...user, profile });
  } catch (err) {
    console.error('GET /me error:', err);
    res.status(500).json({ error: 'Failed to load user' });
  }
});

// POST /api/auth/change-password
router.post('/change-password', authenticate, (req, res) => {
  try {
    const db = getDB();
    const { current_password, new_password } = req.body;

    if (!current_password || !new_password)
      return res.status(400).json({ error: 'Both current and new password are required' });

    if (new_password.length < 6)
      return res.status(400).json({ error: 'New password must be at least 6 characters' });

    if (current_password === new_password)
      return res.status(400).json({ error: 'New password must be different from your current password' });

    // Get the user's current hashed password
    const user = db.prepare('SELECT id, password, username FROM users WHERE id = ?').get(req.user.id);
    if (!user)
      return res.status(404).json({ error: 'User account not found' });

    // Verify current password
    const isValid = bcrypt.compareSync(current_password, user.password);
    if (!isValid)
      return res.status(401).json({ error: 'Current password is incorrect. Please try again.' });

    // Hash the new password and save
    const hashed = bcrypt.hashSync(new_password, 10);
    const result = db.prepare(
      'UPDATE users SET password = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
    ).run(hashed, req.user.id);

    if (result.changes === 0)
      return res.status(500).json({ error: 'Password update failed. Please try again.' });

    // Force a DB save to disk to ensure persistence
    saveDB();

    console.log(`Password changed for user: ${user.username} (id: ${user.id})`);

    res.json({
      message: 'Password changed successfully. Please use your new password next time you log in.'
    });

  } catch (err) {
    console.error('Change password error:', err);
    res.status(500).json({ error: 'Failed to change password. Please try again.' });
  }
});

module.exports = router;
