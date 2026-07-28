const express = require('express');
const bcrypt = require('bcryptjs');
const { getDB } = require('../db/database');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

router.get('/', authenticate, authorize('admin'), (req, res) => {
  const db = getDB();
  res.json(db.prepare('SELECT id, username, role, full_name, email, created_at FROM users ORDER BY created_at DESC').all());
});

router.post('/', authenticate, authorize('admin'), (req, res) => {
  const db = getDB();
  const { username, password, role, full_name, email } = req.body;
  if (!username || !password || !role || !full_name) return res.status(400).json({ error: 'username, password, role, and full_name are required' });
  if (!['admin', 'teacher', 'student'].includes(role)) return res.status(400).json({ error: 'Invalid role' });
  if (db.prepare('SELECT id FROM users WHERE username = ?').get(username)) return res.status(409).json({ error: 'Username already exists' });
  const result = db.prepare('INSERT INTO users (username, password, role, full_name, email) VALUES (?, ?, ?, ?, ?)').run(username, bcrypt.hashSync(password, 10), role, full_name, email || null);
  res.status(201).json({ id: result.lastInsertRowid, message: 'User created successfully' });
});

router.put('/:id', authenticate, authorize('admin'), (req, res) => {
  const db = getDB();
  const { full_name, email, password } = req.body;
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  const newPassword = (password && password.length >= 6) ? bcrypt.hashSync(password, 10) : user.password;
  db.prepare('UPDATE users SET full_name=?, email=?, password=?, updated_at=CURRENT_TIMESTAMP WHERE id=?').run(full_name || user.full_name, email || user.email, newPassword, req.params.id);
  res.json({ message: 'User updated successfully' });
});

router.delete('/:id', authenticate, authorize('admin'), (req, res) => {
  const db = getDB();
  if (parseInt(req.params.id) === req.user.id) return res.status(400).json({ error: 'Cannot delete your own account' });
  const result = db.prepare('DELETE FROM users WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'User not found' });
  res.json({ message: 'User deleted successfully' });
});

module.exports = router;
