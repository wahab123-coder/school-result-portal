import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'

export default function LoginPage() {
  const [form, setForm]       = useState({ username: '', password: '' })
  const [loading, setLoading] = useState(false)
  const [showPass, setShowPass] = useState(false)
  const { login } = useAuth()
  const navigate  = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.username || !form.password) {
      return toast.error('Please enter your username and password')
    }
    setLoading(true)
    try {
      const user = await login(form.username, form.password)
      toast.success(`Welcome, ${user.full_name.split(' ')[0]}`)
      if (user.role === 'admin')        navigate('/admin')
      else if (user.role === 'teacher') navigate('/teacher')
      else                              navigate('/student')
    } catch (err) {
      toast.error(err.response?.data?.error || 'Invalid credentials. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const fillDemo = (role) => {
    const map = {
      admin:   { username: 'admin',    password: 'admin123'   },
      teacher: { username: 'teacher1', password: 'teacher123' },
      student: { username: 'student1', password: 'student123' },
    }
    setForm(map[role])
  }

  return (
    <div className="login-page">
      {/* Left panel */}
      <div className="login-left">
        <div className="login-left-badge">Student Result Portal</div>
        <h1 className="login-left-title" style={{ marginTop: 20 }}>
          Qiblah Heights College
        </h1>
        <p className="login-left-sub">
          A centralised platform for managing student records, entering scores,
          and accessing academic results online.
        </p>
        <div style={{ marginTop: 48, display: 'flex', flexDirection: 'column', gap: 14, width: '100%', maxWidth: 300 }}>
          {[
            { role: 'Admin',   desc: 'Manage students, classes, subjects and results' },
            { role: 'Teacher', desc: 'Enter and update student scores by subject' },
            { role: 'Student', desc: 'View published result sheets and report cards' },
          ].map(r => (
            <div key={r.role} style={{
              background: 'rgba(255,255,255,0.1)', borderRadius: 8,
              padding: '12px 16px', borderLeft: '3px solid rgba(255,255,255,0.4)'
            }}>
              <div style={{ fontWeight: 700, fontSize: 13, color: '#fff' }}>{r.role}</div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 2 }}>{r.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Right panel */}
      <div className="login-right">
        <div className="login-card">
          <h2 className="login-card-title">Sign in</h2>
          <p className="login-card-sub">Enter your credentials to access the portal</p>

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label" htmlFor="username">Username</label>
              <input
                id="username"
                className="form-control"
                type="text"
                placeholder="Enter username"
                value={form.username}
                onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
                autoComplete="username"
                autoFocus
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="password">Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  id="password"
                  className="form-control"
                  type={showPass ? 'text' : 'password'}
                  placeholder="Enter password"
                  value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  autoComplete="off"
                  data-lpignore="true"
                  data-form-type="other"
                  style={{ paddingRight: 52 }}
                />
                <button
                  type="button"
                  className="show-pass-btn"
                  onClick={() => setShowPass(s => !s)}
                  aria-label="Toggle password visibility"
                >
                  {showPass ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%', justifyContent: 'center', padding: '10px 16px', fontSize: 14 }}
              disabled={loading}
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <div className="demo-section">
            <div className="demo-label">Quick demo access</div>
            <div className="demo-btns">
              {['admin', 'teacher', 'student'].map(role => (
                <button
                  key={role}
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => fillDemo(role)}
                  style={{ flex: 1, justifyContent: 'center' }}
                >
                  {role.charAt(0).toUpperCase() + role.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
