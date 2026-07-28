import { useNavigate } from 'react-router-dom'

export default function NotFound() {
  const navigate = useNavigate()
  return (
    <div className="error-page">
      <div style={{ fontSize: 14, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--primary)', marginBottom: 8 }}>
        404
      </div>
      <h1 style={{ fontSize: 26, fontWeight: 700, color: 'var(--gray-900)' }}>Page Not Found</h1>
      <p style={{ color: 'var(--gray-500)', fontSize: 14, marginTop: 4 }}>
        The page you are looking for does not exist.
      </p>
      <button className="btn btn-primary" style={{ marginTop: 20 }} onClick={() => navigate(-1)}>
        Go Back
      </button>
    </div>
  )
}
