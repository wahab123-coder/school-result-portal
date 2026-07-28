import { useState, useEffect, useRef } from 'react'
import { useReactToPrint } from 'react-to-print'
import Layout from '../../components/layout/Layout'
import api from '../../utils/api'
import toast from 'react-hot-toast'

const TERMS = ['First Term', 'Second Term', 'Third Term']
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000'

function ordinal(n) {
  if (!n) return '—'
  const s = ['th','st','nd','rd'], v = n % 100
  return n + (s[(v-20)%10] || s[v] || s[0])
}

function gradeColor(grade) {
  const map = { A:'#057a55', B:'#1a56db', C:'#0891b2', D:'#c27803', E:'#c05621', F:'#c81e1e' }
  return map[grade] || '#374151'
}

export default function StudentResultPage() {
  const [sessions, setSessions] = useState([])
  const [student, setStudent]   = useState(null)
  const [result, setResult]     = useState(null)
  const [filters, setFilters]   = useState({ session_id: '', term: 'First Term' })
  const [loading, setLoading]   = useState(false)
  const [fetched, setFetched]   = useState(false)
  const printRef = useRef()

  useEffect(() => {
    Promise.all([api.get('/results/sessions/all'), api.get('/students/me/profile')])
      .then(([ses, stu]) => {
        setSessions(ses.data); setStudent(stu.data)
        const curr = ses.data.find(x => x.is_current)
        if (curr) setFilters(f => ({ ...f, session_id: String(curr.id) }))
      }).catch(() => toast.error('Failed to load page data'))
  }, [])

  const fetchResult = async () => {
    if (!student || !filters.session_id || !filters.term)
      return toast.error('Please select a session and term')
    setLoading(true); setFetched(false)
    try {
      const res = await api.get(`/results/student/${student.id}`, { params: filters })
      setResult(res.data); setFetched(true)
    } catch (err) {
      if (err.response?.status === 403) toast.error('Results for this term have not been published yet.')
      else if (err.response?.status === 404) toast.error('No result found for this selection.')
      else toast.error('Failed to load result')
      setResult(null); setFetched(true)
    } finally { setLoading(false) }
  }

  const handlePrint = useReactToPrint({
    content: () => printRef.current,
    documentTitle: `Result_${student?.admission_number}_${filters.term?.replace(/\s/g,'_')}`
  })

  const photoUrl = student?.profile_picture
    ? `${API_BASE}${student.profile_picture}`
    : null

  return (
    <Layout title="My Results">
      <div className="page-header">
        <div><h1>My Results</h1><p>View and print your academic report card</p></div>
      </div>

      {/* Selector */}
      <div className="card no-print" style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div className="form-group" style={{ margin: 0, flex: 1, minWidth: 180 }}>
            <label className="form-label">Academic Session</label>
            <select className="form-control" value={filters.session_id}
              onChange={e => setFilters(f => ({ ...f, session_id: e.target.value }))}>
              <option value="">— Select Session —</option>
              {sessions.map(s => <option key={s.id} value={s.id}>{s.name}{s.is_current ? ' (Current)' : ''}</option>)}
            </select>
          </div>
          <div className="form-group" style={{ margin: 0, flex: 1, minWidth: 180 }}>
            <label className="form-label">Term</label>
            <select className="form-control" value={filters.term}
              onChange={e => setFilters(f => ({ ...f, term: e.target.value }))}>
              {TERMS.map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
          <button className="btn btn-primary" onClick={fetchResult} disabled={loading}>
            {loading ? 'Loading...' : 'View Result'}
          </button>
          {result && (
            <button className="btn btn-secondary" onClick={handlePrint}>
              Print / Save PDF
            </button>
          )}
        </div>
      </div>

      {fetched && !result && (
        <div className="card">
          <div className="empty-state">
            <p className="empty-state-title">No result found</p>
            <p>Scores may not have been entered or results are not yet published.</p>
          </div>
        </div>
      )}

      {result && (
        <div ref={printRef} className="result-sheet">

          {/* ── School Header ── */}
          <div style={{
            background: 'var(--primary)', color: '#fff',
            padding: '20px 32px', display: 'flex',
            alignItems: 'center', justifyContent: 'space-between', gap: 20
          }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', opacity: 0.8, marginBottom: 4 }}>
                Official Report Card
              </div>
              <h1 style={{ fontSize: 22, fontWeight: 800, letterSpacing: '0.02em', textTransform: 'uppercase', margin: 0 }}>
                QIBLAH HEIGHTS COLLEGE
              </h1>
              <p style={{ fontSize: 13, opacity: 0.85, marginTop: 4 }}>
                Student Academic Report Card &nbsp;|&nbsp; {result.session_name} &nbsp;|&nbsp; {result.term}
              </p>
            </div>
            {/* Passport photo */}
            <div style={{
              width: 80, height: 90, borderRadius: 4,
              border: '3px solid rgba(255,255,255,0.4)',
              overflow: 'hidden', flexShrink: 0,
              background: 'rgba(255,255,255,0.15)',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              {photoUrl ? (
                <img src={photoUrl} alt="passport"
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <div style={{
                  width: '100%', height: '100%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 26, fontWeight: 700, color: 'rgba(255,255,255,0.7)'
                }}>
                  {result.student_name?.split(' ').map(n=>n[0]).slice(0,2).join('')}
                </div>
              )}
            </div>
          </div>

          {/* ── Student Info ── */}
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(155px,1fr))',
            background: 'var(--gray-50)', borderBottom: '1px solid var(--gray-200)'
          }}>
            {[
              { label: 'Student Name',   value: result.student_name },
              { label: 'Admission No.',  value: result.admission_number },
              { label: 'Class',          value: result.class_name },
              { label: 'Session',        value: result.session_name },
              { label: 'Term',           value: result.term },
            ].map(item => (
              <div key={item.label} style={{ padding: '12px 20px', borderRight: '1px solid var(--gray-200)' }}>
                <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--gray-500)' }}>
                  {item.label}
                </div>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--gray-800)', marginTop: 3 }}>
                  {item.value}
                </div>
              </div>
            ))}
          </div>

          {/* ── Scores Table ── */}
          <div style={{ padding: '20px 24px' }}>
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th style={{ width: 40 }}>S/N</th>
                    <th>Subject</th>
                    <th>1st CA (30)</th>
                    <th>2nd CA (30)</th>
                    <th>Exam (40)</th>
                    <th>Total (100)</th>
                    <th>Grade</th>
                    <th>Remark</th>
                  </tr>
                </thead>
                <tbody>
                  {result.scores?.map((s, i) => (
                    <tr key={s.id}>
                      <td style={{ color: 'var(--gray-400)', fontSize: 12 }}>{i + 1}</td>
                      <td style={{ fontWeight: 600 }}>{s.subject_name}</td>
                      <td>{s.ca1}</td>
                      <td>{s.ca2}</td>
                      <td>{s.exam}</td>
                      <td style={{ fontWeight: 700 }}>{s.total}</td>
                      <td><span style={{ fontWeight: 700, color: gradeColor(s.grade) }}>{s.grade}</span></td>
                      <td style={{ color: 'var(--gray-500)', fontSize: 12 }}>{s.remark}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* ── Summary Row ── */}
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)',
            borderTop: '2px solid var(--gray-200)', borderBottom: '2px solid var(--gray-200)',
            background: 'var(--gray-50)'
          }}>
            {[
              { label: 'Total Score',     value: result.total_score?.toFixed(1) },
              { label: 'Average',         value: `${result.average?.toFixed(2)}%` },
              { label: 'Position',        value: ordinal(result.position) },
              { label: 'Out of',          value: `${result.class_size} students` },
              { label: 'No. of Subjects', value: result.scores?.length },
            ].map(item => (
              <div key={item.label} style={{ textAlign: 'center', padding: '14px 8px', borderRight: '1px solid var(--gray-200)' }}>
                <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--gray-500)' }}>
                  {item.label}
                </div>
                <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--gray-900)', marginTop: 6 }}>
                  {item.value}
                </div>
              </div>
            ))}
          </div>

          {/* ── Remarks + Stamp ── */}
          <div style={{ padding: '20px 24px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>

              {/* Teacher remark */}
              <div style={{ background: 'var(--gray-50)', borderRadius: 6, padding: '14px 16px', borderTop: '3px solid var(--primary)' }}>
                <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--gray-500)', marginBottom: 8 }}>
                  Class Teacher's Comment
                </div>
                <p style={{ fontSize: 13.5, color: 'var(--gray-700)', minHeight: 40, fontStyle: 'italic' }}>
                  {result.teacher_remark || 'Keep up the good work.'}
                </p>
                <div style={{ marginTop: 16, borderTop: '1px solid var(--gray-300)', paddingTop: 10 }}>
                  <div style={{ fontSize: 10, color: 'var(--gray-400)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Signature</div>
                  <div style={{ height: 30 }} />
                  <div style={{ borderTop: '1px solid var(--gray-400)', paddingTop: 4, fontSize: 11, color: 'var(--gray-500)' }}>Class Teacher</div>
                </div>
              </div>

              {/* Principal remark */}
              <div style={{ background: 'var(--gray-50)', borderRadius: 6, padding: '14px 16px', borderTop: '3px solid #057a55' }}>
                <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--gray-500)', marginBottom: 8 }}>
                  Principal's Comment
                </div>
                <p style={{ fontSize: 13.5, color: 'var(--gray-700)', minHeight: 40, fontStyle: 'italic' }}>
                  {result.principal_remark || 'Satisfactory performance.'}
                </p>
                <div style={{ marginTop: 16, borderTop: '1px solid var(--gray-300)', paddingTop: 10 }}>
                  <div style={{ fontSize: 10, color: 'var(--gray-400)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Signature</div>
                  <div style={{ height: 30 }} />
                  <div style={{ borderTop: '1px solid var(--gray-400)', paddingTop: 4, fontSize: 11, color: 'var(--gray-500)' }}>Principal</div>
                </div>
              </div>

              {/* School stamp */}
              <div style={{ background: 'var(--gray-50)', borderRadius: 6, padding: '14px 16px', borderTop: '3px solid var(--warning)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--gray-500)', marginBottom: 12, alignSelf: 'flex-start' }}>
                  School Stamp
                </div>
                <div style={{
                  width: 100, height: 100, borderRadius: '50%',
                  border: '3px double var(--primary)',
                  display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center',
                  padding: 10, textAlign: 'center'
                }}>
                  <div style={{ fontSize: 8, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--primary)', lineHeight: 1.3 }}>
                    QIBLAH<br />HEIGHTS<br />COLLEGE
                  </div>
                  <div style={{ width: 50, height: 1, background: 'var(--primary)', margin: '4px 0' }} />
                  <div style={{ fontSize: 7, color: 'var(--gray-500)', textTransform: 'uppercase' }}>Official Seal</div>
                </div>
              </div>

            </div>
          </div>

          {/* ── Grade Key ── */}
          <div style={{ padding: '12px 24px 20px', borderTop: '1px solid var(--gray-100)' }}>
            <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--gray-500)', marginBottom: 8 }}>
              Grading Scale
            </div>
            <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
              {[
                { r: '70–100', g: 'A', rem: 'Excellent' },
                { r: '60–69',  g: 'B', rem: 'Very Good' },
                { r: '50–59',  g: 'C', rem: 'Good'      },
                { r: '45–49',  g: 'D', rem: 'Fair'      },
                { r: '40–44',  g: 'E', rem: 'Pass'      },
                { r: '0–39',   g: 'F', rem: 'Fail'      },
              ].map(x => (
                <span key={x.g} style={{ fontSize: 12, color: 'var(--gray-600)' }}>
                  <span style={{ fontWeight: 700, color: gradeColor(x.g) }}>{x.g}</span>: {x.r} ({x.rem})
                </span>
              ))}
            </div>
          </div>

        </div>
      )}
    </Layout>
  )
}
