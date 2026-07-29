const express = require('express');
const { getDB } = require('../db/database');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

router.get('/admin', authenticate, authorize('admin'), (req, res) => {
  const db = getDB();
  const totalStudents    = db.prepare('SELECT COUNT(*) AS count FROM students').get().count;
  const totalTeachers    = db.prepare('SELECT COUNT(*) AS count FROM teachers').get().count;
  const totalClasses     = db.prepare('SELECT COUNT(*) AS count FROM classes').get().count;
  const totalSubjects    = db.prepare('SELECT COUNT(*) AS count FROM subjects').get().count;
  const publishedResults = db.prepare('SELECT COUNT(*) AS count FROM results WHERE is_published = 1').get().count;
  const recentStudents   = db.prepare('SELECT s.full_name, s.admission_number, c.name AS class_name, s.created_at FROM students s LEFT JOIN classes c ON s.class_id = c.id ORDER BY s.created_at DESC LIMIT 5').all();
  const classBreakdown   = db.prepare('SELECT c.name, COUNT(s.id) AS student_count FROM classes c LEFT JOIN students s ON s.class_id = c.id GROUP BY c.id ORDER BY c.name').all();
  res.json({ stats: { totalStudents, totalTeachers, totalClasses, totalSubjects, publishedResults }, recentStudents, classBreakdown });
});

router.get('/teacher', authenticate, authorize('teacher'), (req, res) => {
  const db = getDB();
  const teacher = db.prepare('SELECT * FROM teachers WHERE user_id = ?').get(req.user.id);
  if (!teacher) return res.status(404).json({ error: 'Teacher profile not found' });
  const assignedClasses  = db.prepare('SELECT c.id, c.name, COUNT(s.id) AS student_count FROM teacher_classes tc JOIN classes c ON tc.class_id = c.id LEFT JOIN students s ON s.class_id = c.id WHERE tc.teacher_id = ? GROUP BY c.id').all(teacher.id);
  const assignedSubjects = db.prepare('SELECT sub.id, sub.name, sub.code FROM teacher_subjects ts JOIN subjects sub ON ts.subject_id = sub.id WHERE ts.teacher_id = ?').all(teacher.id);
  const scoresEntered    = db.prepare('SELECT COUNT(*) AS count FROM scores WHERE entered_by = ?').get(req.user.id).count;
  const currentSession   = db.prepare('SELECT * FROM sessions WHERE is_current = 1').get();
  res.json({ teacher, assignedClasses, assignedSubjects, scoresEntered, currentSession });
});

router.get('/student', authenticate, authorize('student'), (req, res) => {
  const db = getDB();
  const student = db.prepare('SELECT s.*, c.name AS class_name FROM students s LEFT JOIN classes c ON s.class_id = c.id WHERE s.user_id = ?').get(req.user.id);
  if (!student) return res.status(404).json({ error: 'Student profile not found' });
  const currentSession = db.prepare('SELECT * FROM sessions WHERE is_current = 1').get();
  const results = db.prepare('SELECT r.term, r.average, r.position, r.is_published, ses.name AS session_name, c.name AS class_name FROM results r JOIN sessions ses ON r.session_id = ses.id JOIN classes c ON r.class_id = c.id WHERE r.student_id = ? AND r.is_published = 1 ORDER BY ses.name DESC, r.term ASC').all(student.id);
  const best = results.reduce((b, r) => (!b || r.average > b.average ? r : b), null);
  res.json({ student, currentSession, results, bestResult: best });
});

router.post('/teacher/assign-class', authenticate, authorize('admin'), (req, res) => {
  const db = getDB();
  const { teacher_id, class_id } = req.body;
  if (!teacher_id || !class_id) return res.status(400).json({ error: 'teacher_id and class_id are required' });
  try { db.prepare('INSERT INTO teacher_classes (teacher_id, class_id) VALUES (?, ?)').run(teacher_id, class_id); } catch(e) {}
  res.json({ message: 'Class assigned to teacher' });
});

router.post('/teacher/assign-subject', authenticate, authorize('admin'), (req, res) => {
  const db = getDB();
  const { teacher_id, subject_id } = req.body;
  if (!teacher_id || !subject_id) return res.status(400).json({ error: 'teacher_id and subject_id are required' });
  try { db.prepare('INSERT INTO teacher_subjects (teacher_id, subject_id) VALUES (?, ?)').run(teacher_id, subject_id); } catch(e) {}
  res.json({ message: 'Subject assigned to teacher' });
});

router.get('/teachers', authenticate, authorize('admin'), (req, res) => {
  const db = getDB();
  const teachers = db.prepare('SELECT t.*, u.username, u.email FROM teachers t JOIN users u ON t.user_id = u.id ORDER BY t.full_name ASC').all();
  const result = teachers.map(t => ({
    ...t,
    classes:  db.prepare('SELECT c.id, c.name FROM teacher_classes tc JOIN classes c ON tc.class_id = c.id WHERE tc.teacher_id = ?').all(t.id),
    subjects: db.prepare('SELECT s.id, s.name, s.code FROM teacher_subjects ts JOIN subjects s ON ts.subject_id = s.id WHERE ts.teacher_id = ?').all(t.id)
  }));
  res.json(result);
});

// POST /api/dashboard/teachers — create a new teacher
router.post('/teachers', authenticate, authorize('admin'), (req, res) => {
  const db = getDB();
  const { full_name, employee_id, username, password, email } = req.body;

  if (!full_name || !employee_id || !username || !password)
    return res.status(400).json({ error: 'full_name, employee_id, username and password are required' });

  const existingUser = db.prepare('SELECT id FROM users WHERE LOWER(username) = LOWER(?)').get(username.trim());
  if (existingUser) return res.status(409).json({ error: 'Username already exists' });

  const existingEmp = db.prepare('SELECT id FROM teachers WHERE employee_id = ?').get(employee_id.trim());
  if (existingEmp) return res.status(409).json({ error: 'Employee ID already exists' });

  try {
    const bcrypt = require('bcryptjs');
    const hashed = bcrypt.hashSync(password, 10);

    const userResult = db.prepare(
      'INSERT INTO users (username, password, role, full_name, email) VALUES (?, ?, ?, ?, ?)'
    ).run(username.trim(), hashed, 'teacher', full_name.trim(), email?.trim() || null);

    db.prepare(
      'INSERT INTO teachers (user_id, full_name, employee_id) VALUES (?, ?, ?)'
    ).run(userResult.lastInsertRowid, full_name.trim(), employee_id.trim());

    res.status(201).json({ message: 'Teacher created successfully' });
  } catch (err) {
    console.error('Create teacher error:', err);
    res.status(500).json({ error: 'Failed to create teacher' });
  }
});

// DELETE /api/dashboard/teachers/:id — delete a teacher
router.delete('/teachers/:id', authenticate, authorize('admin'), (req, res) => {
  const db = getDB();
  const teacher = db.prepare('SELECT * FROM teachers WHERE id = ?').get(req.params.id);
  if (!teacher) return res.status(404).json({ error: 'Teacher not found' });

  db.prepare('DELETE FROM teacher_classes WHERE teacher_id = ?').run(teacher.id);
  db.prepare('DELETE FROM teacher_subjects WHERE teacher_id = ?').run(teacher.id);
  db.prepare('DELETE FROM teachers WHERE id = ?').run(teacher.id);
  if (teacher.user_id) db.prepare('DELETE FROM users WHERE id = ?').run(teacher.user_id);

  res.json({ message: 'Teacher deleted successfully' });
});

module.exports = router;
