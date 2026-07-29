require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const path    = require('path');
const bcrypt  = require('bcryptjs');
const { initDB, getDB } = require('./db/database');

const app  = express();
const PORT = process.env.PORT || 5000;

app.use(cors({
  origin: [
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:5175',
    'http://localhost:3000',
    'https://qhc-frontend.onrender.com',
    'https://school-result-portal.onrender.com',
    process.env.FRONTEND_URL
  ].filter(Boolean),
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded photos as static files
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

// ── Auto-seed: runs only if the database has no users yet ───────────────────
async function autoSeed(db) {
  const existing = db.prepare('SELECT COUNT(*) AS count FROM users').get();
  if (existing.count > 0) {
    console.log('Database already has data — skipping seed');
    return;
  }

  console.log('No data found — running auto-seed...');
  const hash = (pw) => bcrypt.hashSync(pw, 10);

  // Sessions
  try { db.prepare('INSERT INTO sessions (name, is_current) VALUES (?, ?)').run('2023/2024', 0); } catch(e) {}
  try { db.prepare('INSERT INTO sessions (name, is_current) VALUES (?, ?)').run('2024/2025', 1); } catch(e) {}

  // Classes
  ['JSS1','JSS2','JSS3','SS1 Science','SS2 Commercial','SS3 Arts'].forEach(name => {
    try { db.prepare('INSERT INTO classes (name) VALUES (?)').run(name); } catch(e) {}
  });

  // Subjects
  [
    ['Mathematics','MTH'],['English Language','ENG'],['Biology','BIO'],
    ['Chemistry','CHE'],['Physics','PHY'],['Civic Education','CIV'],
    ['Economics','ECO'],['Geography','GEO'],['History','HIS'],['Computer Science','CMP']
  ].forEach(([name, code]) => {
    try { db.prepare('INSERT INTO subjects (name, code) VALUES (?, ?)').run(name, code); } catch(e) {}
  });

  // Admin
  try {
    db.prepare('INSERT INTO users (username, password, role, full_name, email) VALUES (?, ?, ?, ?, ?)')
      .run('admin', hash('admin123'), 'admin', 'System Administrator', 'admin@school.edu');
  } catch(e) {}

  // Teachers
  [
    ['teacher1','Mr. James Okafor','TCH001','james@school.edu'],
    ['teacher2','Mrs. Amaka Nwosu','TCH002','amaka@school.edu'],
    ['teacher3','Mr. Emeka Eze',   'TCH003','emeka@school.edu']
  ].forEach(([username, full_name, employee_id, email]) => {
    try {
      db.prepare('INSERT INTO users (username, password, role, full_name, email) VALUES (?, ?, ?, ?, ?)')
        .run(username, hash('teacher123'), 'teacher', full_name, email);
      const user = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
      db.prepare('INSERT INTO teachers (user_id, full_name, employee_id) VALUES (?, ?, ?)')
        .run(user.id, full_name, employee_id);
    } catch(e) {}
  });

  // Students
  [
    ['student1','Chioma Adaeze','ADM/2024/001','Female','2008-03-15','08012345678','JSS1'],
    ['student2','Tunde Bakare', 'ADM/2024/002','Male',  '2007-07-20','08023456789','JSS2'],
    ['student3','Ngozi Okonkwo','ADM/2024/003','Female','2008-11-05','08034567890','JSS1'],
    ['student4','Emeka Obi',    'ADM/2024/004','Male',  '2006-01-30','08045678901','SS1 Science'],
    ['student5','Fatima Bello', 'ADM/2024/005','Female','2007-09-12','08056789012','SS1 Science']
  ].forEach(([username, full_name, admission, gender, dob, phone, className]) => {
    try {
      db.prepare('INSERT INTO users (username, password, role, full_name) VALUES (?, ?, ?, ?)')
        .run(username, hash('student123'), 'student', full_name);
      const user = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
      const cls  = db.prepare('SELECT id FROM classes WHERE name = ?').get(className);
      if (user && cls) {
        db.prepare('INSERT INTO students (user_id, admission_number, full_name, class_id, gender, date_of_birth, parent_phone) VALUES (?, ?, ?, ?, ?, ?, ?)')
          .run(user.id, admission, full_name, cls.id, gender, dob, phone);
      }
    } catch(e) {}
  });

  // Sample scores for student1 and student3 in JSS1
  const { getGradeAndRemark } = require('./utils/gradeCalculator');
  const session  = db.prepare('SELECT id FROM sessions WHERE is_current = 1').get();
  const jss1     = db.prepare("SELECT id FROM classes WHERE name = 'JSS1'").get();
  const adminUsr = db.prepare("SELECT id FROM users WHERE username = 'admin'").get();

  const scoreSubjects = ['Mathematics','English Language','Biology','Chemistry','Civic Education'];
  const scores1 = [
    { ca1: 18, ca2: 16, exam: 50 }, { ca1: 17, ca2: 18, exam: 44 },
    { ca1: 16, ca2: 15, exam: 52 }, { ca1: 18, ca2: 17, exam: 46 },
    { ca1: 19, ca2: 18, exam: 54 }
  ];
  const scores3 = [
    { ca1: 14, ca2: 13, exam: 38 }, { ca1: 15, ca2: 14, exam: 42 },
    { ca1: 13, ca2: 12, exam: 36 }, { ca1: 14, ca2: 13, exam: 40 },
    { ca1: 16, ca2: 15, exam: 38 }
  ];

  const student1 = db.prepare("SELECT id FROM students WHERE admission_number = 'ADM/2024/001'").get();
  const student3 = db.prepare("SELECT id FROM students WHERE admission_number = 'ADM/2024/003'").get();

  if (session && jss1 && adminUsr) {
    [[student1, scores1], [student3, scores3]].forEach(([stu, scoreList]) => {
      if (!stu) return;
      scoreSubjects.forEach((subName, i) => {
        const sub = db.prepare('SELECT id FROM subjects WHERE name = ?').get(subName);
        if (!sub) return;
        const { ca1, ca2, exam } = scoreList[i];
        const total = ca1 + ca2 + exam;
        const { grade, remark } = getGradeAndRemark(total);
        try {
          db.prepare('INSERT INTO scores (student_id,subject_id,class_id,session_id,term,ca1,ca2,exam,grade,remark,entered_by) VALUES (?,?,?,?,?,?,?,?,?,?,?)')
            .run(stu.id, sub.id, jss1.id, session.id, 'First Term', ca1, ca2, exam, grade, remark, adminUsr.id);
        } catch(e) {}
      });
    });
  }

  console.log('Auto-seed complete.');
  console.log('Admin: admin / admin123');
  console.log('Teacher: teacher1 / teacher123');
  console.log('Student: student1 / student123');
}

// Initialize DB first, then mount routes
initDB().then(async () => {
  const db = getDB();

  // Auto-seed on first run
  await autoSeed(db);

  const authRoutes      = require('./routes/auth');
  const userRoutes      = require('./routes/users');
  const studentRoutes   = require('./routes/students');
  const classRoutes     = require('./routes/classes');
  const subjectRoutes   = require('./routes/subjects');
  const scoreRoutes     = require('./routes/scores');
  const resultRoutes    = require('./routes/results');
  const dashboardRoutes = require('./routes/dashboard');
  const profileRoutes   = require('./routes/profile');

  app.use('/api/auth',      authRoutes);
  app.use('/api/users',     userRoutes);
  app.use('/api/students',  studentRoutes);
  app.use('/api/classes',   classRoutes);
  app.use('/api/subjects',  subjectRoutes);
  app.use('/api/scores',    scoreRoutes);
  app.use('/api/results',   resultRoutes);
  app.use('/api/dashboard', dashboardRoutes);
  app.use('/api/profile',   profileRoutes);

  app.use((req, res) => res.status(404).json({ error: 'Route not found' }));
  app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
  });

  app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
}).catch(err => {
  console.error('Failed to initialize database:', err);
  process.exit(1);
});

module.exports = app;
