import { useState, useEffect } from 'react'
import Layout from '../../components/layout/Layout'
import api from '../../utils/api'
import toast from 'react-hot-toast'

const TERMS = ['First Term', 'Second Term', 'Third Term']

export default function ResultsManagePage() {
  const [classes, setClasses]       = useState([])
  const [sessions, setSessions]     = useState([])
  const [results, setResults]       = useState([])
  const [filters, setFilters]       = useState({ class_id: '', session_id: '', term: 'First Term' })
  const [loading, setLoading]       = useState(false)
  const [computing, setComputing]   = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [newSession, setNewSession] = useState('')
  const [showSessionModal, setShowSessionModal] = useState(false)
  const [remarkModal, setRemarkModal] = useState(null) // { result }
  const [remarkForm, setRemarkForm]   = useState({ teacher_remark: '', principal_remark: '' })
  const [savingRemark, setSavingRemark] = useState(false)

  useEffect(() => {
    Promise.all([api.get('/classes'), api.get('/results/sessions/all')])
      .then(([c, s]) => {
        setClasses(c.data); setSessions(s.data)
        const curr = s.data.find(x => x.is_current)
        if (curr) setFilters(f => ({ ...f, session_id: String(curr.id) }))
      })
  }, [])

  const loadResults = async () => {
    if (!filters.class_id || !filters.session_id || !filters.term) return
    setLoading(true)
    try {
      const res = await api.get(`/results/class/${filters.class_id}`, {
        params: { session_id: filters.session_id, term: filters.term }
      })
      setResults(res.data)
    } catch { toast.error('Failed to load results') }
    finally { setLoading(false) }
  }

  useEffect(() => { if (filters.class_id) loadResults() }, [filters])

  const handleCompute = async () => {
    if (!filters.class_id || !filters.session_id || !filters.term)
      return toast.error('Select class, session and term first')
    setComputing(true)
    try {
      const res = await api.post('/results/compute', filters)
      toast.success(res.data.message)
      loadResults()
    } catch (err) { toast.error(err.response?.data?.error || 'Computation failed') }
    finally { setComputing(false) }
  }

  const handlePublish = async (publish) => {
    if (!filters.class_id || !filters.session_id || !filters.term) return
    setPublishing(true)
    try {
      const res = await api.post(publish ? '/results/publish' : '/results/unpublish', filters)
      toast.success(res.data.message)
      loadResults()
    } catch (err) { toast.error(err.response?.data?.error || 'Action failed') }
    finally { setPublishing(false) }
  }

  const handleAddSession = async () => {
    if (!newSession.trim()) return
    try {
      await api.post('/results/sessions', { name: newSession.trim() })
      toast.success('Session created')
      const res = await api.get('/results/sessions/all')
      setSessions(res.data)
      setNewSession(''); setShowSessionModal(false)
    } catch (err) { toast.error(err.response?.data?.error || 'Failed to create session') }
  }

  const openRemark = (r) => {
    setRemarkModal(r)
    setRemarkForm({ teacher_remark: r.teacher_remark || '', principal_remark: r.principal_remark || '' })
  }

  const handleSaveRemark = async () => {
    setSavingRemark(true)
    try {
      await api.put(`/results/${remarkModal.id}/remark`, remarkForm)
      toast.success('Remarks saved')
      setRemarkModal(null)
      loadResults()
    } catch (err) { toast.error(err.response?.data?.error || 'Failed to save remarks') }
    finally { setSavingRemark(false) }
  }

  const isPublished = results.length > 0 && results[0]?.is_published

  return (
    <Layout title="Results Management">
      <div className="page-header">
        <div>
          <h1>Results Management</h1>
          <p>Compute, add remarks and publish student results</p>
        </div>
        <button className="btn btn-secondary" onClick={() => setShowSessionModal(true)}>
          New Session
        </button>
      </div>

      {/* Filters */}
      <div className="card" style={{ marginBottom: 20 }}>
        <h3 className="card-title" style={{ marginBottom: 16 }}>Select Class and Term</h3>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          {[
            { label: 'Class',   key: 'class_id',   opts: classes.map(c  => ({ v: c.id, l: c.name })) },
            { label: 'Session', key: 'session_id', opts: sessions.map(s => ({ v: s.id, l: s.name + (s.is_current ? ' (Current)' : '') })) },
          ].map(({ label, key, opts }) => (
            <div key={key} className="form-group" style={{ margin: 0, flex: 1, minWidth: 160 }}>
              <label className="form-label">{label}</label>
              <select className="form-control" value={filters[key]}
                onChange={e => setFilters(f => ({ ...f, [key]: e.target.value }))}>
                <option value="">— Select {label} —</option>
                {opts.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
              </select>
            </div>
          ))}
          <div className="form-group" style={{ margin: 0, flex: 1, minWidth: 160 }}>
            <label className="form-label">Term</label>
            <select className="form-control" value={filters.term}
              onChange={e => setFilters(f => ({ ...f, term: e.target.value }))}>
              {TERMS.map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button className="btn btn-primary" onClick={handleCompute}
              disabled={computing || !filters.class_id}>
              {computing ? 'Computing...' : 'Compute Results'}
            </button>
            <button
              className={`btn ${isPublished ? 'btn-danger' : 'btn-success'}`}
              onClick={() => handlePublish(!isPublished)}
              disabled={publishing || results.length === 0}>
              {publishing ? '...' : isPublished ? 'Unpublish' : 'Publish Results'}
            </button>
          </div>
        </div>
      </div>

      {/* Results table */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">
            Result Summary
            {isPublished && <span className="badge badge-green" style={{ marginLeft: 8 }}>Published</span>}
            {!isPublished && results.length > 0 && <span className="badge badge-yellow" style={{ marginLeft: 8 }}>Draft</span>}
          </h3>
          <span className="text-sm text-muted">{results.length} student(s)</span>
        </div>

        {loading ? (
          <div className="empty-state"><p>Loading...</p></div>
        ) : results.length === 0 ? (
          <div className="empty-state">
            <p className="empty-state-title">No results yet</p>
            <p>Select a class and click "Compute Results" to generate.</p>
          </div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Position</th>
                  <th>Student Name</th>
                  <th>Admission No.</th>
                  <th>Total</th>
                  <th>Average</th>
                  <th>Teacher Comment</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {results.map(r => (
                  <tr key={r.id}>
                    <td>
                      <span className="badge badge-blue">
                        {r.position}{['st','nd','rd'][r.position-1]||'th'}
                      </span>
                    </td>
                    <td style={{ fontWeight: 500 }}>{r.student_name}</td>
                    <td><span className="badge badge-gray">{r.admission_number}</span></td>
                    <td>{r.total_score?.toFixed(1)}</td>
                    <td><strong>{r.average?.toFixed(2)}%</strong></td>
                    <td>
                      <span style={{ fontSize: 12, color: r.teacher_remark ? 'var(--gray-700)' : 'var(--gray-400)', fontStyle: r.teacher_remark ? 'normal' : 'italic' }}>
                        {r.teacher_remark || 'No comment yet'}
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${r.is_published ? 'badge-green' : 'badge-yellow'}`}>
                        {r.is_published ? 'Published' : 'Pending'}
                      </span>
                    </td>
                    <td>
                      <button className="btn btn-secondary btn-sm" onClick={() => openRemark(r)}>
                        Add Remarks
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Remark Modal */}
      {remarkModal && (
        <div className="modal-overlay" onClick={() => setRemarkModal(null)}>
          <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Add Remarks — {remarkModal.student_name}</h3>
              <button className="modal-close" onClick={() => setRemarkModal(null)}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <div className="modal-body">
              <div style={{ background: 'var(--gray-50)', borderRadius: 6, padding: '10px 14px', marginBottom: 16, fontSize: 13 }}>
                <strong>{remarkModal.student_name}</strong> &nbsp;|&nbsp;
                Average: <strong>{remarkModal.average?.toFixed(2)}%</strong> &nbsp;|&nbsp;
                Position: <strong>{remarkModal.position}</strong>
              </div>
              <div className="form-group">
                <label className="form-label">Class Teacher's Comment</label>
                <textarea className="form-control" rows={3}
                  value={remarkForm.teacher_remark}
                  onChange={e => setRemarkForm(f => ({ ...f, teacher_remark: e.target.value }))}
                  placeholder="e.g. A hardworking student. Keep it up!"
                  style={{ resize: 'vertical' }}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Principal's Comment</label>
                <textarea className="form-control" rows={3}
                  value={remarkForm.principal_remark}
                  onChange={e => setRemarkForm(f => ({ ...f, principal_remark: e.target.value }))}
                  placeholder="e.g. Outstanding performance. Well done!"
                  style={{ resize: 'vertical' }}
                />
              </div>
              <div className="form-actions">
                <button className="btn btn-secondary" onClick={() => setRemarkModal(null)}>Cancel</button>
                <button className="btn btn-primary" onClick={handleSaveRemark} disabled={savingRemark}>
                  {savingRemark ? 'Saving...' : 'Save Remarks'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* New Session Modal */}
      {showSessionModal && (
        <div className="modal-overlay" onClick={() => setShowSessionModal(false)}>
          <div className="modal" style={{ maxWidth: 380 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Create Academic Session</h3>
              <button className="modal-close" onClick={() => setShowSessionModal(false)}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Session Name *</label>
                <input className="form-control" value={newSession}
                  onChange={e => setNewSession(e.target.value)}
                  placeholder="e.g. 2024/2025" />
              </div>
              <div className="form-actions">
                <button className="btn btn-secondary" onClick={() => setShowSessionModal(false)}>Cancel</button>
                <button className="btn btn-primary" onClick={handleAddSession}>Create</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </Layout>
  )
}
