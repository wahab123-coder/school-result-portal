import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'

// Pages
import LoginPage          from './pages/LoginPage'
import ChangePasswordPage from './pages/ChangePasswordPage'
import ProfilePage        from './pages/ProfilePage'
import AdminDashboard     from './pages/admin/AdminDashboard'
import StudentsPage       from './pages/admin/StudentsPage'
import StudentProfileView from './pages/admin/StudentProfileView'
import ClassesPage        from './pages/admin/ClassesPage'
import SubjectsPage       from './pages/admin/SubjectsPage'
import TeachersPage       from './pages/admin/TeachersPage'
import ResultsManagePage  from './pages/admin/ResultsManagePage'
import TeacherDashboard   from './pages/teacher/TeacherDashboard'
import ScoreEntryPage     from './pages/teacher/ScoreEntryPage'
import StudentDashboard   from './pages/student/StudentDashboard'
import StudentResultPage  from './pages/student/StudentResultPage'
import NotFound           from './pages/NotFound'

function ProtectedRoute({ children, allowedRoles }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="loading-screen">Loading...</div>
  if (!user)   return <Navigate to="/login" replace />
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/unauthorized" replace />
  }
  return children
}

function RoleRedirect() {
  const { user, loading } = useAuth()
  if (loading) return <div className="loading-screen">Loading...</div>
  if (!user)               return <Navigate to="/login"   replace />
  if (user.role === 'admin')   return <Navigate to="/admin"   replace />
  if (user.role === 'teacher') return <Navigate to="/teacher" replace />
  if (user.role === 'student') return <Navigate to="/student" replace />
  return <Navigate to="/login" replace />
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<RoleRedirect />} />
      <Route path="/login" element={<LoginPage />} />

      {/* ── Admin routes ─────────────────────────── */}
      <Route path="/admin" element={
        <ProtectedRoute allowedRoles={['admin']}>
          <AdminDashboard />
        </ProtectedRoute>
      } />
      <Route path="/admin/students" element={
        <ProtectedRoute allowedRoles={['admin']}>
          <StudentsPage />
        </ProtectedRoute>
      } />
      <Route path="/admin/students/:id" element={
        <ProtectedRoute allowedRoles={['admin']}>
          <StudentProfileView />
        </ProtectedRoute>
      } />
      <Route path="/admin/classes" element={
        <ProtectedRoute allowedRoles={['admin']}>
          <ClassesPage />
        </ProtectedRoute>
      } />
      <Route path="/admin/subjects" element={
        <ProtectedRoute allowedRoles={['admin']}>
          <SubjectsPage />
        </ProtectedRoute>
      } />
      <Route path="/admin/teachers" element={
        <ProtectedRoute allowedRoles={['admin']}>
          <TeachersPage />
        </ProtectedRoute>
      } />
      <Route path="/admin/results" element={
        <ProtectedRoute allowedRoles={['admin']}>
          <ResultsManagePage />
        </ProtectedRoute>
      } />
      <Route path="/admin/password" element={
        <ProtectedRoute allowedRoles={['admin']}>
          <ChangePasswordPage />
        </ProtectedRoute>
      } />
      <Route path="/admin/profile" element={
        <ProtectedRoute allowedRoles={['admin']}>
          <ProfilePage />
        </ProtectedRoute>
      } />

      {/* ── Teacher routes ────────────────────────── */}
      <Route path="/teacher" element={
        <ProtectedRoute allowedRoles={['teacher']}>
          <TeacherDashboard />
        </ProtectedRoute>
      } />
      <Route path="/teacher/scores" element={
        <ProtectedRoute allowedRoles={['teacher', 'admin']}>
          <ScoreEntryPage />
        </ProtectedRoute>
      } />
      <Route path="/teacher/password" element={
        <ProtectedRoute allowedRoles={['teacher']}>
          <ChangePasswordPage />
        </ProtectedRoute>
      } />
      <Route path="/teacher/profile" element={
        <ProtectedRoute allowedRoles={['teacher']}>
          <ProfilePage />
        </ProtectedRoute>
      } />

      {/* ── Student routes ────────────────────────── */}
      <Route path="/student" element={
        <ProtectedRoute allowedRoles={['student']}>
          <StudentDashboard />
        </ProtectedRoute>
      } />
      <Route path="/student/results" element={
        <ProtectedRoute allowedRoles={['student']}>
          <StudentResultPage />
        </ProtectedRoute>
      } />
      <Route path="/student/password" element={
        <ProtectedRoute allowedRoles={['student']}>
          <ChangePasswordPage />
        </ProtectedRoute>
      } />
      <Route path="/student/profile" element={
        <ProtectedRoute allowedRoles={['student']}>
          <ProfilePage />
        </ProtectedRoute>
      } />

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
