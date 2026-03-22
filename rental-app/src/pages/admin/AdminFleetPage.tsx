import React, { useState } from 'react'

interface Vehicle {
  id: string
  make: string
  model: string
  year: number
  licensePlate: string
  vin: string
  color: string
  category: 'economy' | 'compact' | 'midsize' | 'fullsize' | 'suv' | 'luxury' | 'electric'
  status: 'available' | 'rented' | 'maintenance' | 'retired'
  mileage: number
  dailyRate: number
  location: string
  features: string[]
  lastService: string
  nextService: string
  insurance: {
    provider: string
    policyNumber: string
    expiryDate: string
  }
  registrationExpiry: string
  purchaseDate: string
  purchasePrice: number
  imageUrl?: string
}

const AdminFleetPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState('overview')
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null)
  const [showAddVehicle, setShowAddVehicle] = useState(false)
  const [showVehicleDetails, setShowVehicleDetails] = useState(false)
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterCategory, setFilterCategory] = useState('all')

  // Mock fleet data
  const mockFleet: Vehicle[] = [
    {
      id: '1',
      make: 'Tesla',
      model: 'Model 3',
      year: 2023,
      licensePlate: 'ABC-1234',
      vin: '5YJ3E1EA4KF123456',
      color: 'Pearl White',
      category: 'electric',
      status: 'rented',
      mileage: 15420,
      dailyRate: 89,
      location: 'Downtown Office',
      features: ['Autopilot', 'Premium Audio', 'Supercharging', 'Glass Roof'],
      lastService: '2025-07-15',
      nextService: '2025-10-15',
      insurance: {
        provider: 'State Farm',
        policyNumber: 'SF-789123456',
        expiryDate: '2025-12-31'
      },
      registrationExpiry: '2025-11-30',
      purchaseDate: '2023-03-15',
      purchasePrice: 42000,
      imageUrl: '/images/tesla-model3.jpg'
    },
    {
      id: '2',
      make: 'BMW',
      model: 'X5',
      year: 2023,
      licensePlate: 'XYZ-5678',
      vin: 'WBAJU7C50KJ987654',
      color: 'Alpine White',
      category: 'luxury',
      status: 'available',
      mileage: 8750,
      dailyRate: 125,
      location: 'Airport',
      features: ['Navigation', 'Leather Seats', 'Panoramic Roof', 'Heated Seats'],
      lastService: '2025-06-20',
      nextService: '2025-09-20',
      insurance: {
        provider: 'Allstate',
        policyNumber: 'AS-456789123',
        expiryDate: '2025-12-31'
      },
      registrationExpiry: '2025-10-15',
      purchaseDate: '2023-01-10',
      purchasePrice: 65000
    },
    {
      id: '3',
      make: 'Toyota',
      model: 'Camry',
      year: 2023,
      licensePlate: 'CAM-9876',
      vin: '4T1C11AK5KU654321',
      color: 'Midnight Black',
      category: 'midsize',
      status: 'available',
      mileage: 12300,
      dailyRate: 65,
      location: 'Downtown Office',
      features: ['Backup Camera', 'Bluetooth', 'Toyota Safety Sense', 'Apple CarPlay'],
      lastService: '2025-07-01',
      nextService: '2025-10-01',
      insurance: {
        provider: 'Progressive',
        policyNumber: 'PG-321654987',
        expiryDate: '2025-12-31'
      },
      registrationExpiry: '2025-09-30',
      purchaseDate: '2023-02-20',
      purchasePrice: 28000
    },
    {
      id: '4',
      make: 'Ford',
      model: 'Mustang',
      year: 2022,
      licensePlate: 'MUS-2468',
      vin: '1FA6P8TH0N5112345',
      color: 'Race Red',
      category: 'luxury',
      status: 'maintenance',
      mileage: 22100,
      dailyRate: 95,
      location: 'Service Center',
      features: ['V8 Engine', 'Performance Package', 'Premium Audio', 'Track Apps'],
      lastService: '2025-08-01',
      nextService: '2025-11-01',
      insurance: {
        provider: 'GEICO',
        policyNumber: 'GE-987123654',
        expiryDate: '2025-12-31'
      },
      registrationExpiry: '2025-08-15',
      purchaseDate: '2022-05-10',
      purchasePrice: 45000
    },
    {
      id: '5',
      make: 'Honda',
      model: 'Civic',
      year: 2023,
      licensePlate: 'CIV-1357',
      vin: '19XFC2F59PE098765',
      color: 'Sonic Gray',
      category: 'compact',
      status: 'available',
      mileage: 5200,
      dailyRate: 55,
      location: 'Downtown Office',
      features: ['Honda Sensing', 'Wireless Charging', 'Sunroof', 'Remote Start'],
      lastService: '2025-06-01',
      nextService: '2025-09-01',
      insurance: {
        provider: 'State Farm',
        policyNumber: 'SF-159753468',
        expiryDate: '2025-12-31'
      },
      registrationExpiry: '2025-12-15',
      purchaseDate: '2023-04-01',
      purchasePrice: 25000
    }
  ]

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available': return '#4caf50'
      case 'rented': return '#2196f3'
      case 'maintenance': return '#ff9800'
      case 'retired': return '#9e9e9e'
      default: return '#666'
    }
  }

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'economy': return '#4caf50'
      case 'compact': return '#8bc34a'
      case 'midsize': return '#ffc107'
      case 'fullsize': return '#ff9800'
      case 'suv': return '#795548'
      case 'luxury': return '#9c27b0'
      case 'electric': return '#00bcd4'
      default: return '#666'
    }
  }

  const filterVehicles = () => {
    let filtered = mockFleet
    
    if (filterStatus !== 'all') {
      filtered = filtered.filter(vehicle => vehicle.status === filterStatus)
    }
    
    if (filterCategory !== 'all') {
      filtered = filtered.filter(vehicle => vehicle.category === filterCategory)
    }
    
    return filtered
  }

  const getFleetStats = () => {
    const total = mockFleet.length
    const available = mockFleet.filter(v => v.status === 'available').length
    const rented = mockFleet.filter(v => v.status === 'rented').length
    const maintenance = mockFleet.filter(v => v.status === 'maintenance').length
    const utilization = Math.round((rented / total) * 100)
    const avgMileage = Math.round(mockFleet.reduce((acc, v) => acc + v.mileage, 0) / total)
    const totalValue = mockFleet.reduce((acc, v) => acc + v.purchasePrice, 0)

    return {
      total,
      available,
      rented,
      maintenance,
      utilization,
      avgMileage,
      totalValue
    }
  }

  const handleViewDetails = (vehicle: Vehicle) => {
    setSelectedVehicle(vehicle)
    setShowVehicleDetails(true)
  }

  const handleAddVehicle = () => {
    setShowAddVehicle(true)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  const stats = getFleetStats()

  return (
    <div className="admin-fleet">
      <div className="admin-container">
        <div className="page-header">
          <h1>🚗 Fleet Management</h1>
          <div className="header-actions">
            <button className="btn btn-secondary">
              📊 Fleet Report
            </button>
            <button className="btn btn-primary" onClick={handleAddVehicle}>
              ➕ Add Vehicle
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="fleet-tabs">
          <button 
            className={`tab ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            📋 Overview
          </button>
          <button 
            className={`tab ${activeTab === 'vehicles' ? 'active' : ''}`}
            onClick={() => setActiveTab('vehicles')}
          >
            🚙 Vehicles ({mockFleet.length})
          </button>
          <button 
            className={`tab ${activeTab === 'maintenance' ? 'active' : ''}`}
            onClick={() => setActiveTab('maintenance')}
          >
            🔧 Maintenance ({stats.maintenance})
          </button>
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="fleet-overview">
            {/* Fleet Statistics */}
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-icon">🚗</div>
                <div className="stat-content">
                  <h3>Total Vehicles</h3>
                  <div className="stat-number">{stats.total}</div>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon">✅</div>
                <div className="stat-content">
                  <h3>Available</h3>
                  <div className="stat-number">{stats.available}</div>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon">🔄</div>
                <div className="stat-content">
                  <h3>Currently Rented</h3>
                  <div className="stat-number">{stats.rented}</div>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon">🔧</div>
                <div className="stat-content">
                  <h3>In Maintenance</h3>
                  <div className="stat-number">{stats.maintenance}</div>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon">📈</div>
                <div className="stat-content">
                  <h3>Fleet Utilization</h3>
                  <div className="stat-number">{stats.utilization}%</div>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon">📏</div>
                <div className="stat-content">
                  <h3>Avg Mileage</h3>
                  <div className="stat-number">{stats.avgMileage.toLocaleString()}</div>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon">💰</div>
                <div className="stat-content">
                  <h3>Fleet Value</h3>
                  <div className="stat-number">${stats.totalValue.toLocaleString()}</div>
                </div>
              </div>
            </div>

            {/* Fleet Composition */}
            <div className="fleet-composition">
              <h3>Fleet Composition</h3>
              <div className="composition-grid">
                {['economy', 'compact', 'midsize', 'fullsize', 'suv', 'luxury', 'electric'].map(category => {
                  const count = mockFleet.filter(v => v.category === category).length
                  const percentage = Math.round((count / mockFleet.length) * 100)
                  
                  return (
                    <div key={category} className="composition-item">
                      <div className="composition-header">
                        <span className="category-name">{category.charAt(0).toUpperCase() + category.slice(1)}</span>
                        <span className="category-count">{count} vehicles</span>
                      </div>
                      <div className="composition-bar">
                        <div 
                          className="composition-fill"
                          style={{ 
                            width: `${percentage}%`,
                            backgroundColor: getCategoryColor(category)
                          }}
                        ></div>
                      </div>
                      <span className="composition-percentage">{percentage}%</span>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {/* Vehicles Tab */}
        {activeTab === 'vehicles' && (
          <div className="fleet-vehicles">
            {/* Filters */}
            <div className="fleet-filters">
              <div className="filter-group">
                <label>Status:</label>
                <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
                  <option value="all">All Status</option>
                  <option value="available">Available</option>
                  <option value="rented">Rented</option>
                  <option value="maintenance">Maintenance</option>
                  <option value="retired">Retired</option>
                </select>
              </div>
              <div className="filter-group">
                <label>Category:</label>
                <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}>
                  <option value="all">All Categories</option>
                  <option value="economy">Economy</option>
                  <option value="compact">Compact</option>
                  <option value="midsize">Midsize</option>
                  <option value="fullsize">Full Size</option>
                  <option value="suv">SUV</option>
                  <option value="luxury">Luxury</option>
                  <option value="electric">Electric</option>
                </select>
              </div>
            </div>

            {/* Vehicles Grid */}
            <div className="vehicles-grid">
              {filterVehicles().map(vehicle => (
                <div key={vehicle.id} className="vehicle-card">
                  <div className="vehicle-image">
                    {vehicle.imageUrl ? (
                      <img src={vehicle.imageUrl} alt={`${vehicle.make} ${vehicle.model}`} />
                    ) : (
                      <div className="vehicle-placeholder">
                        🚗
                      </div>
                    )}
                    <div className="vehicle-badges">
                      <span 
                        className="status-badge"
                        style={{ backgroundColor: getStatusColor(vehicle.status) }}
                      >
                        {vehicle.status.toUpperCase()}
                      </span>
                      <span 
                        className="category-badge"
                        style={{ backgroundColor: getCategoryColor(vehicle.category) }}
                      >
                        {vehicle.category.toUpperCase()}
                      </span>
                    </div>
                  </div>
                  
                  <div className="vehicle-info">
                    <h4>{vehicle.year} {vehicle.make} {vehicle.model}</h4>
                    <div className="vehicle-details">
                      <div className="detail-row">
                        <span className="label">License:</span>
                        <span className="value">{vehicle.licensePlate}</span>
                      </div>
                      <div className="detail-row">
                        <span className="label">Mileage:</span>
                        <span className="value">{vehicle.mileage.toLocaleString()} mi</span>
                      </div>
                      <div className="detail-row">
                        <span className="label">Daily Rate:</span>
                        <span className="value">${vehicle.dailyRate}</span>
                      </div>
                      <div className="detail-row">
                        <span className="label">Location:</span>
                        <span className="value">{vehicle.location}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="vehicle-actions">
                    <button 
                      className="btn-small btn-outline"
                      onClick={() => handleViewDetails(vehicle)}
                    >
                      View Details
                    </button>
                    <button className="btn-small btn-secondary">
                      Edit
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Maintenance Tab */}
        {activeTab === 'maintenance' && (
          <div className="fleet-maintenance">
            <h2>Maintenance Schedule</h2>
            <div className="maintenance-table">
              <table>
                <thead>
                  <tr>
                    <th>Vehicle</th>
                    <th>License Plate</th>
                    <th>Current Mileage</th>
                    <th>Last Service</th>
                    <th>Next Service Due</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {mockFleet.map(vehicle => (
                    <tr key={vehicle.id}>
                      <td>
                        <div className="vehicle-name">
                          {vehicle.year} {vehicle.make} {vehicle.model}
                        </div>
                      </td>
                      <td>{vehicle.licensePlate}</td>
                      <td>{vehicle.mileage.toLocaleString()} mi</td>
                      <td>{formatDate(vehicle.lastService)}</td>
                      <td>{formatDate(vehicle.nextService)}</td>
                      <td>
                        <span 
                          className="status-badge"
                          style={{ backgroundColor: getStatusColor(vehicle.status) }}
                        >
                          {vehicle.status.toUpperCase()}
                        </span>
                      </td>
                      <td>
                        <button className="btn-small btn-outline">
                          Schedule Service
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Vehicle Details Modal */}
        {showVehicleDetails && selectedVehicle && (
          <div className="modal-overlay" onClick={() => setShowVehicleDetails(false)}>
            <div className="modal-content vehicle-details-modal" onClick={e => e.stopPropagation()}>
              <div className="modal-header">
                <h2>{selectedVehicle.year} {selectedVehicle.make} {selectedVehicle.model}</h2>
                <button 
                  className="modal-close"
                  onClick={() => setShowVehicleDetails(false)}
                >
                  ✕
                </button>
              </div>
              
              <div className="modal-body">
                <div className="vehicle-detail-grid">
                  <div className="detail-section">
                    <h3>Vehicle Information</h3>
                    <div className="detail-item">
                      <span className="label">VIN:</span>
                      <span className="value">{selectedVehicle.vin}</span>
                    </div>
                    <div className="detail-item">
                      <span className="label">License Plate:</span>
                      <span className="value">{selectedVehicle.licensePlate}</span>
                    </div>
                    <div className="detail-item">
                      <span className="label">Color:</span>
                      <span className="value">{selectedVehicle.color}</span>
                    </div>
                    <div className="detail-item">
                      <span className="label">Category:</span>
                      <span className="value">{selectedVehicle.category}</span>
                    </div>
                    <div className="detail-item">
                      <span className="label">Current Mileage:</span>
                      <span className="value">{selectedVehicle.mileage.toLocaleString()} miles</span>
                    </div>
                  </div>

                  <div className="detail-section">
                    <h3>Status & Location</h3>
                    <div className="detail-item">
                      <span className="label">Status:</span>
                      <span 
                        className="status-badge"
                        style={{ backgroundColor: getStatusColor(selectedVehicle.status) }}
                      >
                        {selectedVehicle.status.toUpperCase()}
                      </span>
                    </div>
                    <div className="detail-item">
                      <span className="label">Location:</span>
                      <span className="value">{selectedVehicle.location}</span>
                    </div>
                    <div className="detail-item">
                      <span className="label">Daily Rate:</span>
                      <span className="value">${selectedVehicle.dailyRate}</span>
                    </div>
                  </div>

                  <div className="detail-section">
                    <h3>Maintenance</h3>
                    <div className="detail-item">
                      <span className="label">Last Service:</span>
                      <span className="value">{formatDate(selectedVehicle.lastService)}</span>
                    </div>
                    <div className="detail-item">
                      <span className="label">Next Service:</span>
                      <span className="value">{formatDate(selectedVehicle.nextService)}</span>
                    </div>
                  </div>

                  <div className="detail-section">
                    <h3>Insurance & Registration</h3>
                    <div className="detail-item">
                      <span className="label">Insurance Provider:</span>
                      <span className="value">{selectedVehicle.insurance.provider}</span>
                    </div>
                    <div className="detail-item">
                      <span className="label">Policy Number:</span>
                      <span className="value">{selectedVehicle.insurance.policyNumber}</span>
                    </div>
                    <div className="detail-item">
                      <span className="label">Insurance Expiry:</span>
                      <span className="value">{formatDate(selectedVehicle.insurance.expiryDate)}</span>
                    </div>
                    <div className="detail-item">
                      <span className="label">Registration Expiry:</span>
                      <span className="value">{formatDate(selectedVehicle.registrationExpiry)}</span>
                    </div>
                  </div>

                  <div className="detail-section">
                    <h3>Purchase Information</h3>
                    <div className="detail-item">
                      <span className="label">Purchase Date:</span>
                      <span className="value">{formatDate(selectedVehicle.purchaseDate)}</span>
                    </div>
                    <div className="detail-item">
                      <span className="label">Purchase Price:</span>
                      <span className="value">${selectedVehicle.purchasePrice.toLocaleString()}</span>
                    </div>
                  </div>

                  <div className="detail-section full-width">
                    <h3>Features</h3>
                    <div className="features-list">
                      {selectedVehicle.features.map((feature, index) => (
                        <span key={index} className="feature-tag">
                          {feature}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="modal-actions">
                  <button className="btn btn-secondary">Edit Vehicle</button>
                  <button className="btn btn-secondary">Schedule Maintenance</button>
                  <button className="btn btn-primary">Update Status</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Add Vehicle Modal */}
        {showAddVehicle && (
          <div className="modal-overlay" onClick={() => setShowAddVehicle(false)}>
            <div className="modal-content add-vehicle-modal" onClick={e => e.stopPropagation()}>
              <div className="modal-header">
                <h2>Add New Vehicle</h2>
                <button 
                  className="modal-close"
                  onClick={() => setShowAddVehicle(false)}
                >
                  ✕
                </button>
              </div>
              
              <div className="modal-body">
                <form className="add-vehicle-form">
                  <div className="form-row">
                    <div className="form-group">
                      <label>Make *</label>
                      <input type="text" placeholder="e.g., Toyota" />
                    </div>
                    <div className="form-group">
                      <label>Model *</label>
                      <input type="text" placeholder="e.g., Camry" />
                    </div>
                    <div className="form-group">
                      <label>Year *</label>
                      <input type="number" placeholder="2023" />
                    </div>
                  </div>
                  
                  <div className="form-row">
                    <div className="form-group">
                      <label>License Plate *</label>
                      <input type="text" placeholder="ABC-1234" />
                    </div>
                    <div className="form-group">
                      <label>VIN *</label>
                      <input type="text" placeholder="Vehicle Identification Number" />
                    </div>
                    <div className="form-group">
                      <label>Color</label>
                      <input type="text" placeholder="e.g., Pearl White" />
                    </div>
                  </div>
                  
                  <div className="form-row">
                    <div className="form-group">
                      <label>Category *</label>
                      <select>
                        <option value="">Select Category</option>
                        <option value="economy">Economy</option>
                        <option value="compact">Compact</option>
                        <option value="midsize">Midsize</option>
                        <option value="fullsize">Full Size</option>
                        <option value="suv">SUV</option>
                        <option value="luxury">Luxury</option>
                        <option value="electric">Electric</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Daily Rate *</label>
                      <input type="number" placeholder="89" />
                    </div>
                    <div className="form-group">
                      <label>Current Mileage</label>
                      <input type="number" placeholder="0" />
                    </div>
                  </div>
                  
                  <div className="form-row">
                    <div className="form-group">
                      <label>Location *</label>
                      <select>
                        <option value="">Select Location</option>
                        <option value="Downtown Office">Downtown Office</option>
                        <option value="Airport">Airport</option>
                        <option value="Service Center">Service Center</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Purchase Date</label>
                      <input type="date" />
                    </div>
                    <div className="form-group">
                      <label>Purchase Price</label>
                      <input type="number" placeholder="45000" />
                    </div>
                  </div>
                </form>

                <div className="modal-actions">
                  <button className="btn btn-secondary" onClick={() => setShowAddVehicle(false)}>
                    Cancel
                  </button>
                  <button className="btn btn-primary">
                    Add Vehicle
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default AdminFleetPage