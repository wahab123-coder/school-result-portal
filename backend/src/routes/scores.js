const express = require('express');
const { getDB } = require('../db/database');
const { authenticate, authorize } = require('../middleware/auth');
const { getGradeAndRemark } = require('../utils/gradeCalculator');

const router = express.Router();

// GET /api/scores
router.get('/', authenticate, authorize('admin', 'teacher'), (req, res) => {
  try {
    const db = getDB();
    const { student_id, class_id, subject_id, session_id, term } = req.query;
    let query = `
      SELECT sc.*,
             (sc.ca1 + sc.ca2 + sc.exam) AS total,
             st.full_name AS student_name, st.admission_number,
             sub.name AS subject_name, sub.code AS subject_code,
             c.name AS class_name, ses.name AS session_name
      FROM scores sc
      JOIN students st  ON sc.student_id = st.id
      JOIN subjects sub ON sc.subject_id = sub.id
      JOIN classes c    ON sc.class_id   = c.id
      JOIN sessions ses ON sc.session_id = ses.id
      WHERE 1=1
    `;
    const params = [];
    if (student_id) { query += ' AND sc.student_id = ?'; params.push(student_id); }
    if (class_id)   { query += ' AND sc.class_id = ?';   params.push(class_id); }
    if (subject_id) { query += ' AND sc.subject_id = ?'; params.push(subject_id); }
    if (session_id) { query += ' AND sc.session_id = ?'; params.push(session_id); }
    if (term)       { query += ' AND sc.term = ?';        params.push(term); }
    query += ' ORDER BY st.full_name ASC, sub.name ASC';
    res.json(db.prepare(query).all(...params));
  } catch (err) {
    console.error('GET /scores error:', err);
    res.status(500).json({ error: 'Failed to load scores' });
  }
});

// GET /api/scores/student/:studentId
router.get('/student/:studentId', authenticate, (req, res) => {
  try {
    const db = getDB();
    const { studentId } = req.params;
    const { session_id, term } = req.query;

    if (req.user.role === 'student') {
      const self = db.prepare('SELECT id FROM students WHERE user_id = ?').get(req.user.id);
      if (!self || self.id !== parseInt(studentId))
        return res.status(403).json({ error: 'Access denied' });
    }

    let query = `
      SELECT sc.*,
             (sc.ca1 + sc.ca2 + sc.exam) AS total,
             sub.name AS subject_name, sub.code AS subject_code,
             ses.name AS session_name, c.name AS class_name
      FROM scores sc
      JOIN subjects sub ON sc.subject_id = sub.id
      JOIN sessions ses ON sc.session_id = ses.id
      JOIN classes c    ON sc.class_id   = c.id
      WHERE sc.student_id = ?
    `;
    const params = [studentId];
    if (session_id) { query += ' AND sc.session_id = ?'; params.push(session_id); }
    if (term)       { query += ' AND sc.term = ?';        params.push(term); }
    query += ' ORDER BY sub.name ASC';
    res.json(db.prepare(query).all(...params));
  } catch (err) {
    console.error('GET /scores/student error:', err);
    res.status(500).json({ error: 'Failed to load scores' });
  }
});

// POST /api/scores — single score
router.post('/', authenticate, authorize('admin', 'teacher'), (req, res) => {
  try {
    const db = getDB();
    const { student_id, subject_id, class_id, session_id, term, ca1, ca2, exam } = req.body;

    if (!student_id || !subject_id || !class_id || !session_id || !term)
      return res.status(400).json({ error: 'student_id, subject_id, class_id, session_id, and term are required' });

    const c = {
      ca1:  Math.min(20, Math.max(0, Number(ca1  || 0))),
      ca2:  Math.min(20, Math.max(0, Number(ca2  || 0))),
      exam: Math.min(60, Math.max(0, Number(exam || 0)))
    };
    const total = c.ca1 + c.ca2 + c.exam;
    const { grade, remark } = getGradeAndRemark(total);

    const existing = db.prepare(
      'SELECT id FROM scores WHERE student_id=? AND subject_id=? AND session_id=? AND term=?'
    ).get(student_id, subject_id, session_id, term);

    if (existing) {
      db.prepare(`
        UPDATE scores SET class_id=?, ca1=?, ca2=?, exam=?,
          grade=?, remark=?, entered_by=?, updated_at=CURRENT_TIMESTAMP
        WHERE id=?
      `).run(class_id, c.ca1, c.ca2, c.exam, grade, remark, req.user.id, existing.id);
      return res.json({ message: 'Score updated successfully', grade, remark, total });
    }

    const result = db.prepare(`
      INSERT INTO scores (student_id,subject_id,class_id,session_id,term,ca1,ca2,exam,grade,remark,entered_by)
      VALUES (?,?,?,?,?,?,?,?,?,?,?)
    `).run(student_id, subject_id, class_id, session_id, term, c.ca1, c.ca2, c.exam, grade, remark, req.user.id);

    res.status(201).json({ id: result.lastInsertRowid, message: 'Score entered successfully', grade, remark, total });
  } catch (err) {
    console.error('POST /scores error:', err);
    res.status(500).json({ error: 'Failed to save score. Please try again.' });
  }
});

// POST /api/scores/bulk — save whole class at once
router.post('/bulk', authenticate, authorize('admin', 'teacher'), (req, res) => {
  try {
    const db = getDB();
    const { scores, class_id, subject_id, session_id, term } = req.body;

    if (!Array.isArray(scores) || scores.length === 0)
      return res.status(400).json({ error: 'scores must be a non-empty array' });
    if (!class_id || !subject_id || !session_id || !term)
      return res.status(400).json({ error: 'class_id, subject_id, session_id, and term are required' });

    const savedResults = [];
    const errors = [];

    // Process each score individually without a transaction wrapper
    // to avoid sql.js transaction nesting issues
    for (const row of scores) {
      if (!row.student_id) continue;

      try {
        const c = {
          ca1:  Math.min(20, Math.max(0, Number(row.ca1  || 0))),
          ca2:  Math.min(20, Math.max(0, Number(row.ca2  || 0))),
          exam: Math.min(60, Math.max(0, Number(row.exam || 0)))
        };
        const total = c.ca1 + c.ca2 + c.exam;
        const { grade, remark } = getGradeAndRemark(total);

        // Check if score already exists
        const existing = db.prepare(
          'SELECT id FROM scores WHERE student_id=? AND subject_id=? AND session_id=? AND term=?'
        ).get(row.student_id, subject_id, session_id, term);

        if (existing) {
          db.prepare(`
            UPDATE scores SET
              class_id=?, ca1=?, ca2=?, exam=?,
              grade=?, remark=?, entered_by=?, updated_at=CURRENT_TIMESTAMP
            WHERE id=?
          `).run(class_id, c.ca1, c.ca2, c.exam, grade, remark, req.user.id, existing.id);
        } else {
          db.prepare(`
            INSERT INTO scores
              (student_id, subject_id, class_id, session_id, term, ca1, ca2, exam, grade, remark, entered_by)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).run(
            row.student_id, subject_id, class_id, session_id, term,
            c.ca1, c.ca2, c.exam, grade, remark, req.user.id
          );
        }

        savedResults.push({ student_id: row.student_id, total, grade, remark });

      } catch (rowErr) {
        console.error(`Error saving score for student ${row.student_id}:`, rowErr.message);
        errors.push({ student_id: row.student_id, error: rowErr.message });
      }
    }

    if (savedResults.length === 0 && errors.length > 0) {
      return res.status(500).json({
        error: 'Failed to save any scores. Check server logs.',
        details: errors
      });
    }

    res.json({
      message: `${savedResults.length} score(s) saved successfully`,
      results: savedResults,
      errors: errors.length > 0 ? errors : undefined
    });

  } catch (err) {
    console.error('POST /scores/bulk error:', err.message);
    res.status(500).json({ error: `Save failed: ${err.message}` });
  }
});

// DELETE /api/scores/:id
router.delete('/:id', authenticate, authorize('admin'), (req, res) => {
  try {
    const db = getDB();
    const result = db.prepare('DELETE FROM scores WHERE id = ?').run(req.params.id);
    if (result.changes === 0) return res.status(404).json({ error: 'Score not found' });
    res.json({ message: 'Score deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete score' });
  }
});

module.exports = router;
