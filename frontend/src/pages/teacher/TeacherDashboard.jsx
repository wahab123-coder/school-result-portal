import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../../components/layout/Layout'
import api from '../../utils/api'
import toast from 'react-hot-toast'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000'

export default function TeacherDashboard() {
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    api.get('/dashboard/teacher')
      .then(res => setData(res.data))
      .catch(() => toast.error('Failed to load dashboard'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <Layout title="Dashboard">
      <div style={{ padding: 40, textAlign: 'center', color: 'var(--gray-400)' }}>Loading...</div>
    </Layout>
  )

  const { teacher, assignedClasses, assignedSubjects, scoresEntered, currentSession } = data || {}

  // Photo from profile
  const photoUrl = teacher?.profile_picture ? `${API_BASE}${teacher.profile_picture}` : null
  const initials = teacher?.full_name?.split(' ').map(n => n[0]).slice(0,2).join('').toUpperCase() || 'T'

  return (
    <Layout title="Dashboard">
      {/* ── Teacher Passport Card ── */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start', flexWrap: 'wrap' }}>
          {/* Photo */}
          <div style={{
            width: 90, height: 90, borderRadius: '50%', flexShrink: 0,
            border: '3px solid var(--gray-200)', overflow: 'hidden',
            background: 'var(--primary)', display: 'flex',
            alignItems: 'center', justifyContent: 'center'
          }}>
            {photoUrl
              ? <img src={photoUrl} alt={teacher?.full_name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : <span style={{ fontSize: 28, fontWeight: 700, color: '#fff' }}>{initials}</span>
            }
          </div>

          {/* Info */}
          <div style={{ flex: 1 }}>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--gray-900)', marginBottom: 4 }}>
              {teacher?.full_name}
            </h2>
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 12 }}>
              <span className="text-sm text-muted">Employee ID: <strong>{teacher?.employee_id}</strong></span>
              <span className="text-sm text-muted">Session: <strong>{currentSession?.name || 'N/A'}</strong></span>
              <span className="badge badge-blue">Teacher</span>
            </div>
            <button className="btn btn-primary btn-sm" onClick={() => navigate('/teacher/scores')}>
              Enter Scores
            </button>
            <button className="btn btn-secondary btn-sm" style={{ marginLeft: 8 }} onClick={() => navigate('/teacher/profile')}>
              My Profile
            </button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="stats-grid">
        {[
          { label: 'Assigned Classes',  value: assignedClasses?.length  ?? 0, accent: 'blue'   },
          { label: 'Assigned Subjects', value: assignedSubjects?.length ?? 0, accent: 'green'  },
          { label: 'Scores Entered',    value: scoresEntered            ?? 0, accent: 'yellow' },
        ].map(s => (
          <div className="stat-card" key={s.label}>
            <span className={`stat-accent ${s.accent}`} />
            <div>
              <div className="stat-label">{s.label}</div>
              <div className="stat-value">{s.value}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid-2">
        {/* Assigned Classes */}
        <div className="card">
          <div className="card-header"><h3 className="card-title">Assigned Classes</h3></div>
          {!assignedClasses?.length ? (
            <div className="empty-state"><p>No classes assigned. Contact the administrator.</p></div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {assignedClasses.map(c => (
                <div key={c.id} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '10px 14px', background: 'var(--gray-50)',
                  border: '1px solid var(--gray-200)', borderRadius: 'var(--radius-sm)'
                }}>
                  <span style={{ fontWeight: 500, fontSize: 14 }}>{c.name}</span>
                  <span className="badge badge-blue">{c.student_count} students</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Assigned Subjects */}
        <div className="card">
          <div className="card-header"><h3 className="card-title">Assigned Subjects</h3></div>
          {!assignedSubjects?.length ? (
            <div className="empty-state"><p>No subjects assigned. Contact the administrator.</p></div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {assignedSubjects.map(s => (
                <div key={s.id} style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '10px 14px', background: 'var(--gray-50)',
                  border: '1px solid var(--gray-200)', borderRadius: 'var(--radius-sm)'
                }}>
                  <span className="badge badge-green" style={{ minWidth: 48, textAlign: 'center' }}>{s.code}</span>
                  <span style={{ fontWeight: 500, fontSize: 14 }}>{s.name}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="card" style={{ marginTop: 20 }}>
        <div className="card-header"><h3 className="card-title">Score Entry</h3></div>
        <p className="text-muted text-sm" style={{ marginBottom: 14 }}>
          Select a class and subject to enter or update student scores for the current term.
        </p>
        <button className="btn btn-primary" onClick={() => navigate('/teacher/scores')}>
          Go to Score Entry
        </button>
      </div>
    </Layout>
  )
}
