const express = require('express');
const path    = require('path');
const fs      = require('fs');
const multer  = require('multer');
const { getDB } = require('../db/database');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

// ── Upload setup for payment evidence ────────────────────────────────────────
const EVIDENCE_DIR = path.join(__dirname, '../../uploads/evidence');
if (!fs.existsSync(EVIDENCE_DIR)) fs.mkdirSync(EVIDENCE_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, EVIDENCE_DIR),
  filename:    (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `evidence_${Date.now()}${ext}`);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['.jpg','.jpeg','.png','.pdf'];
    if (allowed.includes(path.extname(file.originalname).toLowerCase())) cb(null, true);
    else cb(new Error('Only JPG, PNG or PDF files are allowed'));
  }
});

// ══════════════════════════════════════════════════════════════
// FEE STRUCTURES
// ══════════════════════════════════════════════════════════════

// GET /api/fees/structures
router.get('/structures', authenticate, (req, res) => {
  try {
    const db = getDB();
    const { session_id, term } = req.query;
    let query = `
      SELECT fs.*, c.name AS class_name, ses.name AS session_name,
             (SELECT COUNT(*) FROM invoices i WHERE i.fee_structure_id = fs.id) AS invoice_count
      FROM fee_structures fs
      LEFT JOIN classes c   ON fs.class_id   = c.id
      LEFT JOIN sessions ses ON fs.session_id = ses.id
      WHERE 1=1
    `;
    const params = [];
    if (session_id) { query += ' AND fs.session_id=?'; params.push(session_id); }
    if (term)       { query += ' AND fs.term=?';        params.push(term); }
    query += ' ORDER BY fs.created_at DESC';
    res.json(db.prepare(query).all(...params));
  } catch (err) {
    console.error('GET /fees/structures:', err);
    res.status(500).json({ error: 'Failed to load fee structures' });
  }
});

// POST /api/fees/structures — admin creates a fee structure
router.post('/structures', authenticate, authorize('admin'), (req, res) => {
  try {
    const db = getDB();
    const { name, class_id, session_id, term, amount, description, categories } = req.body;

    if (!name || !session_id || !term || !amount)
      return res.status(400).json({ error: 'name, session_id, term and amount are required' });

    const result = db.prepare(`
      INSERT INTO fee_structures (name, class_id, session_id, term, amount, description, created_by)
      VALUES (?,?,?,?,?,?,?)
    `).run(name, class_id||null, session_id, term, Number(amount), description||null, req.user.id);

    const feeId = result.lastInsertRowid;

    // Save fee categories if provided
    if (Array.isArray(categories) && categories.length > 0) {
      categories.forEach(cat => {
        if (cat.name && cat.amount) {
          db.prepare(
            'INSERT INTO fee_categories (fee_structure_id, name, amount) VALUES (?,?,?)'
          ).run(feeId, cat.name, Number(cat.amount));
        }
      });
    }

    res.status(201).json({ id: feeId, message: 'Fee structure created successfully' });
  } catch (err) {
    console.error('POST /fees/structures:', err);
    res.status(500).json({ error: 'Failed to create fee structure' });
  }
});

// PUT /api/fees/structures/:id
router.put('/structures/:id', authenticate, authorize('admin'), (req, res) => {
  try {
    const db = getDB();
    const { name, class_id, amount, description, is_active } = req.body;
    const fee = db.prepare('SELECT * FROM fee_structures WHERE id=?').get(req.params.id);
    if (!fee) return res.status(404).json({ error: 'Fee structure not found' });

    db.prepare(`
      UPDATE fee_structures SET name=?, class_id=?, amount=?, description=?,
        is_active=?, updated_at=CURRENT_TIMESTAMP WHERE id=?
    `).run(
      name||fee.name, class_id!==undefined?class_id:fee.class_id,
      amount?Number(amount):fee.amount, description!==undefined?description:fee.description,
      is_active!==undefined?is_active:fee.is_active, req.params.id
    );
    res.json({ message: 'Fee structure updated' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update fee structure' });
  }
});

// DELETE /api/fees/structures/:id
router.delete('/structures/:id', authenticate, authorize('admin'), (req, res) => {
  try {
    const db = getDB();
    db.prepare('DELETE FROM fee_categories WHERE fee_structure_id=?').run(req.params.id);
    db.prepare('DELETE FROM fee_structures WHERE id=?').run(req.params.id);
    res.json({ message: 'Fee structure deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete fee structure' });
  }
});

// ══════════════════════════════════════════════════════════════
// INVOICES
// ══════════════════════════════════════════════════════════════

// GET /api/fees/invoices
router.get('/invoices', authenticate, authorize('admin'), (req, res) => {
  try {
    const db = getDB();
    const { session_id, term, class_id, status } = req.query;
    let query = `
      SELECT i.*, s.full_name AS student_name, s.admission_number,
             c.name AS class_name, ses.name AS session_name,
             fs.name AS fee_name
      FROM invoices i
      JOIN students s    ON i.student_id      = s.id
      JOIN fee_structures fs ON i.fee_structure_id = fs.id
      LEFT JOIN classes c    ON s.class_id        = c.id
      LEFT JOIN sessions ses ON i.session_id       = ses.id
      WHERE 1=1
    `;
    const params = [];
    if (session_id) { query += ' AND i.session_id=?'; params.push(session_id); }
    if (term)       { query += ' AND i.term=?';        params.push(term); }
    if (class_id)   { query += ' AND s.class_id=?';    params.push(class_id); }
    if (status)     { query += ' AND i.status=?';      params.push(status); }
    query += ' ORDER BY i.created_at DESC';
    res.json(db.prepare(query).all(...params));
  } catch (err) {
    res.status(500).json({ error: 'Failed to load invoices' });
  }
});

// GET /api/fees/invoices/student/:studentId — parent/student view own invoices
router.get('/invoices/student/:studentId', authenticate, (req, res) => {
  try {
    const db = getDB();
    const { studentId } = req.params;

    // Parents can only see their own children
    if (req.user.role === 'parent') {
      const parent = db.prepare('SELECT id FROM parents WHERE user_id=?').get(req.user.id);
      if (!parent) return res.status(403).json({ error: 'Parent profile not found' });
      const link = db.prepare(
        'SELECT id FROM parent_students WHERE parent_id=? AND student_id=?'
      ).get(parent.id, studentId);
      if (!link) return res.status(403).json({ error: 'Access denied' });
    }

    const invoices = db.prepare(`
      SELECT i.*, fs.name AS fee_name, fs.description AS fee_description,
             ses.name AS session_name,
             s.full_name AS student_name, s.admission_number
      FROM invoices i
      JOIN fee_structures fs ON i.fee_structure_id = fs.id
      JOIN sessions ses       ON i.session_id       = ses.id
      JOIN students s         ON i.student_id       = s.id
      WHERE i.student_id=?
      ORDER BY i.created_at DESC
    `).all(studentId);

    // Attach categories and payments to each invoice
    const enriched = invoices.map(inv => ({
      ...inv,
      categories: db.prepare(
        'SELECT * FROM fee_categories WHERE fee_structure_id=?'
      ).all(inv.fee_structure_id),
      payments: db.prepare(`
        SELECT * FROM payments WHERE invoice_id=? ORDER BY created_at DESC
      `).all(inv.id)
    }));

    res.json(enriched);
  } catch (err) {
    console.error('GET /fees/invoices/student:', err);
    res.status(500).json({ error: 'Failed to load invoices' });
  }
});

// POST /api/fees/invoices/generate — admin generates invoices for a class
router.post('/invoices/generate', authenticate, authorize('admin'), (req, res) => {
  try {
    const db = getDB();
    const { fee_structure_id, class_id } = req.body;
    if (!fee_structure_id || !class_id)
      return res.status(400).json({ error: 'fee_structure_id and class_id are required' });

    const fee = db.prepare('SELECT * FROM fee_structures WHERE id=?').get(fee_structure_id);
    if (!fee) return res.status(404).json({ error: 'Fee structure not found' });

    const students = db.prepare('SELECT id FROM students WHERE class_id=?').all(class_id);
    let created = 0, skipped = 0;

    students.forEach(s => {
      const existing = db.prepare(
        'SELECT id FROM invoices WHERE student_id=? AND fee_structure_id=? AND session_id=? AND term=?'
      ).get(s.id, fee_structure_id, fee.session_id, fee.term);

      if (existing) { skipped++; return; }

      db.prepare(`
        INSERT INTO invoices (student_id, fee_structure_id, session_id, term, total_amount, status)
        VALUES (?,?,?,?,?,'unpaid')
      `).run(s.id, fee_structure_id, fee.session_id, fee.term, fee.amount);
      created++;
    });

    res.json({ message: `${created} invoice(s) generated, ${skipped} already existed` });
  } catch (err) {
    console.error('POST /fees/invoices/generate:', err);
    res.status(500).json({ error: 'Failed to generate invoices' });
  }
});

// ══════════════════════════════════════════════════════════════
// PAYMENTS
// ══════════════════════════════════════════════════════════════

// GET /api/fees/payments — admin view all payments
router.get('/payments', authenticate, authorize('admin'), (req, res) => {
  try {
    const db = getDB();
    const { status } = req.query;
    let query = `
      SELECT py.*, s.full_name AS student_name, s.admission_number,
             i.term, i.total_amount, ses.name AS session_name,
             p.full_name AS parent_name
      FROM payments py
      JOIN invoices i ON py.invoice_id = i.id
      JOIN students s ON py.student_id = s.id
      JOIN sessions ses ON i.session_id = ses.id
      LEFT JOIN parents p ON py.parent_id = p.id
      WHERE 1=1
    `;
    const params = [];
    if (status) { query += ' AND py.status=?'; params.push(status); }
    query += ' ORDER BY py.created_at DESC';
    res.json(db.prepare(query).all(...params));
  } catch (err) {
    res.status(500).json({ error: 'Failed to load payments' });
  }
});

// POST /api/fees/payments — parent submits a payment
router.post('/payments', authenticate, authorize('parent'), (req, res) => {
  upload.single('evidence')(req, res, (uploadErr) => {
    if (uploadErr) return res.status(400).json({ error: uploadErr.message });

    try {
      const db = getDB();
      const { invoice_id, amount, payment_method, payment_reference, payment_date, notes } = req.body;

      if (!invoice_id || !amount || !payment_date)
        return res.status(400).json({ error: 'invoice_id, amount and payment_date are required' });

      const parent = db.prepare('SELECT id FROM parents WHERE user_id=?').get(req.user.id);
      if (!parent) return res.status(403).json({ error: 'Parent profile not found' });

      const invoice = db.prepare('SELECT * FROM invoices WHERE id=?').get(invoice_id);
      if (!invoice) return res.status(404).json({ error: 'Invoice not found' });

      // Verify parent owns this student
      const link = db.prepare(
        'SELECT id FROM parent_students WHERE parent_id=? AND student_id=?'
      ).get(parent.id, invoice.student_id);
      if (!link) return res.status(403).json({ error: 'Access denied' });

      const evidenceFile = req.file ? `/uploads/evidence/${req.file.filename}` : null;

      const result = db.prepare(`
        INSERT INTO payments
          (invoice_id, student_id, parent_id, amount, payment_method,
           payment_reference, payment_date, evidence_file, notes, status)
        VALUES (?,?,?,?,?,?,?,?,?,'pending')
      `).run(
        invoice_id, invoice.student_id, parent.id,
        Number(amount), payment_method||'bank_transfer',
        payment_reference||null, payment_date,
        evidenceFile, notes||null
      );

      // Notify admin
      const adminUser = db.prepare("SELECT id FROM users WHERE role='admin' LIMIT 1").get();
      if (adminUser) {
        const student = db.prepare('SELECT full_name FROM students WHERE id=?').get(invoice.student_id);
        db.prepare(`
          INSERT INTO notifications (user_id, title, message, type) VALUES (?,?,?,?)
        `).run(
          adminUser.id,
          'New Payment Submitted',
          `${parent.full_name} submitted a payment of ₦${Number(amount).toLocaleString()} for ${student?.full_name}. Awaiting approval.`,
          'payment'
        );
      }

      res.status(201).json({
        id: result.lastInsertRowid,
        message: 'Payment submitted successfully. Awaiting admin approval.'
      });
    } catch (err) {
      console.error('POST /fees/payments:', err);
      res.status(500).json({ error: 'Failed to submit payment' });
    }
  });
});

// PUT /api/fees/payments/:id/approve — admin approves payment
router.put('/payments/:id/approve', authenticate, authorize('admin'), (req, res) => {
  try {
    const db = getDB();
    const payment = db.prepare('SELECT * FROM payments WHERE id=?').get(req.params.id);
    if (!payment) return res.status(404).json({ error: 'Payment not found' });
    if (payment.status !== 'pending')
      return res.status(400).json({ error: 'Payment is not pending' });

    // Approve payment
    db.prepare(`
      UPDATE payments SET status='approved', approved_by=?, approved_at=CURRENT_TIMESTAMP,
        updated_at=CURRENT_TIMESTAMP WHERE id=?
    `).run(req.user.id, payment.id);

    // Update invoice amount_paid and status
    const invoice = db.prepare('SELECT * FROM invoices WHERE id=?').get(payment.invoice_id);
    const newPaid = (invoice.amount_paid || 0) + payment.amount;
    const newStatus = newPaid >= invoice.total_amount ? 'paid' : 'partial';

    db.prepare(`
      UPDATE invoices SET amount_paid=?, status=?, updated_at=CURRENT_TIMESTAMP WHERE id=?
    `).run(newPaid, newStatus, invoice.id);

    // Generate receipt
    const receiptNumber = `RCP-${Date.now()}-${payment.id}`;
    db.prepare(`
      INSERT INTO receipts (payment_id, receipt_number, student_id, parent_id, amount, session_id, term)
      VALUES (?,?,?,?,?,?,?)
    `).run(
      payment.id, receiptNumber, payment.student_id, payment.parent_id,
      payment.amount, invoice.session_id, invoice.term
    );

    // Notify parent
    if (payment.parent_id) {
      const parentUser = db.prepare(
        'SELECT u.id FROM users u JOIN parents p ON u.id=p.user_id WHERE p.id=?'
      ).get(payment.parent_id);
      if (parentUser) {
        db.prepare(`
          INSERT INTO notifications (user_id, title, message, type) VALUES (?,?,?,?)
        `).run(
          parentUser.id,
          'Payment Approved',
          `Your payment of ₦${payment.amount.toLocaleString()} has been approved. Receipt: ${receiptNumber}`,
          'success'
        );
      }
    }

    res.json({ message: 'Payment approved and receipt generated', receipt_number: receiptNumber });
  } catch (err) {
    console.error('PUT /fees/payments/:id/approve:', err);
    res.status(500).json({ error: 'Failed to approve payment' });
  }
});

// PUT /api/fees/payments/:id/reject — admin rejects payment
router.put('/payments/:id/reject', authenticate, authorize('admin'), (req, res) => {
  try {
    const db = getDB();
    const { rejection_reason } = req.body;
    const payment = db.prepare('SELECT * FROM payments WHERE id=?').get(req.params.id);
    if (!payment) return res.status(404).json({ error: 'Payment not found' });

    db.prepare(`
      UPDATE payments SET status='rejected', rejection_reason=?,
        approved_by=?, approved_at=CURRENT_TIMESTAMP, updated_at=CURRENT_TIMESTAMP
      WHERE id=?
    `).run(rejection_reason||'Payment evidence not valid', req.user.id, payment.id);

    // Notify parent
    if (payment.parent_id) {
      const parentUser = db.prepare(
        'SELECT u.id FROM users u JOIN parents p ON u.id=p.user_id WHERE p.id=?'
      ).get(payment.parent_id);
      if (parentUser) {
        db.prepare(`
          INSERT INTO notifications (user_id, title, message, type) VALUES (?,?,?,?)
        `).run(
          parentUser.id,
          'Payment Rejected',
          `Your payment of ₦${payment.amount.toLocaleString()} was rejected. Reason: ${rejection_reason||'Evidence not valid'}`,
          'error'
        );
      }
    }

    res.json({ message: 'Payment rejected' });
  } catch (err) {
    console.error('PUT /fees/payments/:id/reject:', err);
    res.status(500).json({ error: 'Failed to reject payment' });
  }
});

// ══════════════════════════════════════════════════════════════
// RECEIPTS
// ══════════════════════════════════════════════════════════════

// GET /api/fees/receipts/parent — all receipts for logged-in parent
router.get('/receipts/parent', authenticate, authorize('parent'), (req, res) => {
  try {
    const db = getDB();
    const parent = db.prepare('SELECT id FROM parents WHERE user_id=?').get(req.user.id);
    if (!parent) return res.status(404).json({ error: 'Parent not found' });

    const receipts = db.prepare(`
      SELECT r.*, s.full_name AS student_name, s.admission_number,
             c.name AS class_name, ses.name AS session_name,
             py.payment_method, py.payment_reference, py.payment_date, py.evidence_file
      FROM receipts r
      JOIN students s    ON r.student_id  = s.id
      JOIN payments py   ON r.payment_id  = py.id
      LEFT JOIN classes c   ON s.class_id = c.id
      LEFT JOIN sessions ses ON r.session_id = ses.id
      WHERE r.parent_id=?
      ORDER BY r.generated_at DESC
    `).all(parent.id);

    res.json(receipts);
  } catch (err) {
    res.status(500).json({ error: 'Failed to load receipts' });
  }
});

// GET /api/fees/receipts/:id — get single receipt
router.get('/receipts/:id', authenticate, (req, res) => {
  try {
    const db = getDB();
    const receipt = db.prepare(`
      SELECT r.*, s.full_name AS student_name, s.admission_number,
             c.name AS class_name, ses.name AS session_name,
             py.payment_method, py.payment_reference, py.payment_date,
             py.evidence_file, py.notes,
             p.full_name AS parent_name
      FROM receipts r
      JOIN students s    ON r.student_id  = s.id
      JOIN payments py   ON r.payment_id  = py.id
      LEFT JOIN classes c    ON s.class_id    = c.id
      LEFT JOIN sessions ses ON r.session_id  = ses.id
      LEFT JOIN parents p    ON r.parent_id   = p.id
      WHERE r.id=?
    `).get(req.params.id);

    if (!receipt) return res.status(404).json({ error: 'Receipt not found' });

    // Parents can only view their own receipts
    if (req.user.role === 'parent') {
      const parent = db.prepare('SELECT id FROM parents WHERE user_id=?').get(req.user.id);
      if (!parent || receipt.parent_id !== parent.id)
        return res.status(403).json({ error: 'Access denied' });
    }

    res.json(receipt);
  } catch (err) {
    res.status(500).json({ error: 'Failed to load receipt' });
  }
});

// GET /api/fees/summary/admin — admin fees summary stats
router.get('/summary/admin', authenticate, authorize('admin'), (req, res) => {
  try {
    const db = getDB();
    const { session_id, term } = req.query;

    let filter = 'WHERE 1=1';
    const params = [];
    if (session_id) { filter += ' AND i.session_id=?'; params.push(session_id); }
    if (term)       { filter += ' AND i.term=?';        params.push(term); }

    const summary = db.prepare(`
      SELECT
        COUNT(*)                                         AS total_invoices,
        COALESCE(SUM(i.total_amount), 0)                AS total_expected,
        COALESCE(SUM(i.amount_paid), 0)                 AS total_collected,
        COALESCE(SUM(i.total_amount - i.amount_paid), 0) AS total_outstanding,
        SUM(CASE WHEN i.status='paid'    THEN 1 ELSE 0 END) AS fully_paid,
        SUM(CASE WHEN i.status='partial' THEN 1 ELSE 0 END) AS partial_paid,
        SUM(CASE WHEN i.status='unpaid'  THEN 1 ELSE 0 END) AS unpaid
      FROM invoices i ${filter}
    `).get(...params);

    const pendingPayments = db.prepare(
      "SELECT COUNT(*) AS count FROM payments WHERE status='pending'"
    ).get().count;

    res.json({ ...summary, pendingPayments });
  } catch (err) {
    res.status(500).json({ error: 'Failed to load summary' });
  }
});

module.exports = router;
