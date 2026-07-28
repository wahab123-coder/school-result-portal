const express = require('express');
const { getDB } = require('../db/database');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

router.get('/', authenticate, (req, res) => {
  const db = getDB();
  res.json(db.prepare('SELECT c.*, COUNT(s.id) AS student_count FROM classes c LEFT JOIN students s ON s.class_id = c.id GROUP BY c.id ORDER BY c.name ASC').all());
});

router.get('/:id', authenticate, (req, res) => {
  const db = getDB();
  const cls = db.prepare('SELECT * FROM classes WHERE id = ?').get(req.params.id);
  if (!cls) return res.status(404).json({ error: 'Class not found' });
  res.json(cls);
});

router.get('/:id/students', authenticate, authorize('admin', 'teacher'), (req, res) => {
  const db = getDB();
  res.json(db.prepare('SELECT s.*, u.username, u.email FROM students s LEFT JOIN users u ON s.user_id = u.id WHERE s.class_id = ? ORDER BY s.full_name ASC').all(req.params.id));
});

router.post('/', authenticate, authorize('admin'), (req, res) => {
  const db = getDB();
  const { name, description } = req.body;
  if (!name) return res.status(400).json({ error: 'Class name is required' });
  if (db.prepare('SELECT id FROM classes WHERE name = ?').get(name)) return res.status(409).json({ error: 'Class already exists' });
  const result = db.prepare('INSERT INTO classes (name, description) VALUES (?, ?)').run(name, description || null);
  res.status(201).json({ id: result.lastInsertRowid, message: 'Class created successfully' });
});

router.put('/:id', authenticate, authorize('admin'), (req, res) => {
  const db = getDB();
  const { name, description } = req.body;
  const cls = db.prepare('SELECT * FROM classes WHERE id = ?').get(req.params.id);
  if (!cls) return res.status(404).json({ error: 'Class not found' });
  db.prepare('UPDATE classes SET name=?, description=? WHERE id=?').run(name || cls.name, description !== undefined ? description : cls.description, req.params.id);
  res.json({ message: 'Class updated successfully' });
});

router.delete('/:id', authenticate, authorize('admin'), (req, res) => {
  const db = getDB();
  const result = db.prepare('DELETE FROM classes WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Class not found' });
  res.json({ message: 'Class deleted successfully' });
});

module.exports = router;
