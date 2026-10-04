const app = require('../server/app');

module.exports = (req, res) => {
  const requestUrl = new URL(req.url, 'http://localhost');
  const routePath = requestUrl.searchParams.get('path');

  if (routePath) {
    requestUrl.searchParams.delete('path');
    req.url = `/api/${routePath}${requestUrl.search}`;
  }

  return app(req, res);
};