import { useState } from 'react'
import Layout from '../components/layout/Layout'
import { useAuth } from '../context/AuthContext'
import api from '../utils/api'
import toast from 'react-hot-toast'

export default function ChangePasswordPage() {
  const { user } = useAuth()
  const [form, setForm] = useState({
    current_password: '',
    new_password: '',
    confirm_password: ''
  })
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew, setShowNew]         = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [saving, setSaving]           = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!form.current_password) {
      return toast.error('Please enter your current password')
    }
    if (form.new_password.length < 6) {
      return toast.error('New password must be at least 6 characters')
    }
    if (form.new_password !== form.confirm_password) {
      return toast.error('New passwords do not match')
    }
    if (form.current_password === form.new_password) {
      return toast.error('New password must be different from current password')
    }

    setSaving(true)
    try {
      const res = await api.post('/auth/change-password', {
        current_password: form.current_password,
        new_password:     form.new_password
      })
      toast.success(res.data.message || 'Password changed successfully')
      setForm({ current_password: '', new_password: '', confirm_password: '' })
      // Show a reminder to use the new password on next login
      setTimeout(() => {
        toast('Your new password is now active. Use it next time you log in.', {
          duration: 5000,
          style: { background: 'var(--primary)', color: '#fff' }
        })
      }, 1000)
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to change password. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const strength = (pw) => {
    if (!pw) return null
    if (pw.length < 6)  return { label: 'Too short', color: '#c81e1e', width: '20%' }
    if (pw.length < 8)  return { label: 'Weak',      color: '#c27803', width: '40%' }
    if (pw.length < 10) return { label: 'Fair',       color: '#c27803', width: '60%' }
    if (/[A-Z]/.test(pw) && /[0-9]/.test(pw)) {
      return { label: 'Strong', color: '#057a55', width: '100%' }
    }
    return { label: 'Good', color: '#1a56db', width: '80%' }
  }

  const pwStrength = strength(form.new_password)

  const roleLabel =
    user?.role === 'admin'   ? 'Administrator' :
    user?.role === 'teacher' ? 'Teacher' : 'Student'

  return (
    <Layout title="Change Password">
      <div className="page-header">
        <div>
          <h1>Change Password</h1>
          <p>Update the password for your {roleLabel} account</p>
        </div>
      </div>

      <div style={{ maxWidth: 480 }}>
        {/* Account info */}
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="card-header" style={{ marginBottom: 0 }}>
            <h3 className="card-title">Account Details</h3>
          </div>
          <div className="divider" style={{ margin: '12px 0' }} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[
              { lbl: 'Full Name', val: user?.full_name },
              { lbl: 'Username',  val: user?.username  },
              { lbl: 'Role',      val: roleLabel        },
            ].map(item => (
              <div key={item.lbl} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--gray-500)' }}>
                  {item.lbl}
                </span>
                <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--gray-800)' }}>
                  {item.val}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Change password form */}
        <div className="card">
          <div className="card-header" style={{ marginBottom: 4 }}>
            <h3 className="card-title">Set New Password</h3>
          </div>
          <div className="divider" style={{ margin: '12px 0 18px' }} />

          <form onSubmit={handleSubmit} autoComplete="off">
            {/* Current password */}
            <div className="form-group">
              <label className="form-label" htmlFor="current_password">
                Current Password
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  id="current_password"
                  className="form-control"
                  type={showCurrent ? 'text' : 'password'}
                  value={form.current_password}
                  onChange={e => setForm(f => ({ ...f, current_password: e.target.value }))}
                  placeholder="Enter current password"
                  autoComplete="off"
                  data-lpignore="true"
                  style={{ paddingRight: 52 }}
                />
                <button type="button" className="show-pass-btn"
                  onClick={() => setShowCurrent(s => !s)}>
                  {showCurrent ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>

            <div className="divider" />

            {/* New password */}
            <div className="form-group">
              <label className="form-label" htmlFor="new_password">
                New Password
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  id="new_password"
                  className="form-control"
                  type={showNew ? 'text' : 'password'}
                  value={form.new_password}
                  onChange={e => setForm(f => ({ ...f, new_password: e.target.value }))}
                  placeholder="At least 6 characters"
                  autoComplete="new-password"
                  data-lpignore="true"
                  style={{ paddingRight: 52 }}
                />
                <button type="button" className="show-pass-btn"
                  onClick={() => setShowNew(s => !s)}>
                  {showNew ? 'Hide' : 'Show'}
                </button>
              </div>

              {/* Strength bar */}
              {pwStrength && (
                <div style={{ marginTop: 8 }}>
                  <div style={{ height: 4, background: 'var(--gray-200)', borderRadius: 2, overflow: 'hidden' }}>
                    <div style={{
                      height: '100%', width: pwStrength.width,
                      background: pwStrength.color,
                      borderRadius: 2, transition: 'width 0.3s, background 0.3s'
                    }} />
                  </div>
                  <span style={{ fontSize: 11, color: pwStrength.color, fontWeight: 600, marginTop: 4, display: 'block' }}>
                    {pwStrength.label}
                  </span>
                </div>
              )}
            </div>

            {/* Confirm password */}
            <div className="form-group">
              <label className="form-label" htmlFor="confirm_password">
                Confirm New Password
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  id="confirm_password"
                  className="form-control"
                  type={showConfirm ? 'text' : 'password'}
                  value={form.confirm_password}
                  onChange={e => setForm(f => ({ ...f, confirm_password: e.target.value }))}
                  placeholder="Repeat new password"
                  autoComplete="new-password"
                  data-lpignore="true"
                  style={{ paddingRight: 52 }}
                />
                <button type="button" className="show-pass-btn"
                  onClick={() => setShowConfirm(s => !s)}>
                  {showConfirm ? 'Hide' : 'Show'}
                </button>
              </div>

              {/* Match indicator */}
              {form.confirm_password && (
                <span style={{
                  fontSize: 11, fontWeight: 600, marginTop: 4, display: 'block',
                  color: form.new_password === form.confirm_password ? 'var(--success)' : 'var(--danger)'
                }}>
                  {form.new_password === form.confirm_password ? 'Passwords match' : 'Passwords do not match'}
                </span>
              )}
            </div>

            <div className="form-actions" style={{ borderTop: '1px solid var(--gray-100)', paddingTop: 16, marginTop: 8 }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setForm({ current_password: '', new_password: '', confirm_password: '' })}
              >
                Clear
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={saving}
              >
                {saving ? 'Updating...' : 'Update Password'}
              </button>
            </div>
          </form>
        </div>

        {/* Tips */}
        <div style={{
          marginTop: 16, padding: '14px 16px',
          background: 'var(--gray-50)', borderRadius: 'var(--radius-sm)',
          border: '1px solid var(--gray-200)'
        }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--gray-500)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
            Password Tips
          </p>
          <ul style={{ fontSize: 12.5, color: 'var(--gray-600)', paddingLeft: 16, lineHeight: 1.8 }}>
            <li>Use at least 8 characters</li>
            <li>Mix uppercase and lowercase letters</li>
            <li>Include at least one number</li>
            <li>Do not share your password with anyone</li>
          </ul>
        </div>
      </div>
    </Layout>
  )
}
