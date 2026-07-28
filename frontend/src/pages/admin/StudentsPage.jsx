import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../../components/layout/Layout'
import api from '../../utils/api'
import toast from 'react-hot-toast'

const EMPTY_FORM = {
  full_name: '', admission_number: '', username: '', password: '',
  class_id: '', gender: '', date_of_birth: '', parent_phone: ''
}

export default function StudentsPage() {
  const [students, setStudents]     = useState([])
  const [classes, setClasses]       = useState([])
  const [loading, setLoading]       = useState(true)
  const [search, setSearch]         = useState('')
  const [filterClass, setFilterClass] = useState('')
  const [showModal, setShowModal]   = useState(false)
  const [editStudent, setEditStudent] = useState(null)
  const [form, setForm]             = useState(EMPTY_FORM)
  const [saving, setSaving]         = useState(false)
  const [deleteId, setDeleteId]     = useState(null)
  const navigate = useNavigate()

  const fetchStudents = useCallback(() => {
    const params = {}
    if (search)      params.search   = search
    if (filterClass) params.class_id = filterClass
    api.get('/students', { params })
      .then(res => setStudents(res.data))
      .catch(() => toast.error('Failed to load students'))
      .finally(() => setLoading(false))
  }, [search, filterClass])

  useEffect(() => { fetchStudents() }, [fetchStudents])
  useEffect(() => {
    api.get('/classes').then(res => setClasses(res.data))
  }, [])

  const openAdd = () => {
    setEditStudent(null)
    setForm(EMPTY_FORM)
    setShowModal(true)
  }

  const openEdit = (s) => {
    setEditStudent(s)
    setForm({
      full_name: s.full_name, admission_number: s.admission_number,
      class_id: s.class_id || '', gender: s.gender || '',
      date_of_birth: s.date_of_birth || '', parent_phone: s.parent_phone || '',
      username: s.username || '', password: ''
    })
    setShowModal(true)
  }

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      if (editStudent) {
        await api.put(`/students/${editStudent.id}`, form)
        toast.success('Student updated')
      } else {
        await api.post('/students', form)
        toast.success('Student added successfully')
      }
      setShowModal(false)
      fetchStudents()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to save student')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    try {
      await api.delete(`/students/${deleteId}`)
      toast.success('Student deleted')
      setDeleteId(null)
      fetchStudents()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to delete student')
    }
  }

  return (
    <Layout title="Student Management">
      <div className="page-header">
        <div>
          <h1>Students</h1>
          <p>{students.length} student{students.length !== 1 ? 's' : ''} found</p>
        </div>
        <button className="btn btn-primary" onClick={openAdd}>Add Student</button>
      </div>

      {/* Filters */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <div className="search-bar" style={{ maxWidth: 300, flex: 1 }}>
            <span style={{ color: 'var(--gray-400)', fontSize: 13 }}>Search</span>
            <input
              placeholder="Name or admission number"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <select
            className="form-control"
            style={{ maxWidth: 180 }}
            value={filterClass}
            onChange={e => setFilterClass(e.target.value)}
          >
            <option value="">All Classes</option>
            {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          {(search || filterClass) && (
            <button className="btn btn-ghost btn-sm" onClick={() => { setSearch(''); setFilterClass('') }}>
              Clear
            </button>
          )}
        </div>
      </div>

      <div className="card">
        {loading ? (
          <div className="empty-state"><p>Loading...</p></div>
        ) : students.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon-text">No students found</div>
            <p>Add a student to get started.</p>
          </div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Full Name</th>
                  <th>Admission No.</th>
                  <th>Class</th>
                  <th>Gender</th>
                  <th>Parent Phone</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {students.map((s, i) => (
                  <tr key={s.id}>
                    <td className="text-muted text-sm">{i + 1}</td>
                    <td><strong>{s.full_name}</strong></td>
                    <td><span className="badge badge-gray">{s.admission_number}</span></td>
                    <td>{s.class_name || <span className="text-muted">—</span>}</td>
                    <td>
                      <span className={`badge ${s.gender === 'Female' ? 'badge-purple' : 'badge-blue'}`}>
                        {s.gender || '—'}
                      </span>
                    </td>
                    <td>{s.parent_phone || '—'}</td>
                    <td>
                      <div className="td-actions">
                        <button className="btn btn-secondary btn-sm" onClick={() => navigate(`/admin/students/${s.id}`)}>View</button>
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

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">{editStudent ? 'Edit Student' : 'Add New Student'}</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>x</button>
            </div>
            <div className="modal-body">
              <form onSubmit={handleSave} autoComplete="off">
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Full Name *</label>
                    <input className="form-control" value={form.full_name}
                      onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Admission Number *</label>
                    <input className="form-control" value={form.admission_number}
                      onChange={e => setForm(f => ({ ...f, admission_number: e.target.value }))}
                      placeholder="e.g. ADM/2024/001" required />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Class</label>
                    <select className="form-control" value={form.class_id}
                      onChange={e => setForm(f => ({ ...f, class_id: e.target.value }))}>
                      <option value="">— Select Class —</option>
                      {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Gender</label>
                    <select className="form-control" value={form.gender}
                      onChange={e => setForm(f => ({ ...f, gender: e.target.value }))}>
                      <option value="">— Select —</option>
                      <option>Male</option>
                      <option>Female</option>
                    </select>
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Date of Birth</label>
                    <input type="date" className="form-control" value={form.date_of_birth}
                      onChange={e => setForm(f => ({ ...f, date_of_birth: e.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Parent Phone</label>
                    <input className="form-control" value={form.parent_phone}
                      onChange={e => setForm(f => ({ ...f, parent_phone: e.target.value }))}
                      placeholder="e.g. 08012345678" />
                  </div>
                </div>
                {!editStudent && (
                  <>
                    <div className="divider" />
                    <p className="text-sm text-muted" style={{ marginBottom: 12 }}>Login credentials for student portal:</p>
                    <div className="form-row">
                      <div className="form-group">
                        <label className="form-label">Username *</label>
                        <input className="form-control" value={form.username}
                          onChange={e => setForm(f => ({ ...f, username: e.target.value }))} required />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Password *</label>
                        <input type="password" className="form-control" value={form.password}
                          onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                          autoComplete="new-password"
                          data-lpignore="true"
                          data-form-type="other"
                          minLength={6} required />
                      </div>
                    </div>
                  </>
                )}
                <div className="form-actions">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary" disabled={saving}>
                    {saving ? 'Saving...' : editStudent ? 'Save Changes' : 'Add Student'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {deleteId && (
        <div className="modal-overlay" onClick={() => setDeleteId(null)}>
          <div className="modal" style={{ maxWidth: 380 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Confirm Delete</h3>
              <button className="modal-close" onClick={() => setDeleteId(null)}>x</button>
            </div>
            <div className="modal-body">
              <p style={{ marginBottom: 20 }}>
                Are you sure you want to delete this student? This will also remove their login account and all associated scores. This action cannot be undone.
              </p>
              <div className="form-actions">
                <button className="btn btn-secondary" onClick={() => setDeleteId(null)}>Cancel</button>
                <button className="btn btn-danger" onClick={handleDelete}>Delete Student</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </Layout>
  )
}
