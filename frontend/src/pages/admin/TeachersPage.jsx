import { useState, useEffect } from 'react'
import Layout from '../../components/layout/Layout'
import api from '../../utils/api'
import toast from 'react-hot-toast'

const EMPTY_FORM = {
  full_name: '', employee_id: '', username: '', password: '', email: ''
}

export default function TeachersPage() {
  const [teachers, setTeachers]       = useState([])
  const [classes, setClasses]         = useState([])
  const [subjects, setSubjects]       = useState([])
  const [loading, setLoading]         = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [form, setForm]               = useState(EMPTY_FORM)
  const [saving, setSaving]           = useState(false)
  const [assignModal, setAssignModal] = useState(null)
  const [selectedId, setSelectedId]   = useState('')
  const [assigning, setAssigning]     = useState(false)
  const [deleteId, setDeleteId]       = useState(null)

  const fetchAll = () => {
    Promise.all([
      api.get('/dashboard/teachers'),
      api.get('/classes'),
      api.get('/subjects')
    ]).then(([t, c, s]) => {
      setTeachers(t.data)
      setClasses(c.data)
      setSubjects(s.data)
    }).catch(() => toast.error('Failed to load data'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchAll() }, [])

  const handleAddTeacher = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      await api.post('/dashboard/teachers', form)
      toast.success('Teacher added successfully')
      setShowAddModal(false)
      setForm(EMPTY_FORM)
      fetchAll()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to add teacher')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    try {
      await api.delete(`/dashboard/teachers/${deleteId}`)
      toast.success('Teacher deleted')
      setDeleteId(null)
      fetchAll()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to delete teacher')
    }
  }

  const handleAssign = async () => {
    if (!selectedId) return toast.error('Please select an item')
    setAssigning(true)
    try {
      const endpoint = assignModal.type === 'class'
        ? '/dashboard/teacher/assign-class'
        : '/dashboard/teacher/assign-subject'
      const payload = assignModal.type === 'class'
        ? { teacher_id: assignModal.teacher.id, class_id: selectedId }
        : { teacher_id: assignModal.teacher.id, subject_id: selectedId }

      await api.post(endpoint, payload)
      toast.success(`${assignModal.type === 'class' ? 'Class' : 'Subject'} assigned successfully`)
      setAssignModal(null)
      setSelectedId('')
      fetchAll()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Assignment failed')
    } finally {
      setAssigning(false)
    }
  }

  return (
    <Layout title="Teacher Management">
      <div className="page-header">
        <div>
          <h1>Teachers</h1>
          <p>{teachers.length} teacher{teachers.length !== 1 ? 's' : ''} registered</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setForm(EMPTY_FORM); setShowAddModal(true) }}>
          Add Teacher
        </button>
      </div>

      {loading ? (
        <div className="card"><div className="empty-state"><p>Loading...</p></div></div>
      ) : teachers.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <p className="empty-state-title">No teachers yet</p>
            <p>Click "Add Teacher" to register the first teacher.</p>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {teachers.map(t => (
            <div className="card" key={t.id}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
                <div>
                  <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>{t.full_name}</h3>
                  <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                    <span className="text-sm text-muted">Employee ID: <strong>{t.employee_id}</strong></span>
                    <span className="text-sm text-muted">Username: <strong>{t.username}</strong></span>
                    {t.email && <span className="text-sm text-muted">Email: {t.email}</span>}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <button className="btn btn-secondary btn-sm"
                    onClick={() => { setAssignModal({ teacher: t, type: 'class' }); setSelectedId('') }}>
                    Assign Class
                  </button>
                  <button className="btn btn-secondary btn-sm"
                    onClick={() => { setAssignModal({ teacher: t, type: 'subject' }); setSelectedId('') }}>
                    Assign Subject
                  </button>
                  <button className="btn btn-danger btn-sm"
                    onClick={() => setDeleteId(t.id)}>
                    Delete
                  </button>
                </div>
              </div>

              <div className="divider" />

              <div className="grid-2" style={{ gap: 16 }}>
                <div>
                  <p className="text-sm text-muted" style={{ marginBottom: 8, fontWeight: 600 }}>Assigned Classes</p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {t.classes.length === 0
                      ? <span className="text-sm text-muted">None assigned</span>
                      : t.classes.map(c => <span key={c.id} className="badge badge-blue">{c.name}</span>)
                    }
                  </div>
                </div>
                <div>
                  <p className="text-sm text-muted" style={{ marginBottom: 8, fontWeight: 600 }}>Assigned Subjects</p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {t.subjects.length === 0
                      ? <span className="text-sm text-muted">None assigned</span>
                      : t.subjects.map(s => <span key={s.id} className="badge badge-green">{s.code} — {s.name}</span>)
                    }
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Add Teacher Modal ── */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Add New Teacher</h3>
              <button className="modal-close" onClick={() => setShowAddModal(false)}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
            <div className="modal-body">
              <form onSubmit={handleAddTeacher} autoComplete="off">
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Full Name *</label>
                    <input className="form-control" value={form.full_name}
                      onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))}
                      placeholder="e.g. Mr. John Doe" required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Employee ID *</label>
                    <input className="form-control" value={form.employee_id}
                      onChange={e => setForm(f => ({ ...f, employee_id: e.target.value }))}
                      placeholder="e.g. TCH004" required />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Email Address</label>
                  <input type="email" className="form-control" value={form.email}
                    onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                    placeholder="Optional" />
                </div>
                <div className="divider" />
                <p className="text-sm text-muted" style={{ marginBottom: 12 }}>
                  Login credentials for teacher portal:
                </p>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Username *</label>
                    <input className="form-control" value={form.username}
                      onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
                      placeholder="e.g. teacher4" required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Password *</label>
                    <input type="password" className="form-control" value={form.password}
                      onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                      placeholder="Min 6 characters"
                      autoComplete="new-password"
                      data-lpignore="true"
                      minLength={6} required />
                  </div>
                </div>
                <div className="form-actions">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowAddModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={saving}>
                    {saving ? 'Adding...' : 'Add Teacher'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ── Assign Modal ── */}
      {assignModal && (
        <div className="modal-overlay" onClick={() => setAssignModal(null)}>
          <div className="modal" style={{ maxWidth: 400 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">
                Assign {assignModal.type === 'class' ? 'Class' : 'Subject'} to {assignModal.teacher.full_name}
              </h3>
              <button className="modal-close" onClick={() => setAssignModal(null)}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">
                  Select {assignModal.type === 'class' ? 'Class' : 'Subject'}
                </label>
                <select className="form-control" value={selectedId}
                  onChange={e => setSelectedId(e.target.value)}>
                  <option value="">— Choose —</option>
                  {(assignModal.type === 'class' ? classes : subjects).map(item => (
                    <option key={item.id} value={item.id}>{item.name}</option>
                  ))}
                </select>
              </div>
              <div className="form-actions">
                <button className="btn btn-secondary" onClick={() => setAssignModal(null)}>Cancel</button>
                <button className="btn btn-primary" onClick={handleAssign} disabled={assigning}>
                  {assigning ? 'Assigning...' : 'Assign'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Confirm Modal ── */}
      {deleteId && (
        <div className="modal-overlay" onClick={() => setDeleteId(null)}>
          <div className="modal" style={{ maxWidth: 380 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Confirm Delete</h3>
              <button className="modal-close" onClick={() => setDeleteId(null)}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
            <div className="modal-body">
              <p style={{ marginBottom: 20 }}>
                Delete this teacher? Their login account and all class/subject assignments will be removed. This cannot be undone.
              </p>
              <div className="form-actions">
                <button className="btn btn-secondary" onClick={() => setDeleteId(null)}>Cancel</button>
                <button className="btn btn-danger" onClick={handleDelete}>Delete Teacher</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </Layout>
  )
}
