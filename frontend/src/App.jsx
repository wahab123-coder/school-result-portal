import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'

// Shared pages
import LoginPage          from './pages/LoginPage'
import ChangePasswordPage from './pages/ChangePasswordPage'
import ProfilePage        from './pages/ProfilePage'
import NotFound           from './pages/NotFound'

// Admin pages
import AdminDashboard     from './pages/admin/AdminDashboard'
import StudentsPage       from './pages/admin/StudentsPage'
import StudentProfileView from './pages/admin/StudentProfileView'
import ClassesPage        from './pages/admin/ClassesPage'
import SubjectsPage       from './pages/admin/SubjectsPage'
import TeachersPage       from './pages/admin/TeachersPage'
import ResultsManagePage  from './pages/admin/ResultsManagePage'
import ParentsManagePage  from './pages/admin/ParentsManagePage'
import FeeManagePage      from './pages/admin/FeeManagePage'
import PaymentsApprovalPage from './pages/admin/PaymentsApprovalPage'

// Teacher pages
import TeacherDashboard   from './pages/teacher/TeacherDashboard'
import ScoreEntryPage     from './pages/teacher/ScoreEntryPage'

// Student pages
import StudentDashboard   from './pages/student/StudentDashboard'
import StudentResultPage  from './pages/student/StudentResultPage'

// Parent pages
import ParentDashboard    from './pages/parent/ParentDashboard'
import ParentChildrenPage from './pages/parent/ParentChildrenPage'
import ParentFeesPage     from './pages/parent/ParentFeesPage'
import ParentReceiptsPage from './pages/parent/ParentReceiptsPage'
import ReceiptViewPage    from './pages/parent/ReceiptViewPage'

function ProtectedRoute({ children, allowedRoles }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="loading-screen">Loading...</div>
  if (!user)   return <Navigate to="/login" replace />
  if (allowedRoles && !allowedRoles.includes(user.role))
    return <Navigate to="/unauthorized" replace />
  return children
}

function RoleRedirect() {
  const { user, loading } = useAuth()
  if (loading) return <div className="loading-screen">Loading...</div>
  if (!user)               return <Navigate to="/login"   replace />
  if (user.role === 'admin')   return <Navigate to="/admin"   replace />
  if (user.role === 'teacher') return <Navigate to="/teacher" replace />
  if (user.role === 'student') return <Navigate to="/student" replace />
  if (user.role === 'parent')  return <Navigate to="/parent"  replace />
  return <Navigate to="/login" replace />
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<RoleRedirect />} />
      <Route path="/login" element={<LoginPage />} />

      {/* ── Admin ─────────────────────────────────────────── */}
      {[
        { path: '/admin',                component: <AdminDashboard /> },
        { path: '/admin/students',       component: <StudentsPage /> },
        { path: '/admin/students/:id',   component: <StudentProfileView /> },
        { path: '/admin/classes',        component: <ClassesPage /> },
        { path: '/admin/subjects',       component: <SubjectsPage /> },
        { path: '/admin/teachers',       component: <TeachersPage /> },
        { path: '/admin/results',        component: <ResultsManagePage /> },
        { path: '/admin/parents',        component: <ParentsManagePage /> },
        { path: '/admin/fees',           component: <FeeManagePage /> },
        { path: '/admin/payments',       component: <PaymentsApprovalPage /> },
        { path: '/admin/profile',        component: <ProfilePage /> },
        { path: '/admin/password',       component: <ChangePasswordPage /> },
      ].map(({ path, component }) => (
        <Route key={path} path={path} element={
          <ProtectedRoute allowedRoles={['admin']}>{component}</ProtectedRoute>
        } />
      ))}

      {/* Score entry — admin + teacher */}
      <Route path="/teacher/scores" element={
        <ProtectedRoute allowedRoles={['teacher','admin']}>
          <ScoreEntryPage />
        </ProtectedRoute>
      } />

      {/* ── Teacher ───────────────────────────────────────── */}
      {[
        { path: '/teacher',          component: <TeacherDashboard /> },
        { path: '/teacher/profile',  component: <ProfilePage /> },
        { path: '/teacher/password', component: <ChangePasswordPage /> },
      ].map(({ path, component }) => (
        <Route key={path} path={path} element={
          <ProtectedRoute allowedRoles={['teacher']}>{component}</ProtectedRoute>
        } />
      ))}

      {/* ── Student ───────────────────────────────────────── */}
      {[
        { path: '/student',          component: <StudentDashboard /> },
        { path: '/student/results',  component: <StudentResultPage /> },
        { path: '/student/profile',  component: <ProfilePage /> },
        { path: '/student/password', component: <ChangePasswordPage /> },
      ].map(({ path, component }) => (
        <Route key={path} path={path} element={
          <ProtectedRoute allowedRoles={['student']}>{component}</ProtectedRoute>
        } />
      ))}

      {/* ── Parent ────────────────────────────────────────── */}
      {[
        { path: '/parent',              component: <ParentDashboard /> },
        { path: '/parent/children',     component: <ParentChildrenPage /> },
        { path: '/parent/fees',         component: <ParentFeesPage /> },
        { path: '/parent/receipts',     component: <ParentReceiptsPage /> },
        { path: '/parent/receipts/:id', component: <ReceiptViewPage /> },
        { path: '/parent/profile',      component: <ProfilePage /> },
        { path: '/parent/password',     component: <ChangePasswordPage /> },
      ].map(({ path, component }) => (
        <Route key={path} path={path} element={
          <ProtectedRoute allowedRoles={['parent']}>{component}</ProtectedRoute>
        } />
      ))}

      <Route path="/unauthorized" element={
        <div className="error-page">
          <h1 style={{ fontSize: 24, fontWeight: 700 }}>403 — Access Denied</h1>
          <p style={{ color: 'var(--gray-500)' }}>You do not have permission to view this page.</p>
        </div>
      } />
      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  )
}
