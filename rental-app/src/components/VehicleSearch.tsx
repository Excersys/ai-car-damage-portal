import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './VehicleSearch.css';

interface Vehicle {
  id: string;
  make: string;
  model: string;
  year: number;
  type: string;
  category: string;
  pricePerDay: number;
  location: string;
  features: string[];
  images: string[];
  rating: number;
  reviewCount: number;
  available: boolean;
  transmission: string;
  passengers: number;
  luggage: number;
  fuelType: string;
  range?: number;
  mpg?: number;
}

interface SearchFilters {
  location: string;
  startDate: string;
  endDate: string;
  vehicleType: string;
  minPrice: number;
  maxPrice: number;
  features: string[];
  sortBy: string;
  sortOrder: string;
}

interface VehicleSearchProps {
  onVehicleSelect?: (vehicle: Vehicle) => void;
  initialFilters?: Partial<SearchFilters>;
}

const VehicleSearch: React.FC<VehicleSearchProps> = ({ 
  onVehicleSelect,
  initialFilters = {}
}) => {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showFilters, setShowFilters] = useState(false);

  const [filters, setFilters] = useState<SearchFilters>({
    location: 'all',
    startDate: '',
    endDate: '',
    vehicleType: 'all',
    minPrice: 0,
    maxPrice: 1000,
    features: [],
    sortBy: 'price',
    sortOrder: 'asc',
    ...initialFilters
  });

  const vehicleTypes = [
    { value: 'all', label: 'All Types' },
    { value: 'economy', label: 'Economy' },
    { value: 'sedan', label: 'Sedan' },
    { value: 'suv', label: 'SUV' },
    { value: 'electric', label: 'Electric' },
    { value: 'sports', label: 'Sports' },
    { value: 'luxury', label: 'Luxury' }
  ];

  const locations = [
    { value: 'all', label: 'All Locations' },
    { value: 'san-francisco', label: 'San Francisco' },
    { value: 'los-angeles', label: 'Los Angeles' },
    { value: 'new-york', label: 'New York' },
    { value: 'miami', label: 'Miami' }
  ];

  const availableFeatures = [
    'autopilot', 'navigation', 'bluetooth', 'wifi', 'premium-audio',
    'leather-seats', 'sunroof', 'heated-seats', 'backup-camera',
    'performance-package'
  ];

  const searchVehicles = async (page = 1) => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        location: filters.location,
        vehicleType: filters.vehicleType,
        minPrice: filters.minPrice.toString(),
        maxPrice: filters.maxPrice.toString(),
        sortBy: filters.sortBy,
        sortOrder: filters.sortOrder,
        page: page.toString(),
        limit: '12'
      });

      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);
      if (filters.features.length > 0) params.append('features', filters.features.join(','));

      const response = await axios.get(`/api/vehicles/search?${params}`);
      
      setVehicles(response.data.vehicles);
      setTotalPages(response.data.pagination.totalPages);
      setCurrentPage(page);

    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to search vehicles');
      console.error('Error searching vehicles:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    searchVehicles();
  }, [filters]);

  const handleFilterChange = (key: keyof SearchFilters, value: any) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
    setCurrentPage(1);
  };

  const handleFeatureToggle = (feature: string) => {
    const newFeatures = filters.features.includes(feature)
      ? filters.features.filter(f => f !== feature)
      : [...filters.features, feature];
    
    handleFilterChange('features', newFeatures);
  };

  const handlePageChange = (page: number) => {
    searchVehicles(page);
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(price);
  };

  const getVehicleTypeIcon = (type: string) => {
    const icons: { [key: string]: string } = {
      'economy': '🚗',
      'sedan': '🚙',
      'suv': '🚐',
      'electric': '🔋',
      'sports': '🏎️',
      'luxury': '✨'
    };
    return icons[type] || '🚗';
  };

  return (
    <div className="vehicle-search">
      {/* Search Header */}
      <div className="search-header">
        <div className="search-title">
          <h2>Find Your Perfect Rental</h2>
          <p>Choose from our premium fleet of vehicles</p>
        </div>
        
        <button 
          className="filter-toggle"
          onClick={() => setShowFilters(!showFilters)}
        >
          <span>🔍</span>
          Filters {showFilters ? '▼' : '▶'}
        </button>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="filters-panel">
          <div className="filters-grid">
            {/* Location & Dates */}
            <div className="filter-group">
              <label>Location</label>
              <select 
                value={filters.location}
                onChange={(e) => handleFilterChange('location', e.target.value)}
              >
                {locations.map(loc => (
                  <option key={loc.value} value={loc.value}>{loc.label}</option>
                ))}
              </select>
            </div>

            <div className="filter-group">
              <label>Start Date</label>
              <input 
                type="date"
                value={filters.startDate}
                onChange={(e) => handleFilterChange('startDate', e.target.value)}
                min={new Date().toISOString().split('T')[0]}
              />
            </div>

            <div className="filter-group">
              <label>End Date</label>
              <input 
                type="date"
                value={filters.endDate}
                onChange={(e) => handleFilterChange('endDate', e.target.value)}
                min={filters.startDate || new Date().toISOString().split('T')[0]}
              />
            </div>

            {/* Vehicle Type */}
            <div className="filter-group">
              <label>Vehicle Type</label>
              <select 
                value={filters.vehicleType}
                onChange={(e) => handleFilterChange('vehicleType', e.target.value)}
              >
                {vehicleTypes.map(type => (
                  <option key={type.value} value={type.value}>{type.label}</option>
                ))}
              </select>
            </div>

            {/* Price Range */}
            <div className="filter-group price-range">
              <label>Price Range (per day)</label>
              <div className="price-inputs">
                <input 
                  type="number"
                  placeholder="Min"
                  value={filters.minPrice}
                  onChange={(e) => handleFilterChange('minPrice', parseInt(e.target.value) || 0)}
                />
                <span>to</span>
                <input 
                  type="number"
                  placeholder="Max"
                  value={filters.maxPrice}
                  onChange={(e) => handleFilterChange('maxPrice', parseInt(e.target.value) || 1000)}
                />
              </div>
            </div>

            {/* Sort Options */}
            <div className="filter-group">
              <label>Sort By</label>
              <select 
                value={`${filters.sortBy}-${filters.sortOrder}`}
                onChange={(e) => {
                  const [sortBy, sortOrder] = e.target.value.split('-');
                  handleFilterChange('sortBy', sortBy);
                  handleFilterChange('sortOrder', sortOrder);
                }}
              >
                <option value="price-asc">Price: Low to High</option>
                <option value="price-desc">Price: High to Low</option>
                <option value="rating-desc">Rating: High to Low</option>
                <option value="make-asc">Make: A to Z</option>
              </select>
            </div>
          </div>

          {/* Features */}
          <div className="features-filter">
            <label>Features</label>
            <div className="features-grid">
              {availableFeatures.map(feature => (
                <label key={feature} className="feature-checkbox">
                  <input 
                    type="checkbox"
                    checked={filters.features.includes(feature)}
                    onChange={() => handleFeatureToggle(feature)}
                  />
                  <span>{feature.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Results */}
      <div className="search-results">
        {loading && (
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Searching vehicles...</p>
          </div>
        )}

        {error && (
          <div className="error-state">
            <span>⚠️</span>
            <p>{error}</p>
            <button onClick={() => searchVehicles()}>Try Again</button>
          </div>
        )}

        {!loading && !error && vehicles.length === 0 && (
          <div className="empty-state">
            <span>🔍</span>
            <h3>No vehicles found</h3>
            <p>Try adjusting your search filters</p>
          </div>
        )}

        {!loading && !error && vehicles.length > 0 && (
          <>
            <div className="results-header">
              <h3>{vehicles.length} vehicles found</h3>
            </div>

            <div className="vehicles-grid">
              {vehicles.map(vehicle => (
                <div key={vehicle.id} className="vehicle-card">
                  <div className="vehicle-image">
                    <img 
                      src={vehicle.images[0] || '/placeholder-car.jpg'} 
                      alt={`${vehicle.make} ${vehicle.model}`}
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = '/placeholder-car.jpg';
                      }}
                    />
                    <div className="vehicle-type-badge">
                      {getVehicleTypeIcon(vehicle.type)} {vehicle.type}
                    </div>
                  </div>

                  <div className="vehicle-info">
                    <div className="vehicle-header">
                      <h4>{vehicle.make} {vehicle.model}</h4>
                      <span className="vehicle-year">{vehicle.year}</span>
                    </div>

                    <div className="vehicle-specs">
                      <span>👥 {vehicle.passengers} passengers</span>
                      <span>🧳 {vehicle.luggage} bags</span>
                      <span>⚙️ {vehicle.transmission}</span>
                      {vehicle.fuelType === 'electric' ? (
                        <span>🔋 {vehicle.range} mi range</span>
                      ) : (
                        <span>⛽ {vehicle.mpg} MPG</span>
                      )}
                    </div>

                    <div className="vehicle-features">
                      {vehicle.features.slice(0, 3).map(feature => (
                        <span key={feature} className="feature-tag">
                          {feature.replace('-', ' ')}
                        </span>
                      ))}
                      {vehicle.features.length > 3 && (
                        <span className="feature-tag more">
                          +{vehicle.features.length - 3} more
                        </span>
                      )}
                    </div>

                    <div className="vehicle-rating">
                      <div className="stars">
                        {'★'.repeat(Math.floor(vehicle.rating))}
                        {'☆'.repeat(5 - Math.floor(vehicle.rating))}
                      </div>
                      <span>{vehicle.rating} ({vehicle.reviewCount} reviews)</span>
                    </div>

                    <div className="vehicle-footer">
                      <div className="price">
                        <span className="price-amount">{formatPrice(vehicle.pricePerDay)}</span>
                        <span className="price-period">per day</span>
                      </div>
                      
                      <button 
                        className="select-vehicle-btn"
                        onClick={() => onVehicleSelect?.(vehicle)}
                      >
                        Select Vehicle
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="pagination">
                <button 
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                >
                  Previous
                </button>
                
                <div className="page-numbers">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                    <button 
                      key={page}
                      className={page === currentPage ? 'active' : ''}
                      onClick={() => handlePageChange(page)}
                    >
                      {page}
                    </button>
                  ))}
                </div>
                
                <button 
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default VehicleSearch;