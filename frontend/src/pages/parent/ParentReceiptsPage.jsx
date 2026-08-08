import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../../components/layout/Layout'
import api from '../../utils/api'
import toast from 'react-hot-toast'

export default function ParentReceiptsPage() {
  const [receipts, setReceipts] = useState([])
  const [loading, setLoading]   = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    api.get('/fees/receipts/parent')
      .then(res => setReceipts(res.data))
      .catch(() => toast.error('Failed to load receipts'))
      .finally(() => setLoading(false))
  }, [])

  return (
    <Layout title="My Receipts">
      <div className="page-header">
        <div><h1>Payment Receipts</h1><p>All confirmed payment receipts</p></div>
      </div>

      <div className="card">
        {loading ? (
          <div className="empty-state"><p>Loading...</p></div>
        ) : !receipts.length ? (
          <div className="empty-state">
            <p className="empty-state-title">No receipts yet</p>
            <p>Receipts are generated after admin approves your payment.</p>
          </div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Receipt No.</th>
                  <th>Student</th>
                  <th>Session / Term</th>
                  <th>Amount</th>
                  <th>Method</th>
                  <th>Date</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {receipts.map(r => (
                  <tr key={r.id}>
                    <td><span className="badge badge-blue">{r.receipt_number}</span></td>
                    <td style={{ fontWeight: 500 }}>{r.student_name}</td>
                    <td>{r.session_name} · {r.term}</td>
                    <td style={{ fontWeight: 700 }}>₦{Number(r.amount).toLocaleString()}</td>
                    <td>{r.payment_method?.replace('_',' ')}</td>
                    <td>{r.payment_date}</td>
                    <td>
                      <button className="btn btn-primary btn-sm"
                        onClick={() => navigate(`/parent/receipts/${r.id}`)}>
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Layout>
  )
}
