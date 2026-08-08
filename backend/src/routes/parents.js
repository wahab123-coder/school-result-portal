const express = require('express');
const bcrypt  = require('bcryptjs');
const { getDB } = require('../db/database');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

// ── GET /api/parents — list all parents (admin) ───────────────────────────────
router.get('/', authenticate, authorize('admin'), (req, res) => {
  try {
    const db = getDB();
    const parents = db.prepare(`
      SELECT p.*, u.username, u.email, u.created_at
      FROM parents p JOIN users u ON p.user_id = u.id
      ORDER BY p.full_name ASC
    `).all();

    const result = parents.map(p => ({
      ...p,
      children: db.prepare(`
        SELECT s.id, s.full_name, s.admission_number, c.name AS class_name,
               ps.relationship
        FROM parent_students ps
        JOIN students s ON ps.student_id = s.id
        LEFT JOIN classes c ON s.class_id = c.id
        WHERE ps.parent_id = ?
      `).all(p.id)
    }));

    res.json(result);
  } catch (err) {
    console.error('GET /parents:', err);
    res.status(500).json({ error: 'Failed to load parents' });
  }
});

// ── GET /api/parents/me — current parent profile ──────────────────────────────
router.get('/me', authenticate, authorize('parent'), (req, res) => {
  try {
    const db = getDB();
    const parent = db.prepare(`
      SELECT p.*, u.username, u.email
      FROM parents p JOIN users u ON p.user_id = u.id
      WHERE p.user_id = ?
    `).get(req.user.id);

    if (!parent) return res.status(404).json({ error: 'Parent profile not found' });

    const children = db.prepare(`
      SELECT s.id, s.full_name, s.admission_number, s.gender,
             s.date_of_birth, s.profile_picture,
             c.name AS class_name, c.id AS class_id,
             ps.relationship
      FROM parent_students ps
      JOIN students s ON ps.student_id = s.id
      LEFT JOIN classes c ON s.class_id = c.id
      WHERE ps.parent_id = ?
      ORDER BY s.full_name ASC
    `).all(parent.id);

    res.json({ ...parent, children });
  } catch (err) {
    console.error('GET /parents/me:', err);
    res.status(500).json({ error: 'Failed to load profile' });
  }
});

// ── PUT /api/parents/me — update parent profile ───────────────────────────────
router.put('/me', authenticate, authorize('parent'), (req, res) => {
  try {
    const db = getDB();
    const { full_name, phone, address, occupation, email } = req.body;
    if (!full_name || !full_name.trim())
      return res.status(400).json({ error: 'Full name is required' });

    db.prepare(`
      UPDATE parents SET full_name=?, phone=?, address=?, occupation=?,
        updated_at=CURRENT_TIMESTAMP WHERE user_id=?
    `).run(full_name.trim(), phone||null, address||null, occupation||null, req.user.id);

    db.prepare(`
      UPDATE users SET full_name=?, email=?, updated_at=CURRENT_TIMESTAMP WHERE id=?
    `).run(full_name.trim(), email||null, req.user.id);

    res.json({ message: 'Profile updated successfully' });
  } catch (err) {
    console.error('PUT /parents/me:', err);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// ── POST /api/parents — admin creates a parent account ───────────────────────
router.post('/', authenticate, authorize('admin'), (req, res) => {
  try {
    const db = getDB();
    const { full_name, username, password, email, phone, address, occupation } = req.body;

    if (!full_name || !username || !password)
      return res.status(400).json({ error: 'full_name, username and password are required' });
    if (password.length < 6)
      return res.status(400).json({ error: 'Password must be at least 6 characters' });

    const existingUser = db.prepare('SELECT id FROM users WHERE LOWER(username)=LOWER(?)').get(username.trim());
    if (existingUser) return res.status(409).json({ error: 'Username already exists' });

    const hashed = bcrypt.hashSync(password, 10);
    const userResult = db.prepare(
      'INSERT INTO users (username, password, role, full_name, email) VALUES (?,?,?,?,?)'
    ).run(username.trim(), hashed, 'parent', full_name.trim(), email||null);

    db.prepare(
      'INSERT INTO parents (user_id, full_name, phone, address, occupation) VALUES (?,?,?,?,?)'
    ).run(userResult.lastInsertRowid, full_name.trim(), phone||null, address||null, occupation||null);

    res.status(201).json({ message: 'Parent account created successfully' });
  } catch (err) {
    console.error('POST /parents:', err);
    res.status(500).json({ error: 'Failed to create parent account' });
  }
});

// ── DELETE /api/parents/:id — admin deletes parent ───────────────────────────
router.delete('/:id', authenticate, authorize('admin'), (req, res) => {
  try {
    const db = getDB();
    const parent = db.prepare('SELECT * FROM parents WHERE id=?').get(req.params.id);
    if (!parent) return res.status(404).json({ error: 'Parent not found' });

    db.prepare('DELETE FROM parent_students WHERE parent_id=?').run(parent.id);
    db.prepare('DELETE FROM parents WHERE id=?').run(parent.id);
    if (parent.user_id) db.prepare('DELETE FROM users WHERE id=?').run(parent.user_id);

    res.json({ message: 'Parent deleted successfully' });
  } catch (err) {
    console.error('DELETE /parents/:id:', err);
    res.status(500).json({ error: 'Failed to delete parent' });
  }
});

// ── POST /api/parents/:id/link-student — link a student to a parent ───────────
router.post('/:id/link-student', authenticate, authorize('admin'), (req, res) => {
  try {
    const db = getDB();
    const { student_id, relationship } = req.body;
    if (!student_id) return res.status(400).json({ error: 'student_id is required' });

    const parent  = db.prepare('SELECT id FROM parents WHERE id=?').get(req.params.id);
    if (!parent) return res.status(404).json({ error: 'Parent not found' });

    const student = db.prepare('SELECT id FROM students WHERE id=?').get(student_id);
    if (!student) return res.status(404).json({ error: 'Student not found' });

    try {
      db.prepare(
        'INSERT INTO parent_students (parent_id, student_id, relationship) VALUES (?,?,?)'
      ).run(parent.id, student_id, relationship || 'Parent');
    } catch (e) {
      return res.status(409).json({ error: 'Student is already linked to this parent' });
    }

    res.status(201).json({ message: 'Student linked to parent successfully' });
  } catch (err) {
    console.error('POST /parents/:id/link-student:', err);
    res.status(500).json({ error: 'Failed to link student' });
  }
});

// ── DELETE /api/parents/:id/unlink-student/:studentId ────────────────────────
router.delete('/:id/unlink-student/:studentId', authenticate, authorize('admin'), (req, res) => {
  try {
    const db = getDB();
    db.prepare(
      'DELETE FROM parent_students WHERE parent_id=? AND student_id=?'
    ).run(req.params.id, req.params.studentId);
    res.json({ message: 'Student unlinked from parent' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to unlink student' });
  }
});

// ── GET /api/parents/:id/children — get children of a parent (admin) ──────────
router.get('/:id/children', authenticate, authorize('admin'), (req, res) => {
  try {
    const db = getDB();
    const children = db.prepare(`
      SELECT s.id, s.full_name, s.admission_number, s.gender,
             s.date_of_birth, s.profile_picture,
             c.name AS class_name, ps.relationship
      FROM parent_students ps
      JOIN students s ON ps.student_id = s.id
      LEFT JOIN classes c ON s.class_id = c.id
      WHERE ps.parent_id = ?
      ORDER BY s.full_name ASC
    `).all(req.params.id);
    res.json(children);
  } catch (err) {
    res.status(500).json({ error: 'Failed to load children' });
  }
});

// ── GET /api/parents/dashboard — parent dashboard data ───────────────────────
router.get('/dashboard', authenticate, authorize('parent'), (req, res) => {
  try {
    const db = getDB();
    const parent = db.prepare(
      'SELECT p.* FROM parents p WHERE p.user_id=?'
    ).get(req.user.id);
    if (!parent) return res.status(404).json({ error: 'Parent profile not found' });

    const children = db.prepare(`
      SELECT s.id, s.full_name, s.admission_number, s.gender, s.profile_picture,
             c.name AS class_name, c.id AS class_id, ps.relationship
      FROM parent_students ps
      JOIN students s ON ps.student_id = s.id
      LEFT JOIN classes c ON s.class_id = c.id
      WHERE ps.parent_id = ?
      ORDER BY s.full_name ASC
    `).all(parent.id);

    const currentSession = db.prepare('SELECT * FROM sessions WHERE is_current=1').get();

    // Outstanding fees across all children
    const outstandingFees = db.prepare(`
      SELECT COALESCE(SUM(i.total_amount - i.amount_paid), 0) AS total
      FROM invoices i
      JOIN parent_students ps ON i.student_id = ps.student_id
      WHERE ps.parent_id = ? AND i.status != 'paid'
    `).get(parent.id);

    // Recent payments
    const recentPayments = db.prepare(`
      SELECT py.*, s.full_name AS student_name, i.term, ses.name AS session_name
      FROM payments py
      JOIN invoices i ON py.invoice_id = i.id
      JOIN students s ON py.student_id = s.id
      JOIN sessions ses ON i.session_id = ses.id
      WHERE py.parent_id = ?
      ORDER BY py.created_at DESC LIMIT 5
    `).all(parent.id);

    // Unread notifications
    const notifications = db.prepare(`
      SELECT * FROM notifications WHERE user_id=? AND is_read=0
      ORDER BY created_at DESC LIMIT 10
    `).all(req.user.id);

    res.json({
      parent,
      children,
      currentSession,
      outstandingFees: outstandingFees.total || 0,
      recentPayments,
      notifications
    });
  } catch (err) {
    console.error('GET /parents/dashboard:', err);
    res.status(500).json({ error: 'Failed to load dashboard' });
  }
});

// ── GET /api/parents/notifications/mark-read ─────────────────────────────────
router.post('/notifications/mark-read', authenticate, authorize('parent'), (req, res) => {
  try {
    const db = getDB();
    db.prepare('UPDATE notifications SET is_read=1 WHERE user_id=?').run(req.user.id);
    res.json({ message: 'Notifications marked as read' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to mark notifications' });
  }
});

module.exports = router;
