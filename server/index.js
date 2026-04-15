const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const { initDatabase } = require('./db/database');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// API Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/products', require('./routes/products'));
app.use('/api/categories', require('./routes/categories'));
app.use('/api/stands', require('./routes/stands'));
app.use('/api/stock', require('./routes/stock'));
app.use('/api/users', require('./routes/users'));
app.use('/api/customers', require('./routes/customers'));

// Serve frontend in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '..', 'dist')));
  app.get(/.*/, (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'dist', 'index.html'));
  });
}

// Async start function to ensure DB is ready
const start = async () => {
  try {
    await initDatabase();
    app.listen(PORT, () => {
      console.log(`🚀 SPECIAL CLEAN OIL Server running on port ${PORT}`);
      console.log(`📦 API: http://localhost:${PORT}/api`);
    });
  } catch (err) {
    console.error('❌ Failed to start server:', err);
    process.exit(1);
  }
};

start();
