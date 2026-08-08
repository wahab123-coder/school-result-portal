import { useState, useEffect } from 'react'
import Layout from '../../components/layout/Layout'
import api from '../../utils/api'
import toast from 'react-hot-toast'

const EMPTY = { full_name: '', username: '', password: '', email: '', phone: '', address: '', occupation: '' }

export default function ParentsManagePage() {
  const [parents, setParents]   = useState([])
  const [students, setStudents] = useState([])
  const [loading, setLoading]   = useState(true)
  const [showAdd, setShowAdd]   = useState(false)
  const [form, setForm]         = useState(EMPTY)
  const [saving, setSaving]     = useState(false)
  const [linkModal, setLinkModal] = useState(null)
  const [linkStudentId, setLinkStudentId] = useState('')
  const [linkRelationship, setLinkRelationship] = useState('Parent')
  const [deleteId, setDeleteId] = useState(null)

  const fetchAll = () => {
    Promise.all([api.get('/parents'), api.get('/students')])
      .then(([p, s]) => { setParents(p.data); setStudents(s.data) })
      .catch(() => toast.error('Failed to load data'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchAll() }, [])

  const handleAdd = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      await api.post('/parents', form)
      toast.success('Parent account created')
      setShowAdd(false); setForm(EMPTY); fetchAll()
    } catch (err) { toast.error(err.response?.data?.error || 'Failed to create parent') }
    finally { setSaving(false) }
  }

  const handleLink = async () => {
    if (!linkStudentId) return toast.error('Select a student')
    try {
      await api.post(`/parents/${linkModal.id}/link-student`, { student_id: linkStudentId, relationship: linkRelationship })
      toast.success('Student linked to parent')
      setLinkModal(null); setLinkStudentId(''); fetchAll()
    } catch (err) { toast.error(err.response?.data?.error || 'Failed to link student') }
  }

  const handleUnlink = async (parentId, studentId) => {
    try {
      await api.delete(`/parents/${parentId}/unlink-student/${studentId}`)
      toast.success('Student unlinked')
      fetchAll()
    } catch (err) { toast.error('Failed to unlink student') }
  }

  const handleDelete = async () => {
    try {
      await api.delete(`/parents/${deleteId}`)
      toast.success('Parent deleted')
      setDeleteId(null); fetchAll()
    } catch (err) { toast.error(err.response?.data?.error || 'Failed to delete') }
  }

  return (
    <Layout title="Parent Management">
      <div className="page-header">
        <div><h1>Parents</h1><p>{parents.length} parent account{parents.length !== 1 ? 's' : ''}</p></div>
        <button className="btn btn-primary" onClick={() => { setForm(EMPTY); setShowAdd(true) }}>Add Parent</button>
      </div>

      {loading ? (
        <div className="card"><div className="empty-state"><p>Loading...</p></div></div>
      ) : !parents.length ? (
        <div className="card"><div className="empty-state"><p className="empty-state-title">No parents yet</p><p>Add a parent account to get started.</p></div></div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {parents.map(p => (
            <div className="card" key={p.id}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
                <div>
                  <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>{p.full_name}</h3>
                  <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
                    <span className="text-sm text-muted">Username: <strong>{p.username}</strong></span>
                    {p.phone && <span className="text-sm text-muted">Phone: {p.phone}</span>}
                    {p.email && <span className="text-sm text-muted">Email: {p.email}</span>}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn btn-secondary btn-sm" onClick={() => { setLinkModal(p); setLinkStudentId('') }}>Link Student</button>
                  <button className="btn btn-danger btn-sm" onClick={() => setDeleteId(p.id)}>Delete</button>
                </div>
              </div>
              {p.children?.length > 0 && (
                <>
                  <div className="divider" />
                  <div>
                    <p className="text-sm text-muted" style={{ marginBottom: 8, fontWeight: 600 }}>Linked Children</p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                      {p.children.map(c => (
                        <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 10px', background: 'var(--gray-50)', border: '1px solid var(--gray-200)', borderRadius: 20 }}>
                          <span style={{ fontSize: 13, fontWeight: 500 }}>{c.full_name}</span>
                          <span className="badge badge-blue" style={{ fontSize: 10 }}>{c.class_name}</span>
                          <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)', fontSize: 14, lineHeight: 1, padding: '0 2px' }}
                            onClick={() => handleUnlink(p.id, c.id)} title="Unlink">×</button>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add Parent Modal */}
      {showAdd && (
        <div className="modal-overlay" onClick={() => setShowAdd(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Add Parent Account</h3>
              <button className="modal-close" onClick={() => setShowAdd(false)}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <div className="modal-body">
              <form onSubmit={handleAdd} autoComplete="off">
                <div className="form-row">
                  <div className="form-group"><label className="form-label">Full Name *</label>
                    <input className="form-control" value={form.full_name} onChange={e=>setForm(f=>({...f,full_name:e.target.value}))} required /></div>
                  <div className="form-group"><label className="form-label">Phone</label>
                    <input className="form-control" value={form.phone} onChange={e=>setForm(f=>({...f,phone:e.target.value}))} /></div>
                </div>
                <div className="form-row">
                  <div className="form-group"><label className="form-label">Email</label>
                    <input type="email" className="form-control" value={form.email} onChange={e=>setForm(f=>({...f,email:e.target.value}))} /></div>
                  <div className="form-group"><label className="form-label">Occupation</label>
                    <input className="form-control" value={form.occupation} onChange={e=>setForm(f=>({...f,occupation:e.target.value}))} /></div>
                </div>
                <div className="divider" />
                <p className="text-sm text-muted" style={{ marginBottom: 12 }}>Login credentials for parent portal:</p>
                <div className="form-row">
                  <div className="form-group"><label className="form-label">Username *</label>
                    <input className="form-control" value={form.username} onChange={e=>setForm(f=>({...f,username:e.target.value}))} required /></div>
                  <div className="form-group"><label className="form-label">Password *</label>
                    <input type="password" className="form-control" value={form.password}
                      onChange={e=>setForm(f=>({...f,password:e.target.value}))}
                      autoComplete="new-password" data-lpignore="true" minLength={6} required /></div>
                </div>
                <div className="form-actions">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowAdd(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary" disabled={saving}>{saving?'Adding...':'Add Parent'}</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Link Student Modal */}
      {linkModal && (
        <div className="modal-overlay" onClick={() => setLinkModal(null)}>
          <div className="modal" style={{ maxWidth: 420 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Link Student to {linkModal.full_name}</h3>
              <button className="modal-close" onClick={() => setLinkModal(null)}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group"><label className="form-label">Select Student</label>
                <select className="form-control" value={linkStudentId} onChange={e=>setLinkStudentId(e.target.value)}>
                  <option value="">— Choose Student —</option>
                  {students.map(s => <option key={s.id} value={s.id}>{s.full_name} ({s.admission_number})</option>)}
                </select>
              </div>
              <div className="form-group"><label className="form-label">Relationship</label>
                <select className="form-control" value={linkRelationship} onChange={e=>setLinkRelationship(e.target.value)}>
                  {['Parent','Father','Mother','Guardian','Sibling','Relative'].map(r=><option key={r}>{r}</option>)}
                </select>
              </div>
              <div className="form-actions">
                <button className="btn btn-secondary" onClick={() => setLinkModal(null)}>Cancel</button>
                <button className="btn btn-primary" onClick={handleLink}>Link Student</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {deleteId && (
        <div className="modal-overlay" onClick={() => setDeleteId(null)}>
          <div className="modal" style={{ maxWidth: 380 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header"><h3 className="modal-title">Confirm Delete</h3>
              <button className="modal-close" onClick={() => setDeleteId(null)}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <div className="modal-body">
              <p style={{ marginBottom: 20 }}>Delete this parent account? All linked student relationships will be removed. This cannot be undone.</p>
              <div className="form-actions">
                <button className="btn btn-secondary" onClick={() => setDeleteId(null)}>Cancel</button>
                <button className="btn btn-danger" onClick={handleDelete}>Delete Parent</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </Layout>
  )
}
