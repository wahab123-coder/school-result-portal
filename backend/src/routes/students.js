const express = require('express');
const bcrypt = require('bcryptjs');
const { getDB } = require('../db/database');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

// GET /api/students/me/profile — must be before /:id
router.get('/me/profile', authenticate, authorize('student'), (req, res) => {
  const db = getDB();
  const student = db.prepare(`
    SELECT s.*, c.name AS class_name, u.username, u.email
    FROM students s
    LEFT JOIN classes c ON s.class_id = c.id
    LEFT JOIN users u ON s.user_id = u.id
    WHERE s.user_id = ?
  `).get(req.user.id);
  if (!student) return res.status(404).json({ error: 'Student profile not found' });
  res.json(student);
});

// GET /api/students
router.get('/', authenticate, authorize('admin', 'teacher'), (req, res) => {
  const db = getDB();
  const { search, class_id } = req.query;
  let query = `
    SELECT s.*, c.name AS class_name, u.username, u.email
    FROM students s
    LEFT JOIN classes c ON s.class_id = c.id
    LEFT JOIN users u ON s.user_id = u.id
    WHERE 1=1
  `;
  const params = [];
  if (search) {
    query += ' AND (s.full_name LIKE ? OR s.admission_number LIKE ?)';
    params.push(`%${search}%`, `%${search}%`);
  }
  if (class_id) {
    query += ' AND s.class_id = ?';
    params.push(class_id);
  }
  query += ' ORDER BY s.full_name ASC';
  res.json(db.prepare(query).all(...params));
});

// GET /api/students/:id
router.get('/:id', authenticate, (req, res) => {
  const db = getDB();
  if (req.user.role === 'student') {
    const self = db.prepare('SELECT id FROM students WHERE user_id = ?').get(req.user.id);
    if (!self || self.id !== parseInt(req.params.id)) {
      return res.status(403).json({ error: 'Access denied' });
    }
  }
  const student = db.prepare(`
    SELECT s.*, c.name AS class_name, u.username, u.email
    FROM students s
    LEFT JOIN classes c ON s.class_id = c.id
    LEFT JOIN users u ON s.user_id = u.id
    WHERE s.id = ?
  `).get(req.params.id);
  if (!student) return res.status(404).json({ error: 'Student not found' });
  res.json(student);
});

// POST /api/students — create student + login account
router.post('/', authenticate, authorize('admin'), (req, res) => {
  const db = getDB();
  const {
    full_name, admission_number, class_id,
    gender, date_of_birth, parent_phone,
    username, password
  } = req.body;

  // Validate required fields
  if (!full_name || !full_name.trim()) {
    return res.status(400).json({ error: 'Full name is required' });
  }
  if (!admission_number || !admission_number.trim()) {
    return res.status(400).json({ error: 'Admission number is required' });
  }
  if (!username || !username.trim()) {
    return res.status(400).json({ error: 'Username is required' });
  }
  if (!password || password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }

  const trimmedAdm      = admission_number.trim();
  const trimmedUsername = username.trim().toLowerCase();

  // Check admission number uniqueness (case-insensitive)
  const existingAdm = db.prepare(
    'SELECT id FROM students WHERE LOWER(TRIM(admission_number)) = LOWER(?)'
  ).get(trimmedAdm);
  if (existingAdm) {
    return res.status(409).json({ error: `Admission number "${trimmedAdm}" already exists` });
  }

  // Check username uniqueness (case-insensitive)
  const existingUser = db.prepare(
    'SELECT id FROM users WHERE LOWER(TRIM(username)) = LOWER(?)'
  ).get(trimmedUsername);
  if (existingUser) {
    return res.status(409).json({ error: `Username "${trimmedUsername}" is already taken. Please choose a different username.` });
  }

  const hashed = bcrypt.hashSync(password, 10);

  const createStudent = db.transaction(() => {
    const userResult = db.prepare(
      'INSERT INTO users (username, password, role, full_name) VALUES (?, ?, ?, ?)'
    ).run(trimmedUsername, hashed, 'student', full_name.trim());

    db.prepare(`
      INSERT INTO students
        (user_id, admission_number, full_name, class_id, gender, date_of_birth, parent_phone)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      userResult.lastInsertRowid,
      trimmedAdm,
      full_name.trim(),
      class_id || null,
      gender    || null,
      date_of_birth || null,
      parent_phone  || null
    );

    return userResult.lastInsertRowid;
  });

  try {
    const userId = createStudent();
    const student = db.prepare('SELECT * FROM students WHERE user_id = ?').get(userId);
    res.status(201).json({ message: 'Student created successfully', student });
  } catch (err) {
    console.error('Create student error:', err);
    res.status(500).json({ error: 'Failed to create student. Please try again.' });
  }
});

// PUT /api/students/:id — update student
router.put('/:id', authenticate, authorize('admin'), (req, res) => {
  const db = getDB();
  const { full_name, class_id, gender, date_of_birth, parent_phone, admission_number } = req.body;

  const student = db.prepare('SELECT * FROM students WHERE id = ?').get(req.params.id);
  if (!student) return res.status(404).json({ error: 'Student not found' });

  // If admission number changed, check it's not taken by another student
  if (admission_number && admission_number.trim() !== student.admission_number) {
    const taken = db.prepare(
      'SELECT id FROM students WHERE LOWER(TRIM(admission_number)) = LOWER(?) AND id != ?'
    ).get(admission_number.trim(), req.params.id);
    if (taken) return res.status(409).json({ error: 'Admission number already in use by another student' });
  }

  db.prepare(`
    UPDATE students SET
      full_name = ?, class_id = ?, gender = ?,
      date_of_birth = ?, parent_phone = ?,
      admission_number = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(
    full_name        || student.full_name,
    class_id !== undefined ? (class_id || null) : student.class_id,
    gender           || student.gender,
    date_of_birth    || student.date_of_birth,
    parent_phone     || student.parent_phone,
    admission_number ? admission_number.trim() : student.admission_number,
    req.params.id
  );

  res.json({ message: 'Student updated successfully' });
});

// DELETE /api/students/:id
router.delete('/:id', authenticate, authorize('admin'), (req, res) => {
  const db = getDB();
  const student = db.prepare('SELECT * FROM students WHERE id = ?').get(req.params.id);
  if (!student) return res.status(404).json({ error: 'Student not found' });

  db.prepare('DELETE FROM students WHERE id = ?').run(req.params.id);
  if (student.user_id) {
    db.prepare('DELETE FROM users WHERE id = ?').run(student.user_id);
  }

  res.json({ message: 'Student deleted successfully' });
});

module.exports = router;
