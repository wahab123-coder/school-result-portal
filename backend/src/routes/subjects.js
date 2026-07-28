const express = require('express');
const { getDB } = require('../db/database');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

router.get('/', authenticate, (req, res) => {
  const db = getDB();
  res.json(db.prepare('SELECT * FROM subjects ORDER BY name ASC').all());
});

router.get('/:id', authenticate, (req, res) => {
  const db = getDB();
  const subject = db.prepare('SELECT * FROM subjects WHERE id = ?').get(req.params.id);
  if (!subject) return res.status(404).json({ error: 'Subject not found' });
  res.json(subject);
});

router.post('/', authenticate, authorize('admin'), (req, res) => {
  const db = getDB();
  const { name, code, description } = req.body;
  if (!name || !code) return res.status(400).json({ error: 'Subject name and code are required' });
  if (db.prepare('SELECT id FROM subjects WHERE name = ?').get(name)) return res.status(409).json({ error: 'Subject name already exists' });
  if (db.prepare('SELECT id FROM subjects WHERE code = ?').get(code)) return res.status(409).json({ error: 'Subject code already exists' });
  const result = db.prepare('INSERT INTO subjects (name, code, description) VALUES (?, ?, ?)').run(name, code.toUpperCase(), description || null);
  res.status(201).json({ id: result.lastInsertRowid, message: 'Subject created successfully' });
});

router.put('/:id', authenticate, authorize('admin'), (req, res) => {
  const db = getDB();
  const { name, code, description } = req.body;
  const subject = db.prepare('SELECT * FROM subjects WHERE id = ?').get(req.params.id);
  if (!subject) return res.status(404).json({ error: 'Subject not found' });
  db.prepare('UPDATE subjects SET name=?, code=?, description=? WHERE id=?').run(name || subject.name, code ? code.toUpperCase() : subject.code, description !== undefined ? description : subject.description, req.params.id);
  res.json({ message: 'Subject updated successfully' });
});

router.delete('/:id', authenticate, authorize('admin'), (req, res) => {
  const db = getDB();
  const result = db.prepare('DELETE FROM subjects WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Subject not found' });
  res.json({ message: 'Subject deleted successfully' });
});

module.exports = router;
