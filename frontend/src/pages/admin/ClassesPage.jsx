import { useState, useEffect } from 'react'
import Layout from '../../components/layout/Layout'
import api from '../../utils/api'
import toast from 'react-hot-toast'

export default function ClassesPage() {
  const [classes, setClasses]   = useState([])
  const [loading, setLoading]   = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editClass, setEditClass] = useState(null)
  const [form, setForm]         = useState({ name: '', description: '' })
  const [saving, setSaving]     = useState(false)
  const [deleteId, setDeleteId] = useState(null)

  const fetchClasses = () => {
    api.get('/classes')
      .then(res => setClasses(res.data))
      .catch(() => toast.error('Failed to load classes'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchClasses() }, [])

  const openAdd  = () => { setEditClass(null); setForm({ name: '', description: '' }); setShowModal(true) }
  const openEdit = (c) => { setEditClass(c); setForm({ name: c.name, description: c.description || '' }); setShowModal(true) }

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      if (editClass) {
        await api.put(`/classes/${editClass.id}`, form)
        toast.success('Class updated')
      } else {
        await api.post('/classes', form)
        toast.success('Class created')
      }
      setShowModal(false)
      fetchClasses()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to save class')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    try {
      await api.delete(`/classes/${deleteId}`)
      toast.success('Class deleted')
      setDeleteId(null)
      fetchClasses()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to delete')
    }
  }

  return (
    <Layout title="Class Management">
      <div className="page-header">
        <div>
          <h1>Classes</h1>
          <p>Manage school classes and arms</p>
        </div>
        <button className="btn btn-primary" onClick={openAdd}>Add Class</button>
      </div>

      <div className="card">
        {loading ? (
          <div className="empty-state"><p>Loading...</p></div>
        ) : classes.length === 0 ? (
          <div className="empty-state">
            <p>No classes yet. Add one to get started.</p>
          </div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr><th>#</th><th>Class Name</th><th>Description</th><th>Students</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {classes.map((c, i) => (
                  <tr key={c.id}>
                    <td className="text-muted text-sm">{i + 1}</td>
                    <td><strong>{c.name}</strong></td>
                    <td className="text-muted">{c.description || '—'}</td>
                    <td><span className="badge badge-blue">{c.student_count} students</span></td>
                    <td>
                      <div className="td-actions">
                        <button className="btn btn-secondary btn-sm" onClick={() => openEdit(c)}>Edit</button>
                        <button className="btn btn-danger btn-sm" onClick={() => setDeleteId(c.id)}>Delete</button>
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
          <div className="modal" style={{ maxWidth: 420 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">{editClass ? 'Edit Class' : 'Add New Class'}</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>x</button>
            </div>
            <div className="modal-body">
              <form onSubmit={handleSave}>
                <div className="form-group">
                  <label className="form-label">Class Name *</label>
                  <input className="form-control" value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    placeholder="e.g. JSS1, SS2 Science" required />
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
                    {saving ? 'Saving...' : editClass ? 'Save Changes' : 'Add Class'}
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
              <p style={{ marginBottom: 20 }}>Delete this class? Students assigned to it will be unassigned.</p>
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
