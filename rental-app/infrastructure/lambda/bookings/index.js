const AWS = require('aws-sdk');

exports.handler = async (event) => {
    console.log('Bookings Lambda invoked with event:', JSON.stringify(event, null, 2));
    
    const { httpMethod, path, pathParameters, body } = event;
    
    try {
        switch (httpMethod) {
            case 'GET':
                if (pathParameters && pathParameters.bookingId) {
                    return await getBookingById(pathParameters.bookingId);
                } else {
                    return await getAllBookings();
                }
            case 'POST':
                return await createBooking(JSON.parse(body || '{}'));
            case 'PUT':
                if (pathParameters && pathParameters.bookingId) {
                    return await updateBooking(pathParameters.bookingId, JSON.parse(body || '{}'));
                }
                break;
            case 'DELETE':
                if (pathParameters && pathParameters.bookingId) {
                    return await cancelBooking(pathParameters.bookingId);
                }
                break;
            default:
                return {
                    statusCode: 405,
                    headers: {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*',
                    },
                    body: JSON.stringify({ message: 'Method not allowed' }),
                };
        }
    } catch (error) {
        console.error('Error in bookings lambda:', error);
        return {
            statusCode: 500,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
            },
            body: JSON.stringify({ 
                message: 'Internal server error',
                error: error.message 
            }),
        };
    }
};

async function getAllBookings() {
    // TODO: Implement database query to get user's bookings
    const mockBookings = [
        {
            id: '1',
            carId: '1',
            userId: 'user-123',
            startDate: '2025-08-15',
            endDate: '2025-08-20',
            totalPrice: 250,
            status: 'confirmed'
        }
    ];
    
    return {
        statusCode: 200,
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({ bookings: mockBookings }),
    };
}

async function getBookingById(bookingId) {
    // TODO: Implement database query to get booking by ID
    const mockBooking = {
        id: bookingId,
        carId: '1',
        userId: 'user-123',
        startDate: '2025-08-15',
        endDate: '2025-08-20',
        totalPrice: 250,
        status: 'confirmed'
    };
    
    return {
        statusCode: 200,
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({ booking: mockBooking }),
    };
}

async function createBooking(bookingData) {
    // TODO: Implement database insertion and validation
    return {
        statusCode: 201,
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({ 
            message: 'Booking created successfully',
            booking: { id: 'new-booking-id', ...bookingData, status: 'confirmed' }
        }),
    };
}

async function updateBooking(bookingId, updates) {
    // TODO: Implement database update
    return {
        statusCode: 200,
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({ 
            message: 'Booking updated successfully',
            booking: { id: bookingId, ...updates }
        }),
    };
}

async function cancelBooking(bookingId) {
    // TODO: Implement booking cancellation logic
    return {
        statusCode: 200,
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({ 
            message: 'Booking cancelled successfully',
            bookingId: bookingId
        }),
    };
}