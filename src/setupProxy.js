const { createProxyMiddleware } = require('http-proxy-middleware');

// Proxy same-origin /api requests to the Express backend on port 3001.
// Run React on :3000 only — do not start the React dev server on :3001.
module.exports = function setupProxy(app) {
  app.use(
    '/api',
    createProxyMiddleware({
      target: 'http://localhost:3001',
      changeOrigin: true,
      // Large browser Cookie headers can trigger 431 from the dev-server proxy.
      onProxyReq(proxyReq) {
        proxyReq.removeHeader('cookie');
      },
    }),
  );
};
