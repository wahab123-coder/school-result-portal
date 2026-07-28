require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const path    = require('path');
const { initDB } = require('./db/database');

const app  = express();
const PORT = process.env.PORT || 5000;

app.use(cors({
  origin: [
    'http://localhost:5173',
    'http://localhost:3000',
    process.env.FRONTEND_URL
  ].filter(Boolean),
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded photos as static files
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

// Initialize DB first, then mount routes
initDB().then(() => {
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
