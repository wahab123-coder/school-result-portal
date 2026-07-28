import { useState, useEffect, useRef } from 'react'
import Layout from '../components/layout/Layout'
import { useAuth } from '../context/AuthContext'
import api from '../utils/api'
import toast from 'react-hot-toast'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000'

function Avatar({ photoUrl, fullName, size = 100 }) {
  const initials = fullName
    ? fullName.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
    : '?'

  if (photoUrl) {
    return (
      <img
        src={`${API_BASE}${photoUrl}`}
        alt={fullName}
        style={{
          width: size, height: size, borderRadius: '50%',
          objectFit: 'cover', border: '3px solid var(--gray-200)'
        }}
      />
    )
  }

  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: 'var(--primary)', color: '#fff',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.32, fontWeight: 700,
      border: '3px solid var(--gray-200)', flexShrink: 0,
      letterSpacing: '0.02em'
    }}>
      {initials}
    </div>
  )
}

export default function ProfilePage() {
  const { user, login }   = useAuth()
  const fileInputRef      = useRef()
  const [profile, setProfile]     = useState(null)
  const [loading, setLoading]     = useState(true)
  const [editing, setEditing]     = useState(false)
  const [form, setForm]           = useState({ full_name: '', email: '' })
  const [saving, setSaving]       = useState(false)
  const [uploading, setUploading] = useState(false)

  const fetchProfile = () => {
    api.get('/profile')
      .then(res => {
        setProfile(res.data)
        setForm({ full_name: res.data.full_name, email: res.data.email || '' })
      })
      .catch(() => toast.error('Failed to load profile'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchProfile() }, [])

  const handleSave = async (e) => {
    e.preventDefault()
    if (!form.full_name.trim()) return toast.error('Full name is required')
    setSaving(true)
    try {
      await api.put('/profile', form)
      toast.success('Profile updated successfully')
      setEditing(false)
      fetchProfile()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update profile')
    } finally {
      setSaving(false)
    }
  }

  const handlePhotoChange = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) {
      return toast.error('Photo must be smaller than 2MB')
    }
    const formData = new FormData()
    formData.append('photo', file)
    setUploading(true)
    try {
      await api.post('/profile/photo', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      toast.success('Photo updated successfully')
      fetchProfile()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Upload failed')
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  const handleRemovePhoto = async () => {
    try {
      await api.delete('/profile/photo')
      toast.success('Photo removed')
      fetchProfile()
    } catch (err) {
      toast.error('Failed to remove photo')
    }
  }

  const photoUrl = profile?.role === 'student'
    ? profile?.profile?.profile_picture
    : profile?.profile_picture

  const roleLabel =
    profile?.role === 'admin'   ? 'Administrator' :
    profile?.role === 'teacher' ? 'Teacher'        : 'Student'

  const roleBadge =
    profile?.role === 'admin'   ? 'badge-red'   :
    profile?.role === 'teacher' ? 'badge-blue'  : 'badge-green'

  if (loading) return (
    <Layout title="My Profile">
      <div style={{ padding: 40, textAlign: 'center', color: 'var(--gray-400)' }}>Loading...</div>
    </Layout>
  )

  return (
    <Layout title="My Profile">
      <div className="page-header">
        <div>
          <h1>My Profile</h1>
          <p>View and update your account details</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: 20, alignItems: 'start' }}>

        {/* ── Left: Passport card ── */}
        <div>
          <div className="card" style={{ textAlign: 'center' }}>
            {/* Photo */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, marginBottom: 20 }}>
              <div style={{ position: 'relative' }}>
                <Avatar photoUrl={photoUrl} fullName={profile?.full_name} size={110} />
                {uploading && (
                  <div style={{
                    position: 'absolute', inset: 0, borderRadius: '50%',
                    background: 'rgba(0,0,0,0.45)', display: 'flex',
                    alignItems: 'center', justifyContent: 'center',
                    color: '#fff', fontSize: 12, fontWeight: 600
                  }}>
                    Uploading...
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => fileInputRef.current.click()}
                  disabled={uploading}
                >
                  {photoUrl ? 'Change Photo' : 'Upload Photo'}
                </button>
                {photoUrl && (
                  <button className="btn btn-ghost btn-sm" onClick={handleRemovePhoto}>
                    Remove
                  </button>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                style={{ display: 'none' }}
                onChange={handlePhotoChange}
              />
              <p style={{ fontSize: 11, color: 'var(--gray-400)' }}>JPG, PNG or WEBP — max 2MB</p>
            </div>

            <div className="divider" />

            {/* Identity */}
            <div style={{ textAlign: 'left', display: 'flex', flexDirection: 'column', gap: 12, marginTop: 16 }}>
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--gray-400)', marginBottom: 3 }}>Full Name</div>
                <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--gray-900)' }}>{profile?.full_name}</div>
              </div>
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--gray-400)', marginBottom: 3 }}>Username</div>
                <div style={{ fontSize: 14, color: 'var(--gray-700)' }}>{profile?.username}</div>
              </div>
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--gray-400)', marginBottom: 3 }}>Role</div>
                <span className={`badge ${roleBadge}`}>{roleLabel}</span>
              </div>
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--gray-400)', marginBottom: 3 }}>Member Since</div>
                <div style={{ fontSize: 13, color: 'var(--gray-600)' }}>
                  {profile?.created_at ? new Date(profile.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : '—'}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Right: Details + Edit ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Account details */}
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Account Information</h3>
              {!editing && (
                <button className="btn btn-secondary btn-sm" onClick={() => setEditing(true)}>
                  Edit
                </button>
              )}
            </div>

            {editing ? (
              <form onSubmit={handleSave} autoComplete="off">
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Full Name *</label>
                    <input className="form-control" value={form.full_name}
                      onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))}
                      required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Email Address</label>
                    <input type="email" className="form-control" value={form.email}
                      onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                      placeholder="Optional" />
                  </div>
                </div>
                <div className="form-actions">
                  <button type="button" className="btn btn-secondary"
                    onClick={() => { setEditing(false); setForm({ full_name: profile.full_name, email: profile.email || '' }) }}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={saving}>
                    {saving ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            ) : (
              <div className="profile-grid">
                {[
                  { lbl: 'Full Name', val: profile?.full_name },
                  { lbl: 'Username',  val: profile?.username  },
                  { lbl: 'Email',     val: profile?.email || '—' },
                  { lbl: 'Role',      val: roleLabel },
                ].map(item => (
                  <div key={item.lbl} className="profile-item">
                    <div className="lbl">{item.lbl}</div>
                    <div className="val">{item.val}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Role-specific details */}
          {profile?.role === 'student' && profile?.profile && (
            <div className="card">
              <div className="card-header">
                <h3 className="card-title">Student Details</h3>
              </div>
              <div className="profile-grid">
                {[
                  { lbl: 'Admission No.',  val: profile.profile.admission_number },
                  { lbl: 'Class',          val: profile.profile.class_name || '—' },
                  { lbl: 'Gender',         val: profile.profile.gender       || '—' },
                  { lbl: 'Date of Birth',  val: profile.profile.date_of_birth || '—' },
                  { lbl: 'Parent Phone',   val: profile.profile.parent_phone  || '—' },
                ].map(item => (
                  <div key={item.lbl} className="profile-item">
                    <div className="lbl">{item.lbl}</div>
                    <div className="val">{item.val}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {profile?.role === 'teacher' && profile?.profile && (
            <div className="card">
              <div className="card-header">
                <h3 className="card-title">Teacher Details</h3>
              </div>
              <div className="profile-grid">
                {[
                  { lbl: 'Employee ID', val: profile.profile.employee_id },
                ].map(item => (
                  <div key={item.lbl} className="profile-item">
                    <div className="lbl">{item.lbl}</div>
                    <div className="val">{item.val}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Security */}
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Security</h3>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--gray-800)' }}>Password</div>
                <div style={{ fontSize: 12, color: 'var(--gray-500)', marginTop: 2 }}>
                  Change your account password
                </div>
              </div>
              <a
                href={`/${profile?.role}/password`}
                className="btn btn-secondary btn-sm"
              >
                Change Password
              </a>
            </div>
          </div>

        </div>
      </div>
    </Layout>
  )
}
