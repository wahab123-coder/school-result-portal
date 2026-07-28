# Qiblah Heights College — Student Result Portal

A full-stack web application for managing student academic records, entering scores, computing results, and allowing students to view their report cards online.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Vite, React Router v6 |
| Backend | Node.js, Express.js |
| Database | SQLite (via sql.js) |
| Auth | JWT (jsonwebtoken + bcryptjs) |
| File Upload | Multer |
| Styling | Custom CSS |

---

## Features

### Admin
- Dashboard with school statistics
- Add, edit, delete and search students
- View full student profile with result history
- Manage teachers, classes and subjects
- Assign teachers to classes and subjects
- Enter scores on behalf of teachers
- Compute and publish results per class per term
- Add teacher and principal comments per student
- Create academic sessions

### Teacher
- Dashboard showing assigned classes and subjects
- Enter and update student scores by class, subject and term
- Profile page with photo upload

### Student
- Dashboard with passport photo and result history
- View published report cards by session and term
- Print or save report card as PDF
- Profile page with photo upload
- Change password

### All Users
- Secure login with JWT authentication
- Change password with strength indicator
- Profile page with photo upload (JPG, PNG, WEBP, max 2MB)

---

## Score Structure

| Component | Mark |
|-----------|------|
| 1st CA | 20 |
| 2nd CA | 20 |
| Examination | 60 |
| **Total** | **100** |

## Grading Scale

| Score | Grade | Remark |
|-------|-------|--------|
| 70–100 | A | Excellent |
| 60–69 | B | Very Good |
| 50–59 | C | Good |
| 45–49 | D | Fair |
| 40–44 | E | Pass |
| 0–39 | F | Fail |

---

## Getting Started

### Prerequisites
- Node.js v18 or later
- npm v8 or later

### 1. Clone the repository
```
git clone https://github.com/YOUR_USERNAME/school-result-portal.git
cd school-result-portal
```

### 2. Set up the Backend
```
cd backend
npm install
npm run seed
npm start
```

Backend runs on: `http://localhost:5000`

The seed command creates the database with demo data:

| Role | Username | Password |
|------|----------|----------|
| Admin | `admin` | `admin123` |
| Teacher | `teacher1` | `teacher123` |
| Student | `student1` | `student123` |

### 3. Set up the Frontend
Open a second terminal:
```
cd frontend
npm install
npm run dev
```

Frontend runs on: `http://localhost:5173`

---

## Project Structure

```
school-result-portal/
├── backend/
│   ├── src/
│   │   ├── db/
│   │   │   ├── database.js       # SQLite setup and schema
│   │   │   └── seed.js           # Demo data seeder
│   │   ├── middleware/
│   │   │   └── auth.js           # JWT verify + role-based access
│   │   ├── routes/
│   │   │   ├── auth.js           # Login, /me, change-password
│   │   │   ├── students.js       # CRUD students
│   │   │   ├── classes.js        # CRUD classes
│   │   │   ├── subjects.js       # CRUD subjects
│   │   │   ├── scores.js         # Score entry (single + bulk)
│   │   │   ├── results.js        # Compute, publish, view results
│   │   │   ├── users.js          # Admin user management
│   │   │   ├── dashboard.js      # Role dashboards
│   │   │   └── profile.js        # Profile + photo upload
│   │   ├── utils/
│   │   │   ├── gradeCalculator.js
│   │   │   └── jwt.js
│   │   └── server.js
│   ├── data/                     # SQLite database (auto-created)
│   ├── uploads/                  # Profile photos (auto-created)
│   ├── .env
│   └── package.json
│
└── frontend/
    ├── src/
    │   ├── context/
    │   │   └── AuthContext.jsx
    │   ├── components/layout/
    │   │   └── Layout.jsx
    │   ├── pages/
    │   │   ├── LoginPage.jsx
    │   │   ├── ProfilePage.jsx
    │   │   ├── ChangePasswordPage.jsx
    │   │   ├── admin/
    │   │   │   ├── AdminDashboard.jsx
    │   │   │   ├── StudentsPage.jsx
    │   │   │   ├── StudentProfileView.jsx
    │   │   │   ├── ClassesPage.jsx
    │   │   │   ├── SubjectsPage.jsx
    │   │   │   ├── TeachersPage.jsx
    │   │   │   └── ResultsManagePage.jsx
    │   │   ├── teacher/
    │   │   │   ├── TeacherDashboard.jsx
    │   │   │   └── ScoreEntryPage.jsx
    │   │   └── student/
    │   │       ├── StudentDashboard.jsx
    │   │       └── StudentResultPage.jsx
    │   ├── utils/api.js
    │   ├── App.jsx
    │   └── index.css
    ├── index.html
    ├── vite.config.js
    └── package.json
```

---

## Deployment

### Backend — Render Web Service
- Root Directory: `backend`
- Build Command: `npm install`
- Start Command: `npm start`
- Environment Variables:
  - `JWT_SECRET` — your secret key
  - `NODE_ENV` — `production`
  - `PORT` — `10000`

### Frontend — Render Static Site
- Root Directory: `frontend`
- Build Command: `npm install && npm run build`
- Publish Directory: `dist`
- Environment Variables:
  - `VITE_API_URL` — your backend Render URL

---

## Demo Video
A 2–3 minute walkthrough demonstrating all three portals (Admin, Teacher, Student) is available at: [link to be added]
