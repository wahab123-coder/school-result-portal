import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../../components/layout/Layout'
import api from '../../utils/api'
import toast from 'react-hot-toast'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000'

export default function StudentDashboard() {
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    api.get('/dashboard/student')
      .then(res => setData(res.data))
      .catch(() => toast.error('Failed to load dashboard'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <Layout title="Dashboard">
      <div style={{ padding: 40, textAlign: 'center', color: 'var(--gray-400)' }}>Loading...</div>
    </Layout>
  )

  const { student, currentSession, results, bestResult } = data || {}

  const photoUrl = student?.profile_picture
    ? `${API_BASE}${student.profile_picture}`
    : null

  const initials = student?.full_name
    ?.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase() || 'S'

  const avgBadge = (avg) => {
    if (avg >= 70) return 'badge-green'
    if (avg >= 60) return 'badge-blue'
    if (avg >= 50) return 'badge-gray'
    if (avg >= 40) return 'badge-yellow'
    return 'badge-red'
  }

  return (
    <Layout title="Dashboard">

      {/* ── Passport Card ── */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start', flexWrap: 'wrap' }}>

          {/* Passport photo */}
          <div style={{
            width: 100, height: 110, borderRadius: 6, flexShrink: 0,
            border: '3px solid var(--gray-200)', overflow: 'hidden',
            background: 'var(--primary)', display: 'flex',
            alignItems: 'center', justifyContent: 'center'
          }}>
            {photoUrl
              ? <img src={photoUrl} alt={student?.full_name}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : <span style={{ fontSize: 30, fontWeight: 700, color: '#fff' }}>{initials}</span>
            }
          </div>

          {/* Student info */}
          <div style={{ flex: 1 }}>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--gray-900)', marginBottom: 6 }}>
              {student?.full_name}
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px,1fr))', gap: 10, marginBottom: 16 }}>
              {[
                { lbl: 'Admission No.', val: student?.admission_number },
                { lbl: 'Class',         val: student?.class_name || '—' },
                { lbl: 'Gender',        val: student?.gender       || '—' },
                { lbl: 'Session',       val: currentSession?.name  || 'N/A' },
              ].map(item => (
                <div key={item.lbl} style={{
                  background: 'var(--gray-50)', borderRadius: 6,
                  padding: '8px 12px', border: '1px solid var(--gray-200)'
                }}>
                  <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--gray-500)', marginBottom: 3 }}>
                    {item.lbl}
                  </div>
                  <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--gray-800)' }}>{item.val}</div>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-primary btn-sm" onClick={() => navigate('/student/results')}>
                View Results
              </button>
              <button className="btn btn-secondary btn-sm" onClick={() => navigate('/student/profile')}>
                My Profile
              </button>
            </div>
          </div>

          {/* Best result highlight */}
          {bestResult && (
            <div style={{
              background: 'var(--primary-light)', borderRadius: 8,
              padding: '16px 20px', border: '1px solid #c3ddfd',
              textAlign: 'center', minWidth: 140
            }}>
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--primary)', marginBottom: 6 }}>
                Best Result
              </div>
              <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--primary)' }}>
                {bestResult.average?.toFixed(1)}%
              </div>
              <div style={{ fontSize: 12, color: 'var(--gray-600)', marginTop: 4 }}>
                Position: <strong>{bestResult.position}</strong>
              </div>
              <div style={{ fontSize: 11, color: 'var(--gray-500)', marginTop: 2 }}>
                {bestResult.session_name} · {bestResult.term}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Result History ── */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Result History</h3>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/student/results')}>
            View report card
          </button>
        </div>
        {!results?.length ? (
          <div className="empty-state">
            <p className="empty-state-title">No published results yet</p>
            <p>Your results will appear here once published by the school.</p>
          </div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr><th>Session</th><th>Term</th><th>Average</th><th>Position</th><th>Action</th></tr>
              </thead>
              <tbody>
                {results.map((r, i) => (
                  <tr key={i}>
                    <td>{r.session_name}</td>
                    <td>{r.term}</td>
                    <td><span className={`badge ${avgBadge(r.average)}`}>{r.average?.toFixed(2)}%</span></td>
                    <td style={{ fontWeight: 600 }}>{r.position}</td>
                    <td>
                      <button className="btn btn-secondary btn-sm"
                        onClick={() => navigate('/student/results')}>
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Layout>
  )
}
