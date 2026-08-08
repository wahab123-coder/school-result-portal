import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../../components/layout/Layout'
import api from '../../utils/api'
import toast from 'react-hot-toast'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000'

export default function PaymentsApprovalPage() {
  const [payments, setPayments]   = useState([])
  const [loading, setLoading]     = useState(true)
  const [filter, setFilter]       = useState('pending')
  const [rejectModal, setRejectModal] = useState(null)
  const [rejectReason, setRejectReason] = useState('')
  const navigate = useNavigate()

  const fetchPayments = () => {
    api.get('/fees/payments', { params: { status: filter || undefined } })
      .then(res => setPayments(res.data))
      .catch(() => toast.error('Failed to load payments'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchPayments() }, [filter])

  const handleApprove = async (id) => {
    try {
      const res = await api.put(`/fees/payments/${id}/approve`)
      toast.success(res.data.message)
      fetchPayments()
    } catch (err) { toast.error(err.response?.data?.error || 'Failed to approve') }
  }

  const handleReject = async () => {
    if (!rejectReason.trim()) return toast.error('Please enter a rejection reason')
    try {
      await api.put(`/fees/payments/${rejectModal}/reject`, { rejection_reason: rejectReason })
      toast.success('Payment rejected')
      setRejectModal(null); setRejectReason('')
      fetchPayments()
    } catch (err) { toast.error(err.response?.data?.error || 'Failed to reject') }
  }

  const statusBadge = (s) => s === 'approved' ? 'badge-green' : s === 'rejected' ? 'badge-red' : 'badge-yellow'

  return (
    <Layout title="Payments">
      <div className="page-header">
        <div>
          <h1>Payments</h1>
          <p>Review and approve parent payment submissions</p>
        </div>
      </div>

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20, background: 'var(--gray-100)', padding: 4, borderRadius: 'var(--radius-sm)', width: 'fit-content' }}>
        {[['pending','Pending'],['approved','Approved'],['rejected','Rejected'],['','All']].map(([val,lbl]) => (
          <button key={val} onClick={() => setFilter(val)}
            className={`btn btn-sm ${filter === val ? 'btn-primary' : 'btn-ghost'}`}
            style={{ borderRadius: 4 }}>
            {lbl}
          </button>
        ))}
      </div>

      <div className="card">
        {loading ? <div className="empty-state"><p>Loading...</p></div>
        : !payments.length ? (
          <div className="empty-state">
            <p className="empty-state-title">No {filter} payments</p>
            <p>There are no {filter || ''} payments at this time.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {payments.map(p => (
              <div key={p.id} style={{ border: '1px solid var(--gray-200)', borderRadius: 'var(--radius-sm)', overflow: 'hidden' }}>
                <div style={{ padding: '12px 16px', background: 'var(--gray-50)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 10 }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{p.student_name}</div>
                    <div style={{ fontSize: 12, color: 'var(--gray-500)', marginTop: 2 }}>
                      {p.admission_number} &nbsp;·&nbsp; {p.session_name} — {p.term}
                      {p.parent_name && ` · Parent: ${p.parent_name}`}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span className={`badge ${statusBadge(p.status)}`}>{p.status}</span>
                    {p.status === 'pending' && (
                      <>
                        <button className="btn btn-success btn-sm" onClick={() => handleApprove(p.id)}>Approve</button>
                        <button className="btn btn-danger btn-sm" onClick={() => { setRejectModal(p.id); setRejectReason('') }}>Reject</button>
                      </>
                    )}
                  </div>
                </div>

                <div style={{ padding: '12px 16px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(150px,1fr))', gap: 12 }}>
                  {[
                    { lbl: 'Amount', val: `₦${Number(p.amount).toLocaleString()}`, bold: true },
                    { lbl: 'Method', val: p.payment_method?.replace('_',' ') },
                    { lbl: 'Reference', val: p.payment_reference || '—' },
                    { lbl: 'Payment Date', val: p.payment_date },
                    { lbl: 'Submitted', val: new Date(p.created_at).toLocaleDateString('en-GB') },
                  ].map(item => (
                    <div key={item.lbl}>
                      <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--gray-500)' }}>{item.lbl}</div>
                      <div style={{ fontSize: 13, fontWeight: item.bold ? 700 : 500, color: item.bold ? 'var(--gray-900)' : 'var(--gray-700)', marginTop: 3 }}>{item.val}</div>
                    </div>
                  ))}
                </div>

                {/* Evidence */}
                {p.evidence_file && (
                  <div style={{ padding: '0 16px 12px' }}>
                    <a href={`${API_BASE}${p.evidence_file}`} target="_blank" rel="noopener noreferrer"
                      className="btn btn-secondary btn-sm">
                      View Payment Evidence
                    </a>
                  </div>
                )}

                {/* Rejection reason */}
                {p.status === 'rejected' && p.rejection_reason && (
                  <div style={{ padding: '0 16px 12px' }}>
                    <div style={{ padding: '8px 12px', background: 'var(--danger-light)', borderRadius: 'var(--radius-sm)', fontSize: 13, color: 'var(--danger)' }}>
                      Rejection reason: {p.rejection_reason}
                    </div>
                  </div>
                )}

                {/* Approved receipt link */}
                {p.status === 'approved' && (
                  <div style={{ padding: '0 16px 12px' }}>
                    <span style={{ fontSize: 12, color: 'var(--success)', fontWeight: 600 }}>
                      Payment approved — receipt generated
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Reject Modal */}
      {rejectModal && (
        <div className="modal-overlay" onClick={() => setRejectModal(null)}>
          <div className="modal" style={{ maxWidth: 400 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Reject Payment</h3>
              <button className="modal-close" onClick={() => setRejectModal(null)}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Reason for Rejection *</label>
                <textarea className="form-control" rows={3} value={rejectReason}
                  onChange={e => setRejectReason(e.target.value)}
                  placeholder="e.g. Payment evidence is not clear. Please resubmit." />
              </div>
              <div className="form-actions">
                <button className="btn btn-secondary" onClick={() => setRejectModal(null)}>Cancel</button>
                <button className="btn btn-danger" onClick={handleReject}>Reject Payment</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </Layout>
  )
}
