import React, { useEffect, useState } from 'react'
import { fetchAdminFinancialAnalytics } from '../../lib/adminApi'

const DEMO_METRICS = [
  { label: 'Monthly Revenue', value: '$45,280', change: '+12%' },
  { label: 'Total Bookings', value: '156', change: '+8%' },
  { label: 'Fleet Utilization', value: '67%', change: '+3%' },
  { label: 'Damage Reports', value: '12', change: '-15%' },
]

const AdminReportsPage: React.FC = () => {
  const [metrics, setMetrics] = useState(DEMO_METRICS)
  const [source, setSource] = useState<'demo' | 'api'>('demo')

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const s = await fetchAdminFinancialAnalytics()
      if (cancelled || !s) return
      setSource('api')
      setMetrics([
        {
          label: 'Total revenue (period)',
          value: `$${s.totalRevenue.toLocaleString(undefined, { maximumFractionDigits: 0 })}`,
          change: `${s.revenueGrowth >= 0 ? '+' : ''}${s.revenueGrowth.toFixed(1)}%`,
        },
        {
          label: 'Total bookings',
          value: String(s.totalBookings),
          change: `${s.bookingGrowth >= 0 ? '+' : ''}${s.bookingGrowth.toFixed(1)}%`,
        },
        {
          label: 'Avg booking value',
          value: `$${s.averageBookingValue.toFixed(2)}`,
          change: '—',
        },
        { label: 'Net revenue (demo slot)', value: '—', change: '—' },
      ])
    })()
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="admin-dashboard">
      <div className="admin-container">
        <div className="dashboard-header">
          <h1>Reports</h1>
          <p>Business analytics and performance metrics.</p>
        </div>

        {source === 'demo' && (
          <p style={{ fontSize: 14, color: '#666', marginBottom: '1rem' }}>
            Showing placeholders until <code>GET /admin/analytics/financial</code> succeeds (Fleet Manager role,{' '}
            <code>VITE_API_BASE_URL</code>).
          </p>
        )}

        <div className="metrics-grid">
          {metrics.map((m, i) => (
            <div key={i} className="metric-card">
              <div className="metric-content">
                <h3>{m.value}</h3>
                <p>{m.label}</p>
                <span
                  className={`metric-change ${m.change.startsWith('+') ? 'positive' : m.change.startsWith('-') ? 'negative' : 'neutral'}`}
                >
                  {m.change} from last month
                </span>
              </div>
            </div>
          ))}
        </div>

        <div className="dashboard-section full-width" style={{ marginTop: '2rem' }}>
          <div className="section-header">
            <h2>Report Export</h2>
          </div>
          <p style={{ color: '#666', margin: '1rem 0' }}>
            Detailed report generation with CSV/PDF export will be available once the backend analytics pipeline is connected.
          </p>
          <button className="btn-small btn-primary" disabled style={{ opacity: 0.5 }}>
            Generate Report
          </button>
        </div>
      </div>
    </div>
  )
}

export default AdminReportsPage
