import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useReactToPrint } from 'react-to-print'
import Layout from '../../components/layout/Layout'
import api from '../../utils/api'
import toast from 'react-hot-toast'

export default function ReceiptViewPage() {
  const { id }    = useParams()
  const navigate  = useNavigate()
  const [receipt, setReceipt] = useState(null)
  const [loading, setLoading] = useState(true)
  const printRef = useRef()

  useEffect(() => {
    api.get(`/fees/receipts/${id}`)
      .then(res => setReceipt(res.data))
      .catch(() => { toast.error('Receipt not found'); navigate('/parent/receipts') })
      .finally(() => setLoading(false))
  }, [id])

  const handlePrint = useReactToPrint({
    content: () => printRef.current,
    documentTitle: `Receipt_${receipt?.receipt_number}`
  })

  if (loading) return (
    <Layout title="Receipt">
      <div style={{ padding: 40, textAlign: 'center', color: 'var(--gray-400)' }}>Loading...</div>
    </Layout>
  )

  return (
    <Layout title="Payment Receipt">
      <div className="page-header">
        <div><h1>Payment Receipt</h1></div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-secondary" onClick={() => navigate('/parent/receipts')}>
            Back
          </button>
          <button className="btn btn-primary no-print" onClick={handlePrint}>
            Print / Download PDF
          </button>
        </div>
      </div>

      {receipt && (
        <div ref={printRef} style={{ maxWidth: 600, margin: '0 auto' }}>
          <div style={{ background: '#fff', border: '1px solid var(--gray-200)', borderRadius: 'var(--radius)', overflow: 'hidden' }}>

            {/* Header */}
            <div style={{ background: 'var(--primary)', color: '#fff', padding: '24px 28px', textAlign: 'center' }}>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', opacity: 0.8, marginBottom: 4 }}>
                Official Payment Receipt
              </div>
              <h1 style={{ fontSize: 20, fontWeight: 800, textTransform: 'uppercase', margin: 0 }}>
                QIBLAH HEIGHTS COLLEGE
              </h1>
              <div style={{ fontSize: 13, opacity: 0.8, marginTop: 6 }}>School Fees Payment Receipt</div>
            </div>

            {/* Receipt number banner */}
            <div style={{ background: 'var(--success-light)', borderBottom: '1px solid var(--gray-200)', padding: '10px 28px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--success)' }}>Receipt Number</span>
              <span style={{ fontWeight: 800, fontSize: 15, color: 'var(--success)' }}>{receipt.receipt_number}</span>
            </div>

            {/* Details grid */}
            <div style={{ padding: '20px 28px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              {[
                { lbl: 'Student Name',         val: receipt.student_name },
                { lbl: 'Admission Number',     val: receipt.admission_number },
                { lbl: 'Class',                val: receipt.class_name || '—' },
                { lbl: 'Parent / Guardian',    val: receipt.parent_name || '—' },
                { lbl: 'Academic Session',     val: receipt.session_name },
                { lbl: 'Term',                 val: receipt.term },
                { lbl: 'Payment Date',         val: receipt.payment_date },
                { lbl: 'Payment Method',       val: receipt.payment_method?.replace('_',' ') },
                { lbl: 'Transaction Reference', val: receipt.payment_reference || '—' },
                { lbl: 'Receipt Generated',    val: new Date(receipt.generated_at).toLocaleDateString('en-GB') },
              ].map(item => (
                <div key={item.lbl} style={{ padding: '10px 0', borderBottom: '1px solid var(--gray-100)' }}>
                  <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--gray-500)', marginBottom: 4 }}>{item.lbl}</div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--gray-800)' }}>{item.val}</div>
                </div>
              ))}
            </div>

            {/* Amount box */}
            <div style={{ margin: '0 28px 20px', background: 'var(--primary-light)', borderRadius: 'var(--radius-sm)', padding: '16px 20px', border: '1px solid #c3ddfd', textAlign: 'center' }}>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--primary)', marginBottom: 6 }}>
                Amount Paid
              </div>
              <div style={{ fontSize: 36, fontWeight: 900, color: 'var(--primary-dark)' }}>
                ₦{Number(receipt.amount).toLocaleString()}
              </div>
            </div>

            {/* Notes */}
            {receipt.notes && (
              <div style={{ margin: '0 28px 20px', padding: '10px 14px', background: 'var(--gray-50)', borderRadius: 'var(--radius-sm)', borderLeft: '3px solid var(--gray-300)' }}>
                <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: 'var(--gray-500)', marginBottom: 4 }}>Notes</div>
                <div style={{ fontSize: 13, color: 'var(--gray-700)' }}>{receipt.notes}</div>
              </div>
            )}

            {/* Stamp area */}
            <div style={{ padding: '16px 28px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderTop: '1px solid var(--gray-200)' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ height: 40 }} />
                <div style={{ borderTop: '1px solid var(--gray-400)', paddingTop: 6, fontSize: 11, color: 'var(--gray-500)' }}>Authorised Signature</div>
              </div>

              <div style={{ textAlign: 'center' }}>
                <div style={{
                  width: 80, height: 80, borderRadius: '50%',
                  border: '3px double var(--primary)',
                  display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center',
                  padding: 8
                }}>
                  <div style={{ fontSize: 7, fontWeight: 800, textTransform: 'uppercase', color: 'var(--primary)', lineHeight: 1.4, textAlign: 'center' }}>
                    QIBLAH<br/>HEIGHTS<br/>COLLEGE
                  </div>
                  <div style={{ width: 40, height: 1, background: 'var(--primary)', margin: '3px 0' }} />
                  <div style={{ fontSize: 6, color: 'var(--gray-400)', textTransform: 'uppercase' }}>Official Seal</div>
                </div>
              </div>

              <div style={{ textAlign: 'center' }}>
                <div style={{ height: 40 }} />
                <div style={{ borderTop: '1px solid var(--gray-400)', paddingTop: 6, fontSize: 11, color: 'var(--gray-500)' }}>Accounts Officer</div>
              </div>
            </div>

            <div style={{ padding: '10px 28px', background: 'var(--gray-50)', borderTop: '1px solid var(--gray-200)', textAlign: 'center', fontSize: 11, color: 'var(--gray-400)' }}>
              This is an official computer-generated receipt. No signature required.
            </div>
          </div>
        </div>
      )}
    </Layout>
  )
}
