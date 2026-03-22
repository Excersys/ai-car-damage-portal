import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './AdminDashboard.css';

interface User {
  username: string;
  email: string;
  role: string;
  firstName: string;
  lastName: string;
  attributes: any;
}

interface DashboardOverview {
  totalBookings: number;
  activeBookings: number;
  totalRevenue: number;
  totalVehicles: number;
  availableVehicles: number;
  pendingVerifications: number;
  flaggedUsers: number;
  systemHealth: string;
}

interface RecentActivity {
  id: string;
  type: string;
  user: string;
  vehicle?: string;
  amount?: number;
  status?: string;
  score?: number;
  method?: string;
  timestamp: string;
}

interface Alert {
  id: string;
  type: string;
  message: string;
  severity: string;
  timestamp: string;
}

interface Permissions {
  canManageUsers: boolean;
  canManageVehicles: boolean;
  canViewFinancials: boolean;
  canManageBookings: boolean;
  canViewAnalytics: boolean;
}

interface DashboardData {
  overview: DashboardOverview;
  recentActivity: RecentActivity[];
  alerts: Alert[];
  userRole: string;
  permissions: Permissions;
}

const AdminDashboard: React.FC = () => {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get authentication token from localStorage or context
      const token = localStorage.getItem('accessToken');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await axios.get('/api/admin/dashboard', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      setDashboardData(response.data);
    } catch (err: any) {
      console.error('Error fetching dashboard data:', err);
      setError(err.response?.data?.error || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getActivityIcon = (type: string) => {
    const icons: { [key: string]: string } = {
      'booking_created': '📝',
      'verification_completed': '✅',
      'payment_processed': '💳',
      'vehicle_returned': '🚗',
      'damage_reported': '⚠️',
      'user_registered': '👤',
      'refund_processed': '💰'
    };
    return icons[type] || '📄';
  };

  const getAlertColor = (severity: string) => {
    const colors: { [key: string]: string } = {
      'error': '#dc2626',
      'warning': '#f59e0b',
      'info': '#3b82f6',
      'success': '#059669'
    };
    return colors[severity] || '#6b7280';
  };

  const getRoleDisplayName = (role: string) => {
    const roles: { [key: string]: string } = {
      'super-admin': 'Super Administrator',
      'fleet-manager': 'Fleet Manager',
      'agent': 'Customer Service Agent',
      'customer': 'Customer'
    };
    return roles[role] || role;
  };

  const getHealthStatusColor = (status: string) => {
    const colors: { [key: string]: string } = {
      'healthy': '#059669',
      'warning': '#f59e0b',
      'error': '#dc2626',
      'maintenance': '#6b7280'
    };
    return colors[status] || '#6b7280';
  };

  if (loading) {
    return (
      <div className="admin-dashboard loading">
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Loading admin dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="admin-dashboard error">
        <div className="error-container">
          <span className="error-icon">⚠️</span>
          <h2>Access Error</h2>
          <p>{error}</p>
          <button onClick={fetchDashboardData} className="retry-btn">
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!dashboardData) {
    return (
      <div className="admin-dashboard error">
        <div className="error-container">
          <span className="error-icon">❌</span>
          <h2>No Data Available</h2>
          <p>Unable to load dashboard data</p>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-dashboard">
      {/* Header */}
      <div className="dashboard-header">
        <div className="header-left">
          <h1>Admin Dashboard</h1>
          <p className="role-badge">{getRoleDisplayName(dashboardData.userRole)}</p>
        </div>
        <div className="header-right">
          <div className="system-status">
            <span 
              className="status-indicator"
              style={{ color: getHealthStatusColor(dashboardData.overview.systemHealth) }}
            >
              ●
            </span>
            <span>System {dashboardData.overview.systemHealth}</span>
          </div>
          <button className="refresh-btn" onClick={fetchDashboardData}>
            🔄 Refresh
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="dashboard-nav">
        <button 
          className={`nav-tab ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          📊 Overview
        </button>
        
        {dashboardData.permissions.canManageBookings && (
          <button 
            className={`nav-tab ${activeTab === 'bookings' ? 'active' : ''}`}
            onClick={() => setActiveTab('bookings')}
          >
            📋 Bookings
          </button>
        )}
        
        {dashboardData.permissions.canManageVehicles && (
          <button 
            className={`nav-tab ${activeTab === 'vehicles' ? 'active' : ''}`}
            onClick={() => setActiveTab('vehicles')}
          >
            🚗 Vehicles
          </button>
        )}
        
        {dashboardData.permissions.canManageUsers && (
          <button 
            className={`nav-tab ${activeTab === 'users' ? 'active' : ''}`}
            onClick={() => setActiveTab('users')}
          >
            👥 Users
          </button>
        )}
        
        {dashboardData.permissions.canViewFinancials && (
          <button 
            className={`nav-tab ${activeTab === 'analytics' ? 'active' : ''}`}
            onClick={() => setActiveTab('analytics')}
          >
            📈 Analytics
          </button>
        )}
        
        <button 
          className={`nav-tab ${activeTab === 'system' ? 'active' : ''}`}
          onClick={() => setActiveTab('system')}
        >
          ⚙️ System
        </button>
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="dashboard-content">
          {/* Key Metrics */}
          <div className="metrics-grid">
            <div className="metric-card">
              <div className="metric-header">
                <span className="metric-icon">📋</span>
                <span className="metric-label">Total Bookings</span>
              </div>
              <div className="metric-value">{dashboardData.overview.totalBookings.toLocaleString()}</div>
              <div className="metric-subtext">Active: {dashboardData.overview.activeBookings}</div>
            </div>

            <div className="metric-card">
              <div className="metric-header">
                <span className="metric-icon">💰</span>
                <span className="metric-label">Total Revenue</span>
              </div>
              <div className="metric-value">{formatCurrency(dashboardData.overview.totalRevenue)}</div>
              <div className="metric-subtext">This month</div>
            </div>

            <div className="metric-card">
              <div className="metric-header">
                <span className="metric-icon">🚗</span>
                <span className="metric-label">Fleet Status</span>
              </div>
              <div className="metric-value">{dashboardData.overview.totalVehicles}</div>
              <div className="metric-subtext">Available: {dashboardData.overview.availableVehicles}</div>
            </div>

            <div className="metric-card">
              <div className="metric-header">
                <span className="metric-icon">🔍</span>
                <span className="metric-label">Pending Reviews</span>
              </div>
              <div className="metric-value">{dashboardData.overview.pendingVerifications}</div>
              <div className="metric-subtext">Flagged: {dashboardData.overview.flaggedUsers}</div>
            </div>
          </div>

          <div className="dashboard-row">
            {/* Recent Activity */}
            <div className="activity-panel">
              <div className="panel-header">
                <h3>Recent Activity</h3>
                <span className="activity-count">{dashboardData.recentActivity.length} recent</span>
              </div>
              <div className="activity-list">
                {dashboardData.recentActivity.map(activity => (
                  <div key={activity.id} className="activity-item">
                    <div className="activity-icon">
                      {getActivityIcon(activity.type)}
                    </div>
                    <div className="activity-content">
                      <div className="activity-main">
                        <span className="activity-user">{activity.user}</span>
                        <span className="activity-action">
                          {activity.type === 'booking_created' && `booked ${activity.vehicle}`}
                          {activity.type === 'verification_completed' && `completed verification (score: ${activity.score})`}
                          {activity.type === 'payment_processed' && `paid ${formatCurrency(activity.amount || 0)} via ${activity.method}`}
                        </span>
                      </div>
                      <div className="activity-time">{formatDateTime(activity.timestamp)}</div>
                    </div>
                    {activity.amount && (
                      <div className="activity-amount">
                        {formatCurrency(activity.amount)}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Alerts & Notifications */}
            <div className="alerts-panel">
              <div className="panel-header">
                <h3>Alerts & Notifications</h3>
                <span className="alert-count">{dashboardData.alerts.length} active</span>
              </div>
              <div className="alerts-list">
                {dashboardData.alerts.map(alert => (
                  <div key={alert.id} className="alert-item">
                    <div 
                      className="alert-indicator"
                      style={{ backgroundColor: getAlertColor(alert.severity) }}
                    ></div>
                    <div className="alert-content">
                      <div className="alert-message">{alert.message}</div>
                      <div className="alert-meta">
                        <span className="alert-type">{alert.type}</span>
                        <span className="alert-time">{formatDateTime(alert.timestamp)}</span>
                      </div>
                    </div>
                    <button className="alert-action">
                      {alert.severity === 'warning' ? '⚠️' : 'ℹ️'}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Placeholder tabs for other sections */}
      {activeTab === 'bookings' && (
        <div className="dashboard-content">
          <div className="placeholder-content">
            <h2>📋 Booking Management</h2>
            <p>Comprehensive booking management interface coming soon...</p>
            <div className="feature-list">
              <div>✅ View all bookings with filters</div>
              <div>✅ Manage booking status</div>
              <div>✅ Handle customer support cases</div>
              <div>✅ Process refunds and modifications</div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'vehicles' && (
        <div className="dashboard-content">
          <div className="placeholder-content">
            <h2>🚗 Fleet Management</h2>
            <p>Vehicle management dashboard coming soon...</p>
            <div className="feature-list">
              <div>✅ Vehicle availability tracking</div>
              <div>✅ Maintenance scheduling</div>
              <div>✅ Damage reports</div>
              <div>✅ Performance analytics</div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'users' && (
        <div className="dashboard-content">
          <div className="placeholder-content">
            <h2>👥 User Management</h2>
            <p>User administration panel coming soon...</p>
            <div className="feature-list">
              <div>✅ View all users</div>
              <div>✅ Manage user roles</div>
              <div>✅ Verification status</div>
              <div>✅ Account actions</div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'analytics' && (
        <div className="dashboard-content">
          <div className="placeholder-content">
            <h2>📈 Financial Analytics</h2>
            <p>Comprehensive analytics dashboard coming soon...</p>
            <div className="feature-list">
              <div>✅ Revenue tracking</div>
              <div>✅ Payment method analysis</div>
              <div>✅ Vehicle performance</div>
              <div>✅ Financial reporting</div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'system' && (
        <div className="dashboard-content">
          <div className="placeholder-content">
            <h2>⚙️ System Health</h2>
            <p>System monitoring dashboard coming soon...</p>
            <div className="feature-list">
              <div>✅ Service status monitoring</div>
              <div>✅ Performance metrics</div>
              <div>✅ Error tracking</div>
              <div>✅ Infrastructure health</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;