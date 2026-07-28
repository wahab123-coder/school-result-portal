import { useState, useEffect } from 'react'
import Layout from '../../components/layout/Layout'
import api from '../../utils/api'
import toast from 'react-hot-toast'

export default function TeachersPage() {
  const [teachers, setTeachers]   = useState([])
  const [classes, setClasses]     = useState([])
  const [subjects, setSubjects]   = useState([])
  const [loading, setLoading]     = useState(true)
  const [assignModal, setAssignModal] = useState(null)
  const [selectedId, setSelectedId]   = useState('')
  const [saving, setSaving]           = useState(false)

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

  const handleAssign = async () => {
    if (!selectedId) return toast.error('Please select an item')
    setSaving(true)
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
      setSaving(false)
    }
  }

  return (
    <Layout title="Teacher Management">
      <div className="page-header">
        <div>
          <h1>Teachers</h1>
          <p>View teachers and manage their assignments</p>
        </div>
      </div>

      {loading ? (
        <div className="card"><div className="empty-state"><p>Loading...</p></div></div>
      ) : teachers.length === 0 ? (
        <div className="card">
          <div className="empty-state"><p>No teachers found in the system.</p></div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {teachers.map(t => (
            <div className="card" key={t.id}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
                <div>
                  <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>{t.full_name}</h3>
                  <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                    <span className="text-sm text-muted">ID: {t.employee_id}</span>
                    <span className="text-sm text-muted">Username: {t.username}</span>
                    {t.email && <span className="text-sm text-muted">Email: {t.email}</span>}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn btn-secondary btn-sm"
                    onClick={() => { setAssignModal({ teacher: t, type: 'class' }); setSelectedId('') }}>
                    Assign Class
                  </button>
                  <button className="btn btn-secondary btn-sm"
                    onClick={() => { setAssignModal({ teacher: t, type: 'subject' }); setSelectedId('') }}>
                    Assign Subject
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
                      : t.subjects.map(s => <span key={s.id} className="badge badge-green">{s.name}</span>)
                    }
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {assignModal && (
        <div className="modal-overlay" onClick={() => setAssignModal(null)}>
          <div className="modal" style={{ maxWidth: 400 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">
                Assign {assignModal.type === 'class' ? 'Class' : 'Subject'} to {assignModal.teacher.full_name}
              </h3>
              <button className="modal-close" onClick={() => setAssignModal(null)}>x</button>
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
                <button className="btn btn-primary" onClick={handleAssign} disabled={saving}>
                  {saving ? 'Assigning...' : 'Assign'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </Layout>
  )
}
