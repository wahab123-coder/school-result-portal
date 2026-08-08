import { useState, useEffect } from 'react'
import Layout from '../../components/layout/Layout'
import api from '../../utils/api'
import toast from 'react-hot-toast'

export default function ParentFeesPage() {
  const [children, setChildren]   = useState([])
  const [invoices, setInvoices]   = useState([])
  const [selectedChild, setSelectedChild] = useState('')
  const [loading, setLoading]     = useState(true)
  const [payModal, setPayModal]   = useState(null)
  const [payForm, setPayForm]     = useState({ amount: '', payment_method: 'bank_transfer', payment_reference: '', payment_date: '', notes: '' })
  const [evidenceFile, setEvidenceFile] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    api.get('/parents/me')
      .then(res => {
        setChildren(res.data.children || [])
        if (res.data.children?.length) {
          setSelectedChild(String(res.data.children[0].id))
        }
      })
      .catch(() => toast.error('Failed to load profile'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (!selectedChild) return
    api.get(`/fees/invoices/student/${selectedChild}`)
      .then(res => setInvoices(res.data))
      .catch(() => toast.error('Failed to load invoices'))
  }, [selectedChild])

  const openPayModal = (invoice) => {
    setPayModal(invoice)
    setPayForm({
      amount: invoice.total_amount - invoice.amount_paid,
      payment_method: 'bank_transfer',
      payment_reference: '', payment_date: '', notes: ''
    })
    setEvidenceFile(null)
  }

  const handleSubmitPayment = async (e) => {
    e.preventDefault()
    if (!payForm.payment_date) return toast.error('Please enter the payment date')
    if (!payForm.amount || Number(payForm.amount) <= 0) return toast.error('Please enter a valid amount')

    setSubmitting(true)
    try {
      const formData = new FormData()
      formData.append('invoice_id',        payModal.id)
      formData.append('amount',            payForm.amount)
      formData.append('payment_method',    payForm.payment_method)
      formData.append('payment_reference', payForm.payment_reference)
      formData.append('payment_date',      payForm.payment_date)
      formData.append('notes',             payForm.notes)
      if (evidenceFile) formData.append('evidence', evidenceFile)

      await api.post('/fees/payments', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      toast.success('Payment submitted! Awaiting admin approval.')
      setPayModal(null)
      // Refresh invoices
      const res = await api.get(`/fees/invoices/student/${selectedChild}`)
      setInvoices(res.data)
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to submit payment')
    } finally {
      setSubmitting(false)
    }
  }

  const statusBadge = (status) => {
    if (status === 'paid')    return 'badge-green'
    if (status === 'partial') return 'badge-yellow'
    return 'badge-red'
  }

  if (loading) return (
    <Layout title="School Fees">
      <div style={{ padding: 40, textAlign: 'center', color: 'var(--gray-400)' }}>Loading...</div>
    </Layout>
  )

  const child = children.find(c => String(c.id) === selectedChild)

  return (
    <Layout title="School Fees">
      <div className="page-header">
        <div><h1>School Fees</h1><p>View and pay school fees for your children</p></div>
      </div>

      {/* Child selector */}
      {children.length > 1 && (
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="form-group" style={{ margin: 0, maxWidth: 300 }}>
            <label className="form-label">Select Child</label>
            <select className="form-control" value={selectedChild}
              onChange={e => setSelectedChild(e.target.value)}>
              {children.map(c => <option key={c.id} value={c.id}>{c.full_name} — {c.class_name}</option>)}
            </select>
          </div>
        </div>
      )}

      {/* Summary */}
      {child && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(160px,1fr))', gap: 14, marginBottom: 20 }}>
          {[
            { label: 'Total Fees',    value: `₦${invoices.reduce((a,i) => a+i.total_amount,0).toLocaleString()}`, color: 'var(--gray-800)' },
            { label: 'Amount Paid',   value: `₦${invoices.reduce((a,i) => a+i.amount_paid,0).toLocaleString()}`,  color: 'var(--success)' },
            { label: 'Outstanding',   value: `₦${invoices.reduce((a,i) => a+(i.total_amount-i.amount_paid),0).toLocaleString()}`, color: 'var(--danger)' },
          ].map(s => (
            <div key={s.label} className="stat-card">
              <div>
                <div className="stat-label">{s.label}</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: s.color, marginTop: 4 }}>{s.value}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Invoices */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Fee Invoices {child ? `— ${child.full_name}` : ''}</h3>
        </div>
        {!invoices.length ? (
          <div className="empty-state">
            <p className="empty-state-title">No invoices found</p>
            <p>No fees have been assigned yet. Contact the school admin.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {invoices.map(inv => (
              <div key={inv.id} style={{ border: '1px solid var(--gray-200)', borderRadius: 'var(--radius-sm)', overflow: 'hidden' }}>
                {/* Invoice header */}
                <div style={{ padding: '12px 16px', background: 'var(--gray-50)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{inv.fee_name}</div>
                    <div style={{ fontSize: 12, color: 'var(--gray-500)', marginTop: 2 }}>
                      {inv.session_name} · {inv.term}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span className={`badge ${statusBadge(inv.status)}`}>{inv.status}</span>
                    {inv.status !== 'paid' && (
                      <button className="btn btn-primary btn-sm" onClick={() => openPayModal(inv)}>
                        Pay Now
                      </button>
                    )}
                  </div>
                </div>

                {/* Fee breakdown */}
                <div style={{ padding: '12px 16px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(140px,1fr))', gap: 12 }}>
                  {[
                    { lbl: 'Total Fee',   val: `₦${inv.total_amount.toLocaleString()}` },
                    { lbl: 'Paid',        val: `₦${inv.amount_paid.toLocaleString()}`,  color: 'var(--success)' },
                    { lbl: 'Outstanding', val: `₦${(inv.total_amount-inv.amount_paid).toLocaleString()}`, color: 'var(--danger)' },
                  ].map(item => (
                    <div key={item.lbl}>
                      <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--gray-500)' }}>{item.lbl}</div>
                      <div style={{ fontSize: 16, fontWeight: 700, color: item.color||'var(--gray-800)', marginTop: 3 }}>{item.val}</div>
                    </div>
                  ))}
                </div>

                {/* Payment history */}
                {inv.payments?.length > 0 && (
                  <div style={{ padding: '0 16px 12px' }}>
                    <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--gray-500)', marginBottom: 8 }}>Payment History</div>
                    {inv.payments.map(p => (
                      <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '5px 0', borderBottom: '1px solid var(--gray-100)' }}>
                        <span>{p.payment_date} · {p.payment_method?.replace('_',' ')}</span>
                        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                          <span style={{ fontWeight: 600 }}>₦{Number(p.amount).toLocaleString()}</span>
                          <span className={`badge ${p.status==='approved'?'badge-green':p.status==='rejected'?'badge-red':'badge-yellow'}`}>{p.status}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pay Modal */}
      {payModal && (
        <div className="modal-overlay" onClick={() => setPayModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Submit Payment — {payModal.fee_name}</h3>
              <button className="modal-close" onClick={() => setPayModal(null)}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <div className="modal-body">
              <div style={{ padding: '10px 14px', background: 'var(--gray-50)', borderRadius: 'var(--radius-sm)', marginBottom: 16, fontSize: 13 }}>
                Outstanding: <strong style={{ color: 'var(--danger)' }}>₦{(payModal.total_amount - payModal.amount_paid).toLocaleString()}</strong>
              </div>
              <form onSubmit={handleSubmitPayment} autoComplete="off">
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Amount Paid (₦) *</label>
                    <input type="number" className="form-control" value={payForm.amount}
                      onChange={e => setPayForm(f=>({...f,amount:e.target.value}))}
                      min={1} max={payModal.total_amount - payModal.amount_paid} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Payment Date *</label>
                    <input type="date" className="form-control" value={payForm.payment_date}
                      onChange={e => setPayForm(f=>({...f,payment_date:e.target.value}))} required />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Payment Method</label>
                    <select className="form-control" value={payForm.payment_method}
                      onChange={e => setPayForm(f=>({...f,payment_method:e.target.value}))}>
                      <option value="bank_transfer">Bank Transfer</option>
                      <option value="pos">POS</option>
                      <option value="cash">Cash</option>
                      <option value="mobile_banking">Mobile Banking</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Transaction Reference</label>
                    <input className="form-control" value={payForm.payment_reference}
                      onChange={e => setPayForm(f=>({...f,payment_reference:e.target.value}))}
                      placeholder="e.g. TXN123456" />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Upload Payment Evidence (JPG, PNG or PDF)</label>
                  <input type="file" className="form-control" accept=".jpg,.jpeg,.png,.pdf"
                    onChange={e => setEvidenceFile(e.target.files[0])} />
                  <div style={{ fontSize: 11, color: 'var(--gray-400)', marginTop: 4 }}>Max 5MB. Upload your bank receipt or transfer confirmation.</div>
                </div>
                <div className="form-group">
                  <label className="form-label">Additional Notes</label>
                  <textarea className="form-control" value={payForm.notes} rows={2}
                    onChange={e => setPayForm(f=>({...f,notes:e.target.value}))}
                    placeholder="Optional remarks" />
                </div>
                <div className="form-actions">
                  <button type="button" className="btn btn-secondary" onClick={() => setPayModal(null)}>Cancel</button>
                  <button type="submit" className="btn btn-primary" disabled={submitting}>
                    {submitting ? 'Submitting...' : 'Submit Payment'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </Layout>
  )
}
