import { useState, useEffect } from 'react'
import Layout from '../../components/layout/Layout'
import api from '../../utils/api'
import toast from 'react-hot-toast'

const TERMS = ['First Term', 'Second Term', 'Third Term']

export default function FeeManagePage() {
  const [structures, setStructures] = useState([])
  const [classes, setClasses]       = useState([])
  const [sessions, setSessions]     = useState([])
  const [summary, setSummary]       = useState(null)
  const [loading, setLoading]       = useState(true)
  const [showAdd, setShowAdd]       = useState(false)
  const [form, setForm]             = useState({ name:'', class_id:'', session_id:'', term:'First Term', amount:'', description:'' })
  const [categories, setCategories] = useState([{ name:'', amount:'' }])
  const [saving, setSaving]         = useState(false)
  const [genModal, setGenModal]     = useState(null)
  const [genClassId, setGenClassId] = useState('')
  const [generating, setGenerating] = useState(false)
  const [filterSession, setFilterSession] = useState('')

  const fetchAll = () => {
    const params = filterSession ? { session_id: filterSession } : {}
    Promise.all([
      api.get('/fees/structures', { params }),
      api.get('/classes'),
      api.get('/results/sessions/all'),
      api.get('/fees/summary/admin', { params })
    ]).then(([s, c, ses, sum]) => {
      setStructures(s.data); setClasses(c.data); setSessions(ses.data); setSummary(sum.data)
      const curr = ses.data.find(x => x.is_current)
      if (curr && !filterSession) setFilterSession(String(curr.id))
      if (curr && !form.session_id) setForm(f => ({ ...f, session_id: String(curr.id) }))
    }).catch(() => toast.error('Failed to load data'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchAll() }, [filterSession])

  const addCategory = () => setCategories(c => [...c, { name:'', amount:'' }])
  const updateCategory = (i, field, val) => setCategories(c => { const n=[...c]; n[i]={...n[i],[field]:val}; return n })
  const removeCategory = (i) => setCategories(c => c.filter((_,idx)=>idx!==i))

  const handleAdd = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      await api.post('/fees/structures', { ...form, categories: categories.filter(c=>c.name&&c.amount) })
      toast.success('Fee structure created')
      setShowAdd(false)
      setForm({ name:'', class_id:'', session_id: form.session_id, term:'First Term', amount:'', description:'' })
      setCategories([{ name:'', amount:'' }])
      fetchAll()
    } catch (err) { toast.error(err.response?.data?.error || 'Failed to create') }
    finally { setSaving(false) }
  }

  const handleGenerate = async () => {
    if (!genClassId) return toast.error('Select a class')
    setGenerating(true)
    try {
      const res = await api.post('/fees/invoices/generate', { fee_structure_id: genModal.id, class_id: genClassId })
      toast.success(res.data.message)
      setGenModal(null); setGenClassId('')
    } catch (err) { toast.error(err.response?.data?.error || 'Failed to generate invoices') }
    finally { setGenerating(false) }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this fee structure?')) return
    try { await api.delete(`/fees/structures/${id}`); toast.success('Deleted'); fetchAll() }
    catch (err) { toast.error(err.response?.data?.error || 'Failed to delete') }
  }

  return (
    <Layout title="Fee Management">
      <div className="page-header">
        <div><h1>Fee Management</h1><p>Create fee structures and generate invoices</p></div>
        <button className="btn btn-primary" onClick={() => setShowAdd(true)}>Create Fee Structure</button>
      </div>

      {/* Summary */}
      {summary && (
        <div className="stats-grid" style={{ marginBottom: 20 }}>
          {[
            { label: 'Total Expected',   value: `₦${Number(summary.total_expected||0).toLocaleString()}`,   accent: 'blue'   },
            { label: 'Total Collected',  value: `₦${Number(summary.total_collected||0).toLocaleString()}`,  accent: 'green'  },
            { label: 'Outstanding',      value: `₦${Number(summary.total_outstanding||0).toLocaleString()}`, accent: 'red'    },
            { label: 'Pending Payments', value: summary.pendingPayments || 0,                               accent: 'yellow' },
          ].map(s => (
            <div className="stat-card" key={s.label}>
              <span className={`stat-accent ${s.accent}`} />
              <div><div className="stat-label">{s.label}</div>
              <div className="stat-value" style={{ fontSize: 18 }}>{s.value}</div></div>
            </div>
          ))}
        </div>
      )}

      {/* Filter */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div className="form-group" style={{ margin: 0, flex: 1, maxWidth: 250 }}>
            <label className="form-label">Filter by Session</label>
            <select className="form-control" value={filterSession} onChange={e => setFilterSession(e.target.value)}>
              <option value="">All Sessions</option>
              {sessions.map(s => <option key={s.id} value={s.id}>{s.name}{s.is_current?' (Current)':''}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Fee structures */}
      <div className="card">
        <div className="card-header"><h3 className="card-title">Fee Structures</h3></div>
        {loading ? <div className="empty-state"><p>Loading...</p></div>
        : !structures.length ? (
          <div className="empty-state"><p className="empty-state-title">No fee structures yet</p><p>Create one to get started.</p></div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr><th>Name</th><th>Class</th><th>Session / Term</th><th>Amount</th><th>Invoices</th><th>Status</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {structures.map(s => (
                  <tr key={s.id}>
                    <td style={{ fontWeight: 500 }}>{s.name}</td>
                    <td>{s.class_name || 'All Classes'}</td>
                    <td>{s.session_name} · {s.term}</td>
                    <td style={{ fontWeight: 700 }}>₦{Number(s.amount).toLocaleString()}</td>
                    <td><span className="badge badge-gray">{s.invoice_count}</span></td>
                    <td><span className={`badge ${s.is_active ? 'badge-green' : 'badge-gray'}`}>{s.is_active ? 'Active' : 'Inactive'}</span></td>
                    <td>
                      <div className="td-actions">
                        <button className="btn btn-primary btn-sm" onClick={() => { setGenModal(s); setGenClassId('') }}>Generate Invoices</button>
                        <button className="btn btn-danger btn-sm" onClick={() => handleDelete(s.id)}>Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Fee Structure Modal */}
      {showAdd && (
        <div className="modal-overlay" onClick={() => setShowAdd(false)}>
          <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Create Fee Structure</h3>
              <button className="modal-close" onClick={() => setShowAdd(false)}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <div className="modal-body">
              <form onSubmit={handleAdd}>
                <div className="form-row">
                  <div className="form-group"><label className="form-label">Fee Name *</label>
                    <input className="form-control" value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} placeholder="e.g. First Term Fees 2024/2025" required /></div>
                  <div className="form-group"><label className="form-label">Total Amount (₦) *</label>
                    <input type="number" className="form-control" value={form.amount} onChange={e=>setForm(f=>({...f,amount:e.target.value}))} placeholder="e.g. 70000" required /></div>
                </div>
                <div className="form-row-3">
                  <div className="form-group"><label className="form-label">Session *</label>
                    <select className="form-control" value={form.session_id} onChange={e=>setForm(f=>({...f,session_id:e.target.value}))} required>
                      <option value="">— Select —</option>
                      {sessions.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}
                    </select></div>
                  <div className="form-group"><label className="form-label">Term *</label>
                    <select className="form-control" value={form.term} onChange={e=>setForm(f=>({...f,term:e.target.value}))}>
                      {TERMS.map(t=><option key={t}>{t}</option>)}
                    </select></div>
                  <div className="form-group"><label className="form-label">Class (leave blank for all)</label>
                    <select className="form-control" value={form.class_id} onChange={e=>setForm(f=>({...f,class_id:e.target.value}))}>
                      <option value="">All Classes</option>
                      {classes.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
                    </select></div>
                </div>
                <div className="form-group"><label className="form-label">Description</label>
                  <input className="form-control" value={form.description} onChange={e=>setForm(f=>({...f,description:e.target.value}))} placeholder="Optional" /></div>

                {/* Fee categories breakdown */}
                <div className="divider" />
                <p style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>Fee Breakdown (Optional)</p>
                {categories.map((cat, i) => (
                  <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 8, alignItems: 'flex-end' }}>
                    <div className="form-group" style={{ margin: 0, flex: 2 }}>
                      {i === 0 && <label className="form-label">Category Name</label>}
                      <input className="form-control" value={cat.name} onChange={e=>updateCategory(i,'name',e.target.value)} placeholder="e.g. Tuition Fee" />
                    </div>
                    <div className="form-group" style={{ margin: 0, flex: 1 }}>
                      {i === 0 && <label className="form-label">Amount (₦)</label>}
                      <input type="number" className="form-control" value={cat.amount} onChange={e=>updateCategory(i,'amount',e.target.value)} placeholder="0" />
                    </div>
                    {categories.length > 1 && (
                      <button type="button" className="btn btn-ghost btn-sm" onClick={() => removeCategory(i)} style={{ marginBottom: 2 }}>×</button>
                    )}
                  </div>
                ))}
                <button type="button" className="btn btn-ghost btn-sm" onClick={addCategory}>+ Add Category</button>

                <div className="form-actions">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowAdd(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary" disabled={saving}>{saving?'Creating...':'Create Fee Structure'}</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Generate Invoices Modal */}
      {genModal && (
        <div className="modal-overlay" onClick={() => setGenModal(null)}>
          <div className="modal" style={{ maxWidth: 420 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Generate Invoices — {genModal.name}</h3>
              <button className="modal-close" onClick={() => setGenModal(null)}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <div className="modal-body">
              <div style={{ padding: '10px 14px', background: 'var(--gray-50)', borderRadius: 'var(--radius-sm)', marginBottom: 16, fontSize: 13 }}>
                Amount: <strong>₦{Number(genModal.amount).toLocaleString()}</strong> &nbsp;|&nbsp; {genModal.session_name} · {genModal.term}
              </div>
              <div className="form-group"><label className="form-label">Select Class *</label>
                <select className="form-control" value={genClassId} onChange={e=>setGenClassId(e.target.value)}>
                  <option value="">— Select Class —</option>
                  {classes.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <p className="text-sm text-muted">This will create an invoice for every student in the selected class. Existing invoices will be skipped.</p>
              <div className="form-actions">
                <button className="btn btn-secondary" onClick={() => setGenModal(null)}>Cancel</button>
                <button className="btn btn-primary" onClick={handleGenerate} disabled={generating}>{generating?'Generating...':'Generate Invoices'}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </Layout>
  )
}
