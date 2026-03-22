const AWS = require('aws-sdk');
const { Client } = require('pg');

const secretsManager = new AWS.SecretsManager();

let dbClient = null;

async function getDbCredentials() {
    const secretArn = process.env.DATABASE_SECRET_ARN;
    
    if (!secretArn) {
        throw new Error('DATABASE_SECRET_ARN environment variable is not set');
    }
    
    try {
        const result = await secretsManager.getSecretValue({ SecretId: secretArn }).promise();
        return JSON.parse(result.SecretString);
    } catch (error) {
        console.error('Error retrieving database credentials:', error);
        throw error;
    }
}

async function getDbClient() {
    if (!dbClient) {
        const credentials = await getDbCredentials();
        
        dbClient = new Client({
            host: credentials.host,
            port: credentials.port,
            database: credentials.dbname,
            user: credentials.username,
            password: credentials.password,
            ssl: {
                rejectUnauthorized: false
            }
        });
        
        await dbClient.connect();
    }
    
    return dbClient;
}

async function closeDbConnection() {
    if (dbClient) {
        await dbClient.end();
        dbClient = null;
    }
}

module.exports = {
    getDbClient,
    closeDbConnection
};