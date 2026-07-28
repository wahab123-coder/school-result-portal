import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import toast from 'react-hot-toast'

/* ── SVG Icons ── */
const Icon = {
  Dashboard: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>,
  Students:  () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  Teachers:  () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
  Classes:   () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
  Subjects:  () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>,
  Results:   () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>,
  Scores:    () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="20" x2="12" y2="10"/><line x1="18" y1="20" x2="18" y2="4"/><line x1="6" y1="20" x2="6" y2="16"/></svg>,
  Logout:    () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>,
  Password:  () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>,
  Profile:   () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
}

const adminNav = [
  { to: '/admin',           label: 'Dashboard',       icon: Icon.Dashboard },
  { to: '/admin/students',  label: 'Students',         icon: Icon.Students  },
  { to: '/admin/teachers',  label: 'Teachers',         icon: Icon.Teachers  },
  { to: '/admin/classes',   label: 'Classes',          icon: Icon.Classes   },
  { to: '/admin/subjects',  label: 'Subjects',         icon: Icon.Subjects  },
  { to: '/admin/results',   label: 'Results',          icon: Icon.Results   },
  { to: '/teacher/scores',  label: 'Score Entry',      icon: Icon.Scores    },
  { to: '/admin/profile',   label: 'My Profile',       icon: Icon.Profile   },
  { to: '/admin/password',  label: 'Change Password',  icon: Icon.Password  },
]
const teacherNav = [
  { to: '/teacher',          label: 'Dashboard',       icon: Icon.Dashboard },
  { to: '/teacher/scores',   label: 'Enter Scores',    icon: Icon.Scores    },
  { to: '/teacher/profile',  label: 'My Profile',      icon: Icon.Profile   },
  { to: '/teacher/password', label: 'Change Password', icon: Icon.Password  },
]
const studentNav = [
  { to: '/student',          label: 'Dashboard',       icon: Icon.Dashboard },
  { to: '/student/results',  label: 'My Results',      icon: Icon.Results   },
  { to: '/student/profile',  label: 'My Profile',      icon: Icon.Profile   },
  { to: '/student/password', label: 'Change Password', icon: Icon.Password  },
]

export default function Layout({ children, title }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const navItems =
    user?.role === 'admin'   ? adminNav :
    user?.role === 'teacher' ? teacherNav : studentNav

  const handleLogout = () => {
    logout()
    toast.success('Signed out successfully')
    navigate('/login')
  }

  const roleBadge =
    user?.role === 'admin'   ? 'badge-red' :
    user?.role === 'teacher' ? 'badge-blue' : 'badge-green'

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="sidebar-school-name">Qiblah Heights College</div>
          <span>Student Result Portal</span>
        </div>

        <nav className="sidebar-nav">
          <div className="nav-section-label">Menu</div>
          {navItems.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end={['/admin','/teacher','/student'].includes(item.to)}
              className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
            >
              <item.icon />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-user">
            <strong>{user?.full_name}</strong>
            <div className="role-badge">
              <span className={`badge ${roleBadge}`}>
                {user?.role?.charAt(0).toUpperCase() + user?.role?.slice(1)}
              </span>
            </div>
          </div>
          <button
            className="btn btn-secondary btn-sm"
            style={{ width: '100%', justifyContent: 'center' }}
            onClick={handleLogout}
          >
            <Icon.Logout /> Sign Out
          </button>
        </div>
      </aside>

      <div className="main-content">
        <header className="header">
          <span className="header-title">{title}</span>
          <span className="header-user">Welcome, {user?.full_name?.split(' ')[0]}</span>
        </header>
        <main className="page-content">{children}</main>
      </div>
    </div>
  )
}
