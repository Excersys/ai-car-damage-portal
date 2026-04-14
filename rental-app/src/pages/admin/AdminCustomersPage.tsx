import { useEffect, useState } from 'react'
import { fetchAdminUsers, type AdminUserRow } from '../../lib/adminApi'

interface Customer {
  id: string
  name: string
  email: string
  phone: string
  totalBookings: number
  status: 'active' | 'inactive' | 'flagged'
  joinDate: string
}

const MOCK_CUSTOMERS: Customer[] = [
  { id: '1', name: 'John Doe', email: 'john@example.com', phone: '(555) 123-4567', totalBookings: 5, status: 'active', joinDate: '2025-06-15' },
  { id: '2', name: 'Jane Smith', email: 'jane@example.com', phone: '(555) 234-5678', totalBookings: 3, status: 'active', joinDate: '2025-07-20' },
  { id: '3', name: 'Mike Johnson', email: 'mike@example.com', phone: '(555) 345-6789', totalBookings: 8, status: 'flagged', joinDate: '2025-04-10' },
  { id: '4', name: 'Sarah Wilson', email: 'sarah@example.com', phone: '(555) 456-7890', totalBookings: 1, status: 'inactive', joinDate: '2025-09-01' },
]

function mapApiUser(u: AdminUserRow): Customer {
  const name = [u.firstName, u.lastName].filter(Boolean).join(' ').trim() || u.email
  const st = (u.status || '').toLowerCase()
  const status: Customer['status'] =
    st === 'inactive' ? 'inactive' : st === 'flagged' ? 'flagged' : 'active'
  return {
    id: u.id,
    name,
    email: u.email,
    phone: '—',
    totalBookings: u.totalBookings ?? 0,
    status,
    joinDate: u.joinDate ? u.joinDate.slice(0, 10) : '—',
  }
}

const AdminCustomersPage: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('')
  const [customers, setCustomers] = useState<Customer[]>(MOCK_CUSTOMERS)
  const [dataSource, setDataSource] = useState<'demo' | 'api'>('demo')

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const users = await fetchAdminUsers()
      if (cancelled || users === null) return
      setCustomers(users.map(mapApiUser))
      setDataSource('api')
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const getStatusColor = (status: Customer['status']) => {
    switch (status) {
      case 'active': return '#4caf50'
      case 'inactive': return '#999'
      case 'flagged': return '#f44336'
    }
  }

  const filtered = customers.filter(
    c => c.name.toLowerCase().includes(searchQuery.toLowerCase()) || c.email.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="admin-dashboard">
      <div className="admin-container">
        <div className="dashboard-header">
          <h1>Customers</h1>
          <p>Manage customer accounts and verification status.</p>
        </div>

        {dataSource === 'demo' && (
          <p style={{ fontSize: 14, color: '#666', marginBottom: '1rem' }}>
            Showing sample rows. Configure <code>VITE_API_BASE_URL</code> and sign in with a Super Admin account to load{' '}
            <code>GET /admin/users</code>.
          </p>
        )}

        <div className="dashboard-section full-width">
          <div className="section-header">
            <h2>All Customers</h2>
            <input
              type="text"
              placeholder="Search by name or email..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{ padding: '0.5rem 1rem', borderRadius: 6, border: '1px solid #ddd', width: 260 }}
            />
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '1rem' }}>
            <thead>
              <tr style={{ textAlign: 'left', borderBottom: '2px solid #eee' }}>
                <th style={{ padding: '0.75rem' }}>Name</th>
                <th style={{ padding: '0.75rem' }}>Email</th>
                <th style={{ padding: '0.75rem' }}>Phone</th>
                <th style={{ padding: '0.75rem' }}>Bookings</th>
                <th style={{ padding: '0.75rem' }}>Status</th>
                <th style={{ padding: '0.75rem' }}>Joined</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(c => (
                <tr key={c.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                  <td style={{ padding: '0.75rem', fontWeight: 500 }}>{c.name}</td>
                  <td style={{ padding: '0.75rem', color: '#555' }}>{c.email}</td>
                  <td style={{ padding: '0.75rem', color: '#555' }}>{c.phone}</td>
                  <td style={{ padding: '0.75rem' }}>{c.totalBookings}</td>
                  <td style={{ padding: '0.75rem' }}>
                    <span style={{
                      background: getStatusColor(c.status),
                      color: '#fff',
                      padding: '2px 10px',
                      borderRadius: 12,
                      fontSize: 12,
                      fontWeight: 600,
                    }}>{c.status}</span>
                  </td>
                  <td style={{ padding: '0.75rem', color: '#888' }}>
                    {new Date(c.joinDate).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export default AdminCustomersPage
