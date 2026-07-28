import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../../components/layout/Layout'
import api from '../../utils/api'
import toast from 'react-hot-toast'

export default function AdminDashboard() {
  const [data, setData]     = useState(null)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    api.get('/dashboard/admin')
      .then(res => setData(res.data))
      .catch(() => toast.error('Failed to load dashboard'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <Layout title="Dashboard">
      <div style={{ padding: 40, color: 'var(--gray-400)', textAlign: 'center' }}>Loading...</div>
    </Layout>
  )

  const { stats, recentStudents, classBreakdown } = data || {}

  const statCards = [
    { label: 'Total Students',    value: stats?.totalStudents    ?? 0, accent: 'blue',   href: '/admin/students' },
    { label: 'Total Teachers',    value: stats?.totalTeachers    ?? 0, accent: 'green',  href: '/admin/teachers' },
    { label: 'Total Classes',     value: stats?.totalClasses     ?? 0, accent: 'yellow', href: '/admin/classes'  },
    { label: 'Total Subjects',    value: stats?.totalSubjects    ?? 0, accent: 'purple', href: '/admin/subjects' },
    { label: 'Published Results', value: stats?.publishedResults ?? 0, accent: 'red',    href: '/admin/results'  },
  ]

  return (
    <Layout title="Dashboard">
      <div className="page-header">
        <div>
          <h1>Overview</h1>
          <p>Qiblah Heights College — Academic Management</p>
        </div>
      </div>

      <div className="stats-grid">
        {statCards.map(s => (
          <div
            className="stat-card"
            key={s.label}
            onClick={() => navigate(s.href)}
            style={{ cursor: 'pointer', transition: 'box-shadow 0.15s' }}
            onMouseEnter={e => e.currentTarget.style.boxShadow = 'var(--shadow-md)'}
            onMouseLeave={e => e.currentTarget.style.boxShadow = ''}
          >
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <span className={`stat-accent ${s.accent}`} />
              <div>
                <div className="stat-label">{s.label}</div>
                <div className="stat-value">{s.value}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid-2">
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Recently Added Students</h3>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/admin/students')}>View all</button>
          </div>
          {!recentStudents?.length ? (
            <div className="empty-state"><p>No students added yet.</p></div>
          ) : (
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr><th>Name</th><th>Admission No.</th><th>Class</th></tr>
                </thead>
                <tbody>
                  {recentStudents.map((s, i) => (
                    <tr key={i}>
                      <td style={{ fontWeight: 500 }}>{s.full_name}</td>
                      <td><span className="badge badge-gray">{s.admission_number}</span></td>
                      <td>{s.class_name || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Students per Class</h3>
          </div>
          {!classBreakdown?.length ? (
            <div className="empty-state"><p>No classes yet.</p></div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {classBreakdown.map(c => (
                <div key={c.name}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                    <span style={{ fontSize: 13, fontWeight: 500 }}>{c.name}</span>
                    <span className="text-muted text-sm">{c.student_count} students</span>
                  </div>
                  <div className="breakdown-bar">
                    <div
                      className="breakdown-bar-fill"
                      style={{ width: `${Math.min(100, (c.student_count / Math.max(1, stats?.totalStudents)) * 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="card" style={{ marginTop: 20 }}>
        <div className="card-header">
          <h3 className="card-title">Quick Actions</h3>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button className="btn btn-primary"    onClick={() => navigate('/admin/students')}>Add Student</button>
          <button className="btn btn-secondary"  onClick={() => navigate('/admin/classes')}>Manage Classes</button>
          <button className="btn btn-secondary"  onClick={() => navigate('/admin/subjects')}>Manage Subjects</button>
          <button className="btn btn-secondary"  onClick={() => navigate('/teacher/scores')}>Enter Scores</button>
          <button className="btn btn-success"    onClick={() => navigate('/admin/results')}>Publish Results</button>
        </div>
      </div>
    </Layout>
  )
}
