import { useState, useEffect } from 'react'
import Layout from '../../components/layout/Layout'
import api from '../../utils/api'
import toast from 'react-hot-toast'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000'
const TERMS    = ['First Term', 'Second Term', 'Third Term']

export default function ParentChildrenPage() {
  const [profile, setProfile]   = useState(null)
  const [sessions, setSessions] = useState([])
  const [selected, setSelected] = useState(null) // { child, session_id, term }
  const [result, setResult]     = useState(null)
  const [loadingResult, setLoadingResult] = useState(false)
  const [loading, setLoading]   = useState(true)

  useEffect(() => {
    Promise.all([api.get('/parents/me'), api.get('/results/sessions/all')])
      .then(([p, s]) => {
        setProfile(p.data)
        setSessions(s.data)
        const curr = s.data.find(x => x.is_current)
        if (p.data.children?.length) {
          setSelected({
            child: p.data.children[0],
            session_id: curr ? String(curr.id) : '',
            term: 'First Term'
          })
        }
      })
      .catch(() => toast.error('Failed to load data'))
      .finally(() => setLoading(false))
  }, [])

  const viewResult = async () => {
    if (!selected?.child || !selected.session_id || !selected.term) return
    setLoadingResult(true)
    setResult(null)
    try {
      const res = await api.get(`/results/student/${selected.child.id}`, {
        params: { session_id: selected.session_id, term: selected.term }
      })
      setResult(res.data)
    } catch (err) {
      if (err.response?.status === 403) toast.error('Results not published yet.')
      else if (err.response?.status === 404) toast.error('No result found for this selection.')
      else toast.error('Failed to load result')
    } finally {
      setLoadingResult(false)
    }
  }

  if (loading) return (
    <Layout title="My Children">
      <div style={{ padding: 40, textAlign: 'center', color: 'var(--gray-400)' }}>Loading...</div>
    </Layout>
  )

  const children = profile?.children || []

  return (
    <Layout title="My Children">
      <div className="page-header">
        <div><h1>My Children</h1><p>{children.length} child{children.length !== 1 ? 'ren' : ''} linked to your account</p></div>
      </div>

      {!children.length ? (
        <div className="card">
          <div className="empty-state">
            <p className="empty-state-title">No children linked</p>
            <p>Contact the school administrator to link your children to this account.</p>
          </div>
        </div>
      ) : (
        <>
          {/* Children cards */}
          <div className="grid-2" style={{ marginBottom: 20 }}>
            {children.map(child => {
              const initials = child.full_name.split(' ').map(n=>n[0]).slice(0,2).join('').toUpperCase()
              const photoUrl = child.profile_picture ? `${API_BASE}${child.profile_picture}` : null
              const isActive = selected?.child?.id === child.id
              return (
                <div
                  key={child.id}
                  className="card"
                  style={{ cursor: 'pointer', borderColor: isActive ? 'var(--primary)' : 'var(--gray-200)', borderWidth: isActive ? 2 : 1 }}
                  onClick={() => setSelected(s => ({ ...s, child }))}
                >
                  <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
                    <div style={{
                      width: 56, height: 60, borderRadius: 6, flexShrink: 0,
                      background: 'var(--primary)', display: 'flex',
                      alignItems: 'center', justifyContent: 'center',
                      color: '#fff', fontWeight: 700, fontSize: 18,
                      overflow: 'hidden'
                    }}>
                      {photoUrl
                        ? <img src={photoUrl} alt={child.full_name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        : initials
                      }
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 15 }}>{child.full_name}</div>
                      <div style={{ fontSize: 12, color: 'var(--gray-500)', marginTop: 3 }}>
                        {child.admission_number} &nbsp;·&nbsp; {child.class_name || '—'}
                      </div>
                      <span className="badge badge-gray" style={{ marginTop: 6 }}>{child.relationship}</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Result viewer */}
          {selected?.child && (
            <div className="card" style={{ marginBottom: 20 }}>
              <div className="card-header">
                <h3 className="card-title">View Result — {selected.child.full_name}</h3>
              </div>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
                <div className="form-group" style={{ margin: 0, flex: 1, minWidth: 160 }}>
                  <label className="form-label">Session</label>
                  <select className="form-control" value={selected.session_id}
                    onChange={e => setSelected(s => ({ ...s, session_id: e.target.value }))}>
                    <option value="">— Select —</option>
                    {sessions.map(s => <option key={s.id} value={s.id}>{s.name}{s.is_current ? ' (Current)' : ''}</option>)}
                  </select>
                </div>
                <div className="form-group" style={{ margin: 0, flex: 1, minWidth: 160 }}>
                  <label className="form-label">Term</label>
                  <select className="form-control" value={selected.term}
                    onChange={e => setSelected(s => ({ ...s, term: e.target.value }))}>
                    {TERMS.map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <button className="btn btn-primary" onClick={viewResult} disabled={loadingResult}>
                  {loadingResult ? 'Loading...' : 'View Result'}
                </button>
              </div>

              {result && (
                <div style={{ marginTop: 20 }}>
                  <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', marginBottom: 16, padding: '12px 16px', background: 'var(--primary-light)', borderRadius: 'var(--radius-sm)', border: '1px solid #c3ddfd' }}>
                    <div><div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: 'var(--primary)' }}>Average</div><div style={{ fontSize: 22, fontWeight: 800, color: 'var(--primary-dark)' }}>{result.average?.toFixed(2)}%</div></div>
                    <div><div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: 'var(--primary)' }}>Position</div><div style={{ fontSize: 22, fontWeight: 800, color: 'var(--primary-dark)' }}>{result.position}</div></div>
                    <div><div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: 'var(--primary)' }}>Out of</div><div style={{ fontSize: 22, fontWeight: 800, color: 'var(--primary-dark)' }}>{result.class_size}</div></div>
                    <div><div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: 'var(--primary)' }}>Total Score</div><div style={{ fontSize: 22, fontWeight: 800, color: 'var(--primary-dark)' }}>{result.total_score?.toFixed(1)}</div></div>
                  </div>
                  <div className="table-wrapper">
                    <table>
                      <thead>
                        <tr><th>Subject</th><th>1st CA</th><th>2nd CA</th><th>Exam</th><th>Total</th><th>Grade</th></tr>
                      </thead>
                      <tbody>
                        {result.scores?.map(s => (
                          <tr key={s.id}>
                            <td style={{ fontWeight: 500 }}>{s.subject_name}</td>
                            <td>{s.ca1}</td><td>{s.ca2}</td><td>{s.exam}</td>
                            <td style={{ fontWeight: 700 }}>{s.total}</td>
                            <td><span style={{ fontWeight: 700, color: s.grade === 'A' ? 'var(--success)' : s.grade === 'F' ? 'var(--danger)' : 'var(--primary)' }}>{s.grade}</span></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </Layout>
  )
}
