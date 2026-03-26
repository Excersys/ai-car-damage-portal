const AWS = require('aws-sdk');

exports.handler = async (event) => {
    console.log('Auth Lambda invoked with event:', JSON.stringify(event, null, 2));
    
    const { httpMethod, path, body } = event;
    
    try {
        switch (httpMethod) {
            case 'POST':
                if (path === '/auth') {
                    return await handleLogin(JSON.parse(body || '{}'));
                }
                break;
            case 'GET':
                if (path === '/auth') {
                    return await handleTokenValidation(event);
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
        console.error('Error in auth lambda:', error);
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

async function handleLogin(body) {
    const { username, password } = body;
    
    if (!username || !password) {
        return {
            statusCode: 400,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
            },
            body: JSON.stringify({ message: 'Username and password are required' }),
        };
    }
    
    // TODO: Implement Cognito authentication
    return {
        statusCode: 200,
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({ 
            message: 'Login successful',
            token: 'placeholder-token'
        }),
    };
}

async function handleTokenValidation(event) {
    // TODO: Implement token validation
    return {
        statusCode: 200,
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({ 
            message: 'Token validation',
            valid: true
        }),
    };
}