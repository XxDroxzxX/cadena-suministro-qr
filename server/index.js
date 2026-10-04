const app = require('./app');
const { ensureDatabase } = require('./db/database');
require('dotenv').config();

const PORT = process.env.PORT || 3001;

const start = async () => {
  try {
    await ensureDatabase();
    app.listen(PORT, () => {
      console.log(`🚀 SPECIAL CLEAN OIL Server running on port ${PORT}`);
      console.log(`📦 API: http://localhost:${PORT}/api`);
    });
  } catch (err) {
    console.error('❌ Failed to start server:', err);
    process.exit(1);
  }
};

if (require.main === module) {
  start();
}

module.exports = app;
