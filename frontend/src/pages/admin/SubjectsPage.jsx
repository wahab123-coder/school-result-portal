import { useState, useEffect } from 'react'
import Layout from '../../components/layout/Layout'
import api from '../../utils/api'
import toast from 'react-hot-toast'

export default function SubjectsPage() {
  const [subjects, setSubjects]   = useState([])
  const [loading, setLoading]     = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editSubject, setEditSubject] = useState(null)
  const [form, setForm]           = useState({ name: '', code: '', description: '' })
  const [saving, setSaving]       = useState(false)
  const [deleteId, setDeleteId]   = useState(null)

  const fetchSubjects = () => {
    api.get('/subjects')
      .then(res => setSubjects(res.data))
      .catch(() => toast.error('Failed to load subjects'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchSubjects() }, [])

  const openAdd  = () => { setEditSubject(null); setForm({ name: '', code: '', description: '' }); setShowModal(true) }
  const openEdit = (s) => {
    setEditSubject(s)
    setForm({ name: s.name, code: s.code, description: s.description || '' })
    setShowModal(true)
  }

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      if (editSubject) {
        await api.put(`/subjects/${editSubject.id}`, form)
        toast.success('Subject updated')
      } else {
        await api.post('/subjects', form)
        toast.success('Subject created')
      }
      setShowModal(false)
      fetchSubjects()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to save subject')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    try {
      await api.delete(`/subjects/${deleteId}`)
      toast.success('Subject deleted')
      setDeleteId(null)
      fetchSubjects()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to delete')
    }
  }

  return (
    <Layout title="Subject Management">
      <div className="page-header">
        <div>
          <h1>Subjects</h1>
          <p>Manage all school subjects</p>
        </div>
        <button className="btn btn-primary" onClick={openAdd}>Add Subject</button>
      </div>

      <div className="card">
        {loading ? (
          <div className="empty-state"><p>Loading...</p></div>
        ) : subjects.length === 0 ? (
          <div className="empty-state"><p>No subjects yet.</p></div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr><th>#</th><th>Subject Name</th><th>Code</th><th>Description</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {subjects.map((s, i) => (
                  <tr key={s.id}>
                    <td className="text-muted text-sm">{i + 1}</td>
                    <td><strong>{s.name}</strong></td>
                    <td><span className="badge badge-blue">{s.code}</span></td>
                    <td className="text-muted">{s.description || '—'}</td>
                    <td>
                      <div className="td-actions">
                        <button className="btn btn-secondary btn-sm" onClick={() => openEdit(s)}>Edit</button>
                        <button className="btn btn-danger btn-sm" onClick={() => setDeleteId(s.id)}>Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" style={{ maxWidth: 440 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">{editSubject ? 'Edit Subject' : 'Add New Subject'}</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>x</button>
            </div>
            <div className="modal-body">
              <form onSubmit={handleSave}>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Subject Name *</label>
                    <input className="form-control" value={form.name}
                      onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                      placeholder="e.g. Mathematics" required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Subject Code *</label>
                    <input className="form-control" value={form.code}
                      onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))}
                      placeholder="e.g. MTH" maxLength={5} required />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Description</label>
                  <input className="form-control" value={form.description}
                    onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                    placeholder="Optional" />
                </div>
                <div className="form-actions">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary" disabled={saving}>
                    {saving ? 'Saving...' : editSubject ? 'Save Changes' : 'Add Subject'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {deleteId && (
        <div className="modal-overlay" onClick={() => setDeleteId(null)}>
          <div className="modal" style={{ maxWidth: 380 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Confirm Delete</h3>
              <button className="modal-close" onClick={() => setDeleteId(null)}>x</button>
            </div>
            <div className="modal-body">
              <p style={{ marginBottom: 20 }}>Delete this subject? All associated scores will also be removed.</p>
              <div className="form-actions">
                <button className="btn btn-secondary" onClick={() => setDeleteId(null)}>Cancel</button>
                <button className="btn btn-danger" onClick={handleDelete}>Delete</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </Layout>
  )
}
