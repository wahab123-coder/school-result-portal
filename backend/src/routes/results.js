const express = require('express');
const { getDB } = require('../db/database');
const { authenticate, authorize } = require('../middleware/auth');
const { calculateAverage, assignPositions, getPrincipalRemark } = require('../utils/gradeCalculator');

const router = express.Router();

// ── Core computation (no transaction — avoids sql.js nesting issues) ─────────
function computeClassResults(class_id, session_id, term) {
  const db = getDB();
  const students = db.prepare('SELECT id FROM students WHERE class_id = ?').all(class_id);
  const studentAverages = [];

  for (const student of students) {
    // Use ca1 + ca2 + exam (new schema)
    const scores = db.prepare(`
      SELECT (ca1 + ca2 + exam) AS total
      FROM scores
      WHERE student_id=? AND session_id=? AND term=? AND class_id=?
    `).all(student.id, session_id, term, class_id);

    if (scores.length === 0) continue;
    const totals    = scores.map(s => s.total);
    const totalScore = totals.reduce((a, b) => a + b, 0);
    const average   = calculateAverage(totals);
    studentAverages.push({ student_id: student.id, average, totalScore });
  }

  const positions   = assignPositions(studentAverages);
  const positionMap = Object.fromEntries(positions.map(p => [p.student_id, p.position]));

  // Save each result individually (no transaction wrapper)
  for (const sa of studentAverages) {
    const position       = positionMap[sa.student_id];
    const principalRemark = getPrincipalRemark(sa.average);

    const existing = db.prepare(
      'SELECT id, teacher_remark FROM results WHERE student_id=? AND session_id=? AND term=?'
    ).get(sa.student_id, session_id, term);

    if (existing) {
      db.prepare(`
        UPDATE results SET
          class_id=?, total_score=?, average=?, position=?,
          principal_remark=?, updated_at=CURRENT_TIMESTAMP
        WHERE id=?
      `).run(class_id, sa.totalScore, sa.average, position, principalRemark, existing.id);
    } else {
      db.prepare(`
        INSERT INTO results
          (student_id, class_id, session_id, term, total_score, average, position, principal_remark)
        VALUES (?,?,?,?,?,?,?,?)
      `).run(sa.student_id, class_id, session_id, term, sa.totalScore, sa.average, position, principalRemark);
    }
  }

  return studentAverages.length;
}

// POST /api/results/compute
router.post('/compute', authenticate, authorize('admin', 'teacher'), (req, res) => {
  try {
    const { class_id, session_id, term } = req.body;
    if (!class_id || !session_id || !term)
      return res.status(400).json({ error: 'class_id, session_id, and term are required' });
    const count = computeClassResults(class_id, session_id, term);
    res.json({ message: `Results computed for ${count} student(s)` });
  } catch (err) {
    console.error('compute error:', err.message);
    res.status(500).json({ error: 'Failed to compute results: ' + err.message });
  }
});

// POST /api/results/publish
router.post('/publish', authenticate, authorize('admin'), (req, res) => {
  try {
    const db = getDB();
    const { class_id, session_id, term } = req.body;
    if (!class_id || !session_id || !term)
      return res.status(400).json({ error: 'class_id, session_id, and term are required' });
    computeClassResults(class_id, session_id, term);
    db.prepare(`
      UPDATE results SET is_published=1, published_at=CURRENT_TIMESTAMP
      WHERE class_id=? AND session_id=? AND term=?
    `).run(class_id, session_id, term);
    res.json({ message: 'Results published successfully' });
  } catch (err) {
    console.error('publish error:', err.message);
    res.status(500).json({ error: 'Failed to publish: ' + err.message });
  }
});

// POST /api/results/unpublish
router.post('/unpublish', authenticate, authorize('admin'), (req, res) => {
  try {
    const db = getDB();
    const { class_id, session_id, term } = req.body;
    db.prepare(`
      UPDATE results SET is_published=0, published_at=NULL
      WHERE class_id=? AND session_id=? AND term=?
    `).run(class_id, session_id, term);
    res.json({ message: 'Results unpublished successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to unpublish' });
  }
});

// GET /api/results/sessions/all
router.get('/sessions/all', authenticate, (req, res) => {
  const db = getDB();
  res.json(db.prepare('SELECT * FROM sessions ORDER BY created_at DESC').all());
});

// POST /api/results/sessions
router.post('/sessions', authenticate, authorize('admin'), (req, res) => {
  try {
    const db = getDB();
    const { name, is_current } = req.body;
    if (!name) return res.status(400).json({ error: 'Session name is required' });
    if (is_current) db.prepare('UPDATE sessions SET is_current=0').run();
    const result = db.prepare('INSERT INTO sessions (name, is_current) VALUES (?,?)').run(name, is_current ? 1 : 0);
    res.status(201).json({ id: result.lastInsertRowid, message: 'Session created' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create session' });
  }
});

// GET /api/results/student/:studentId — full result sheet
router.get('/student/:studentId', authenticate, (req, res) => {
  try {
    const db = getDB();
    const { studentId } = req.params;
    const { session_id, term } = req.query;

    if (req.user.role === 'student') {
      const self = db.prepare('SELECT id FROM students WHERE user_id=?').get(req.user.id);
      if (!self || self.id !== parseInt(studentId))
        return res.status(403).json({ error: 'Access denied' });
    }
    if (!session_id || !term)
      return res.status(400).json({ error: 'session_id and term are required' });

    const result = db.prepare(`
      SELECT r.*,
             s.full_name AS student_name, s.admission_number, s.profile_picture,
             c.name AS class_name, ses.name AS session_name
      FROM results r
      JOIN students s  ON r.student_id = s.id
      JOIN classes c   ON r.class_id   = c.id
      JOIN sessions ses ON r.session_id = ses.id
      WHERE r.student_id=? AND r.session_id=? AND r.term=?
    `).get(studentId, session_id, term);

    if (req.user.role === 'student' && result && !result.is_published)
      return res.status(403).json({ error: 'Results have not been published yet' });
    if (!result)
      return res.status(404).json({ error: 'Result not found. Scores may not have been computed yet.' });

    // Use new column names ca1 + ca2 + exam
    const scores = db.prepare(`
      SELECT sc.*, sub.name AS subject_name, sub.code AS subject_code,
             (sc.ca1 + sc.ca2 + sc.exam) AS total
      FROM scores sc
      JOIN subjects sub ON sc.subject_id = sub.id
      WHERE sc.student_id=? AND sc.session_id=? AND sc.term=?
      ORDER BY sub.name ASC
    `).all(studentId, session_id, term);

    const classSize = db.prepare('SELECT COUNT(*) AS count FROM students WHERE class_id=?').get(result.class_id);
    res.json({ ...result, scores, class_size: classSize.count });
  } catch (err) {
    console.error('GET /results/student error:', err.message);
    res.status(500).json({ error: 'Failed to load result' });
  }
});

// GET /api/results/class/:classId
router.get('/class/:classId', authenticate, authorize('admin', 'teacher'), (req, res) => {
  try {
    const db = getDB();
    const { classId } = req.params;
    const { session_id, term } = req.query;
    if (!session_id || !term)
      return res.status(400).json({ error: 'session_id and term are required' });
    const results = db.prepare(`
      SELECT r.*, s.full_name AS student_name, s.admission_number,
             c.name AS class_name, ses.name AS session_name
      FROM results r
      JOIN students s   ON r.student_id = s.id
      JOIN classes c    ON r.class_id   = c.id
      JOIN sessions ses ON r.session_id = ses.id
      WHERE r.class_id=? AND r.session_id=? AND r.term=?
      ORDER BY r.position ASC
    `).all(classId, session_id, term);
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: 'Failed to load results' });
  }
});

// PUT /api/results/:id/remark — teacher/admin adds remarks
router.put('/:id/remark', authenticate, authorize('admin', 'teacher'), (req, res) => {
  try {
    const db = getDB();
    const { teacher_remark, principal_remark } = req.body;
    const result = db.prepare('SELECT id FROM results WHERE id=?').get(req.params.id);
    if (!result) return res.status(404).json({ error: 'Result not found' });
    db.prepare(`
      UPDATE results SET teacher_remark=?, principal_remark=?, updated_at=CURRENT_TIMESTAMP
      WHERE id=?
    `).run(teacher_remark || null, principal_remark || null, req.params.id);
    res.json({ message: 'Remarks updated successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update remarks' });
  }
});

module.exports = router;
