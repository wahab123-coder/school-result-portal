import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Layout from '../../components/layout/Layout'
import api from '../../utils/api'
import toast from 'react-hot-toast'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000'

export default function StudentProfileView() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [student, setStudent]   = useState(null)
  const [results, setResults]   = useState([])
  const [sessions, setSessions] = useState([])
  const [loading, setLoading]   = useState(true)

  useEffect(() => {
    Promise.all([
      api.get(`/students/${id}`),
      api.get('/results/sessions/all')
    ]).then(async ([stuRes, sesRes]) => {
      setStudent(stuRes.data)
      setSessions(sesRes.data)

      // Load all published results for this student
      const allResults = []
      for (const ses of sesRes.data) {
        for (const term of ['First Term', 'Second Term', 'Third Term']) {
          try {
            const r = await api.get(`/results/student/${id}`, {
              params: { session_id: ses.id, term }
            })
            if (r.data) allResults.push(r.data)
          } catch (_) {}
        }
      }
      setResults(allResults)
    }).catch(() => toast.error('Failed to load student profile'))
      .finally(() => setLoading(false))
  }, [id])

  const photoUrl = student?.profile_picture
    ? `${API_BASE}${student.profile_picture}`
    : null

  const initials = student?.full_name
    ?.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase() || 'S'

  if (loading) return (
    <Layout title="Student Profile">
      <div style={{ padding: 40, textAlign: 'center', color: 'var(--gray-400)' }}>Loading...</div>
    </Layout>
  )

  if (!student) return (
    <Layout title="Student Profile">
      <div className="empty-state"><p>Student not found.</p></div>
    </Layout>
  )

  return (
    <Layout title="Student Profile">
      <div className="page-header">
        <div>
          <h1>Student Profile</h1>
          <p>Viewing academic record for {student.full_name}</p>
        </div>
        <button className="btn btn-secondary" onClick={() => navigate('/admin/students')}>
          Back to Students
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: 20, alignItems: 'start' }}>

        {/* ── Left: Passport ── */}
        <div className="card" style={{ textAlign: 'center' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
            {/* Photo */}
            <div style={{
              width: 100, height: 110, borderRadius: 6,
              border: '3px solid var(--gray-200)', overflow: 'hidden',
              background: 'var(--primary)', display: 'flex',
              alignItems: 'center', justifyContent: 'center'
            }}>
              {photoUrl
                ? <img src={photoUrl} alt={student.full_name}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : <span style={{ fontSize: 30, fontWeight: 700, color: '#fff' }}>{initials}</span>
              }
            </div>

            <div>
              <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--gray-900)' }}>{student.full_name}</div>
              <div style={{ fontSize: 12, color: 'var(--gray-500)', marginTop: 4 }}>{student.admission_number}</div>
              <span className="badge badge-blue" style={{ marginTop: 6 }}>{student.class_name || 'No class'}</span>
            </div>
          </div>

          <div className="divider" />

          <div style={{ textAlign: 'left', display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[
              { lbl: 'Gender',       val: student.gender        || '—' },
              { lbl: 'Date of Birth', val: student.date_of_birth || '—' },
              { lbl: 'Parent Phone', val: student.parent_phone  || '—' },
              { lbl: 'Username',     val: student.username       || '—' },
            ].map(item => (
              <div key={item.lbl}>
                <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--gray-400)', marginBottom: 2 }}>
                  {item.lbl}
                </div>
                <div style={{ fontSize: 13.5, fontWeight: 500, color: 'var(--gray-700)' }}>{item.val}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Right: Results ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Summary stats */}
          {results.length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16 }}>
              {[
                { label: 'Terms on Record', value: results.length },
                { label: 'Best Average',    value: `${Math.max(...results.map(r => r.average||0)).toFixed(1)}%` },
                { label: 'Best Position',   value: Math.min(...results.map(r => r.position||999)) },
              ].map(s => (
                <div className="stat-card" key={s.label}>
                  <div>
                    <div className="stat-label">{s.label}</div>
                    <div className="stat-value" style={{ fontSize: 22 }}>{s.value}</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Result history */}
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Academic Results</h3>
            </div>
            {results.length === 0 ? (
              <div className="empty-state">
                <p className="empty-state-title">No results found</p>
                <p>No published results for this student yet.</p>
              </div>
            ) : (
              results.map((r, i) => (
                <div key={i} style={{ marginBottom: i < results.length - 1 ? 24 : 0 }}>
                  {/* Term header */}
                  <div style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '8px 12px', background: 'var(--primary-light)',
                    borderRadius: 'var(--radius-sm)', marginBottom: 10,
                    border: '1px solid #c3ddfd'
                  }}>
                    <span style={{ fontWeight: 600, fontSize: 13, color: 'var(--primary-dark)' }}>
                      {r.session_name} — {r.term}
                    </span>
                    <div style={{ display: 'flex', gap: 12, fontSize: 12 }}>
                      <span>Average: <strong>{r.average?.toFixed(2)}%</strong></span>
                      <span>Position: <strong>{r.position}</strong></span>
                      <span>Out of: <strong>{r.class_size}</strong></span>
                    </div>
                  </div>

                  {/* Scores */}
                  {r.scores?.length > 0 && (
                    <div className="table-wrapper">
                      <table>
                        <thead>
                          <tr>
                            <th>Subject</th>
                            <th>1st CA (20)</th>
                            <th>2nd CA (20)</th>
                            <th>Exam (60)</th>
                            <th>Total</th>
                            <th>Grade</th>
                          </tr>
                        </thead>
                        <tbody>
                          {r.scores.map(s => (
                            <tr key={s.id}>
                              <td style={{ fontWeight: 500 }}>{s.subject_name}</td>
                              <td>{s.ca1}</td>
                              <td>{s.ca2}</td>
                              <td>{s.exam}</td>
                              <td style={{ fontWeight: 700 }}>{s.total}</td>
                              <td>
                                <span style={{
                                  fontWeight: 700,
                                  color: s.grade === 'A' ? '#057a55' : s.grade === 'F' ? '#c81e1e' : 'var(--primary)'
                                }}>
                                  {s.grade}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </Layout>
  )
}
