import React from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import VehicleDetails from '../components/VehicleDetails'

const VehicleDetailsPage: React.FC = () => {
  const { vehicleId } = useParams<{ vehicleId: string }>()
  const navigate = useNavigate()

  if (!vehicleId) {
    return <div>Vehicle not found</div>
  }

  return (
    <VehicleDetails
      vehicleId={vehicleId}
      onBack={() => navigate('/vehicles')}
      onReserve={(reservationData) => {
        navigate(`/booking-confirmation/${reservationData.reservation?.id || 'new'}`, {
          state: { reservation: reservationData }
        })
      }}
    />
  )
}

export default VehicleDetailsPage
