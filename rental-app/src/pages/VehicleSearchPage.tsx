import React from 'react'
import { useNavigate } from 'react-router-dom'
import VehicleSearch from '../components/VehicleSearch'

const VehicleSearchPage: React.FC = () => {
  const navigate = useNavigate()

  return (
    <VehicleSearch
      onVehicleSelect={(vehicle) => navigate(`/vehicles/${vehicle.id}`)}
    />
  )
}

export default VehicleSearchPage
