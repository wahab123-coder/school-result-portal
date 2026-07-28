import { useState, useEffect } from 'react'
import Layout from '../../components/layout/Layout'
import api from '../../utils/api'
import toast from 'react-hot-toast'

const TERMS = ['First Term', 'Second Term', 'Third Term']

function computeGrade(total) {
  if (total >= 70) return 'A'
  if (total >= 60) return 'B'
  if (total >= 50) return 'C'
  if (total >= 45) return 'D'
  if (total >= 40) return 'E'
  return 'F'
}

export default function ScoreEntryPage() {
  const [classes, setClasses]     = useState([])
  const [subjects, setSubjects]   = useState([])
  const [sessions, setSessions]   = useState([])
  const [scoreRows, setScoreRows] = useState([])
  const [filters, setFilters]     = useState({ class_id: '', subject_id: '', session_id: '', term: 'First Term' })
  const [loadingStudents, setLoadingStudents] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    Promise.all([api.get('/classes'), api.get('/subjects'), api.get('/results/sessions/all')])
      .then(([c, s, ses]) => {
        setClasses(c.data); setSubjects(s.data); setSessions(ses.data)
        const curr = ses.data.find(x => x.is_current)
        if (curr) setFilters(f => ({ ...f, session_id: String(curr.id) }))
      })
  }, [])

  // Load students when class changes
  useEffect(() => {
    if (!filters.class_id) { setScoreRows([]); return }
    setLoadingStudents(true)
    api.get('/students', { params: { class_id: filters.class_id } })
      .then(res => setScoreRows(res.data.map(s => ({
        student_id: s.id,
        student_name: s.full_name,
        admission_number: s.admission_number,
        ca1: '', ca2: '', exam: ''
      }))))
      .catch(() => toast.error('Failed to load students'))
      .finally(() => setLoadingStudents(false))
  }, [filters.class_id])

  // Pre-fill existing scores when subject/session/term changes
  useEffect(() => {
    if (!filters.class_id || !filters.subject_id || !filters.session_id || !filters.term) return
    api.get('/scores', {
      params: {
        class_id:   filters.class_id,
        subject_id: filters.subject_id,
        session_id: filters.session_id,
        term:       filters.term
      }
    }).then(res => {
      const map = {}
      res.data.forEach(r => { map[r.student_id] = r })
      setScoreRows(prev => prev.map(r => {
        const ex = map[r.student_id]
        return ex ? { ...r, ca1: ex.ca1, ca2: ex.ca2, exam: ex.exam } : r
      }))
    })
  }, [filters.subject_id, filters.session_id, filters.term, filters.class_id])

  const updateRow = (i, field, value) => setScoreRows(prev => {
    const rows = [...prev]
    rows[i] = { ...rows[i], [field]: value }
    return rows
  })

  const handleSave = async () => {
    if (!filters.class_id || !filters.subject_id || !filters.session_id || !filters.term)
      return toast.error('Please complete all filter selections before saving')

    setSaving(true)
    try {
      const res = await api.post('/scores/bulk', {
        class_id:   filters.class_id,
        subject_id: filters.subject_id,
        session_id: filters.session_id,
        term:       filters.term,
        scores: scoreRows
          .filter(r => r.ca1 !== '' || r.ca2 !== '' || r.exam !== '')
          .map(r => ({
            student_id: r.student_id,
            ca1:  Number(r.ca1)  || 0,
            ca2:  Number(r.ca2)  || 0,
            exam: Number(r.exam) || 0,
          }))
      })
      toast.success(res.data.message)
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to save scores')
    } finally {
      setSaving(false)
    }
  }

  const currentClass = classes.find(c => c.id == filters.class_id)

  return (
    <Layout title="Score Entry">
      <div className="page-header">
        <div>
          <h1>Score Entry</h1>
          <p>Enter or update student scores for a class and subject</p>
        </div>
      </div>

      {/* Filters */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-header" style={{ marginBottom: 14 }}>
          <h3 className="card-title">Select Class, Subject and Term</h3>
        </div>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          {[
            { label: 'Class',   key: 'class_id',   opts: classes.map(c  => ({ v: c.id,  l: c.name })) },
            { label: 'Subject', key: 'subject_id', opts: subjects.map(s => ({ v: s.id,  l: `${s.code} — ${s.name}` })) },
            { label: 'Session', key: 'session_id', opts: sessions.map(s => ({ v: s.id,  l: s.name + (s.is_current ? ' (Current)' : '') })) },
          ].map(({ label, key, opts }) => (
            <div key={key} className="form-group" style={{ margin: 0, flex: 1, minWidth: 150 }}>
              <label className="form-label">{label}</label>
              <select className="form-control" value={filters[key]}
                onChange={e => setFilters(f => ({ ...f, [key]: e.target.value }))}>
                <option value="">— Select {label} —</option>
                {opts.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
              </select>
            </div>
          ))}
          <div className="form-group" style={{ margin: 0, flex: 1, minWidth: 150 }}>
            <label className="form-label">Term</label>
            <select className="form-control" value={filters.term}
              onChange={e => setFilters(f => ({ ...f, term: e.target.value }))}>
              {TERMS.map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Score breakdown banner */}
      <div className="info-banner">
        {[
          { lbl: '1st CA',  val: '/ 20' },
          { lbl: '2nd CA',  val: '/ 20' },
          { lbl: 'Exam',    val: '/ 60' },
          { lbl: 'Total',   val: '/ 100' },
        ].map(x => (
          <div className="info-banner-item" key={x.lbl}>
            <div className="lbl">{x.lbl}</div>
            <div className="val">{x.val}</div>
          </div>
        ))}
      </div>

      {/* Score table */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">
            Student Scores
            {currentClass && (
              <span className="text-muted" style={{ fontWeight: 400, marginLeft: 6 }}>
                — {currentClass.name}
              </span>
            )}
          </h3>
          <button
            className="btn btn-primary btn-sm"
            onClick={handleSave}
            disabled={saving || scoreRows.length === 0}
          >
            {saving ? 'Saving...' : 'Save All Scores'}
          </button>
        </div>

        {loadingStudents ? (
          <div className="empty-state"><p>Loading students...</p></div>
        ) : scoreRows.length === 0 ? (
          <div className="empty-state">
            <p className="empty-state-title">No students loaded</p>
            <p>Select a class above to load the student list.</p>
          </div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Student Name</th>
                  <th>Admission No.</th>
                  <th>1st CA <span style={{ fontWeight: 400 }}>(20)</span></th>
                  <th>2nd CA <span style={{ fontWeight: 400 }}>(20)</span></th>
                  <th>Exam <span style={{ fontWeight: 400 }}>(60)</span></th>
                  <th>Total</th>
                  <th>Grade</th>
                </tr>
              </thead>
              <tbody>
                {scoreRows.map((row, i) => {
                  const total = (Number(row.ca1)||0) + (Number(row.ca2)||0) + (Number(row.exam)||0)
                  const grade = computeGrade(total)
                  const hasScore = row.ca1 !== '' || row.ca2 !== '' || row.exam !== ''
                  return (
                    <tr key={row.student_id}>
                      <td className="text-muted text-sm">{i + 1}</td>
                      <td style={{ fontWeight: 500 }}>{row.student_name}</td>
                      <td><span className="badge badge-gray">{row.admission_number}</span></td>

                      <td>
                        <input type="number" className="score-input"
                          value={row.ca1} min={0} max={20}
                          onChange={e => updateRow(i, 'ca1', e.target.value)}
                          placeholder="0" />
                      </td>
                      <td>
                        <input type="number" className="score-input"
                          value={row.ca2} min={0} max={20}
                          onChange={e => updateRow(i, 'ca2', e.target.value)}
                          placeholder="0" />
                      </td>
                      <td>
                        <input type="number" className="score-input"
                          value={row.exam} min={0} max={60}
                          onChange={e => updateRow(i, 'exam', e.target.value)}
                          placeholder="0" />
                      </td>

                      <td className="score-total">{hasScore ? total : '—'}</td>
                      <td>
                        {hasScore && <span className={`grade-${grade}`}>{grade}</span>}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Layout>
  )
}
