'use strict';

/**
 * Local dev server that runs the real API Lambda handler (lambda/api/index.js)
 * over plain HTTP, so the rental-app frontend can hit VITE_API_BASE_URL
 * (default http://localhost:3001) without deploying to AWS.
 *
 * Only public routes (see `isProtectedEndpoint` in the handler, e.g.
 * GET /vehicles/search) work out of the box — anything requiring Cognito
 * auth or real AWS resources will 401/500 here, same as it would with an
 * unconfigured deployment.
 */

const http = require('http');
const { URL } = require('url');

const PORT = process.env.LOCAL_API_PORT || 3001;

const { handler } = require('./lambda/api/index.js');

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://localhost:${PORT}`);
    const queryStringParameters = Object.fromEntries(url.searchParams.entries());
    const body = await readBody(req);

    const event = {
      httpMethod: req.method,
      path: url.pathname,
      queryStringParameters: Object.keys(queryStringParameters).length ? queryStringParameters : null,
      headers: req.headers,
      body: body || null,
    };

    const result = await handler(event, {});

    res.writeHead(result.statusCode, result.headers || {});
    res.end(result.body || '');
  } catch (err) {
    console.error('Local API server error:', err);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Internal server error', message: err.message }));
  }
});

server.listen(PORT, () => {
  console.log(`Local API (lambda/api/index.js) listening on http://localhost:${PORT}`);
});
