import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../../components/layout/Layout'
import api from '../../utils/api'
import toast from 'react-hot-toast'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000'

export default function ParentDashboard() {
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    api.get('/parents/dashboard')
      .then(res => setData(res.data))
      .catch(() => toast.error('Failed to load dashboard'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <Layout title="Parent Dashboard">
      <div style={{ padding: 40, textAlign: 'center', color: 'var(--gray-400)' }}>Loading...</div>
    </Layout>
  )

  const { parent, children, currentSession, outstandingFees, recentPayments, notifications } = data || {}

  return (
    <Layout title="Parent Dashboard">
      <div className="page-header">
        <div>
          <h1>Welcome, {parent?.full_name}</h1>
          <p>Session: {currentSession?.name || 'N/A'}</p>
        </div>
      </div>

      {/* Notifications */}
      {notifications?.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          {notifications.map(n => (
            <div key={n.id} style={{
              padding: '12px 16px', borderRadius: 'var(--radius-sm)', marginBottom: 8,
              background: n.type === 'success' ? 'var(--success-light)' :
                          n.type === 'error'   ? 'var(--danger-light)'  : 'var(--primary-light)',
              borderLeft: `4px solid ${n.type === 'success' ? 'var(--success)' :
                           n.type === 'error' ? 'var(--danger)' : 'var(--primary)'}`,
              display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start'
            }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: 13 }}>{n.title}</div>
                <div style={{ fontSize: 12, color: 'var(--gray-600)', marginTop: 2 }}>{n.message}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Stats */}
      <div className="stats-grid">
        <div className="stat-card">
          <span className="stat-accent blue" />
          <div>
            <div className="stat-label">Children</div>
            <div className="stat-value">{children?.length ?? 0}</div>
          </div>
        </div>
        <div className="stat-card">
          <span className="stat-accent red" />
          <div>
            <div className="stat-label">Outstanding Fees</div>
            <div className="stat-value" style={{ fontSize: 20 }}>
              ₦{Number(outstandingFees || 0).toLocaleString()}
            </div>
          </div>
        </div>
        <div className="stat-card">
          <span className="stat-accent green" />
          <div>
            <div className="stat-label">Payments Made</div>
            <div className="stat-value">{recentPayments?.length ?? 0}</div>
          </div>
        </div>
      </div>

      <div className="grid-2">
        {/* Children */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">My Children</h3>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/parent/children')}>
              View all
            </button>
          </div>
          {!children?.length ? (
            <div className="empty-state"><p>No children linked. Contact the school admin.</p></div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {children.map(c => {
                const initials = c.full_name.split(' ').map(n=>n[0]).slice(0,2).join('').toUpperCase()
                const photoUrl = c.profile_picture ? `${API_BASE}${c.profile_picture}` : null
                return (
                  <div key={c.id} style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '10px 12px', background: 'var(--gray-50)',
                    borderRadius: 'var(--radius-sm)', border: '1px solid var(--gray-200)'
                  }}>
                    <div style={{
                      width: 40, height: 40, borderRadius: '50%',
                      background: 'var(--primary)', display: 'flex',
                      alignItems: 'center', justifyContent: 'center',
                      color: '#fff', fontWeight: 700, fontSize: 14, flexShrink: 0,
                      overflow: 'hidden'
                    }}>
                      {photoUrl
                        ? <img src={photoUrl} alt={c.full_name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        : initials
                      }
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>{c.full_name}</div>
                      <div style={{ fontSize: 12, color: 'var(--gray-500)' }}>
                        {c.class_name || '—'} &nbsp;·&nbsp; {c.admission_number}
                      </div>
                    </div>
                    <span className="badge badge-gray">{c.relationship}</span>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Recent payments */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Recent Payments</h3>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/parent/receipts')}>
              View all
            </button>
          </div>
          {!recentPayments?.length ? (
            <div className="empty-state"><p>No payments yet.</p></div>
          ) : (
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr><th>Student</th><th>Amount</th><th>Status</th></tr>
                </thead>
                <tbody>
                  {recentPayments.map(p => (
                    <tr key={p.id}>
                      <td style={{ fontWeight: 500 }}>{p.student_name}</td>
                      <td>₦{Number(p.amount).toLocaleString()}</td>
                      <td>
                        <span className={`badge ${
                          p.status === 'approved' ? 'badge-green' :
                          p.status === 'rejected' ? 'badge-red'   : 'badge-yellow'
                        }`}>
                          {p.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Quick actions */}
      <div className="card" style={{ marginTop: 20 }}>
        <div className="card-header"><h3 className="card-title">Quick Actions</h3></div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button className="btn btn-primary"   onClick={() => navigate('/parent/fees')}>View School Fees</button>
          <button className="btn btn-secondary" onClick={() => navigate('/parent/children')}>View Children</button>
          <button className="btn btn-secondary" onClick={() => navigate('/parent/receipts')}>My Receipts</button>
        </div>
      </div>
    </Layout>
  )
}
