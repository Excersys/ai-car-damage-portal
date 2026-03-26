const AWS = require('aws-sdk');

exports.handler = async (event) => {
    console.log('Cars Lambda invoked with event:', JSON.stringify(event, null, 2));
    
    const { httpMethod, path, pathParameters, body } = event;
    
    try {
        switch (httpMethod) {
            case 'GET':
                if (pathParameters && pathParameters.carId) {
                    return await getCarById(pathParameters.carId);
                } else {
                    return await getAllCars();
                }
            case 'POST':
                return await createCar(JSON.parse(body || '{}'));
            case 'PUT':
                if (pathParameters && pathParameters.carId) {
                    return await updateCar(pathParameters.carId, JSON.parse(body || '{}'));
                }
                break;
            case 'DELETE':
                if (pathParameters && pathParameters.carId) {
                    return await deleteCar(pathParameters.carId);
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
        console.error('Error in cars lambda:', error);
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

async function getAllCars() {
    // TODO: Implement database query to get all cars
    const mockCars = [
        {
            id: '1',
            make: 'Toyota',
            model: 'Camry',
            year: 2023,
            pricePerDay: 50,
            available: true
        },
        {
            id: '2',
            make: 'Honda',
            model: 'Civic',
            year: 2023,
            pricePerDay: 45,
            available: true
        }
    ];
    
    return {
        statusCode: 200,
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({ cars: mockCars }),
    };
}

async function getCarById(carId) {
    // TODO: Implement database query to get car by ID
    const mockCar = {
        id: carId,
        make: 'Toyota',
        model: 'Camry',
        year: 2023,
        pricePerDay: 50,
        available: true
    };
    
    return {
        statusCode: 200,
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({ car: mockCar }),
    };
}

async function createCar(carData) {
    // TODO: Implement database insertion
    return {
        statusCode: 201,
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({ 
            message: 'Car created successfully',
            car: { id: 'new-car-id', ...carData }
        }),
    };
}

async function updateCar(carId, updates) {
    // TODO: Implement database update
    return {
        statusCode: 200,
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({ 
            message: 'Car updated successfully',
            car: { id: carId, ...updates }
        }),
    };
}

async function deleteCar(carId) {
    // TODO: Implement database deletion
    return {
        statusCode: 200,
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({ 
            message: 'Car deleted successfully',
            carId: carId
        }),
    };
}