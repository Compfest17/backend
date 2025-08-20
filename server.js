const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
require('dotenv').config();

const { testConnection } = require('./config/database');
const { testSupabaseConnection } = require('./config/supabase');

const authRoutes = require('./routes/authRoutes');
const tagsRoutes = require('./routes/tagsRoutes');
const forumsRoutes = require('./routes/forumsRoutes');
const geocodingRoutes = require('./routes/geocodingRoutes');
const contactRoutes = require('./routes/contactRoutes');
const employeeRoutes = require('./routes/employeeRoutes');
const pointRoutes = require('./routes/pointRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const notificationRoutes = require('./routes/notificationRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(helmet());
app.use(compression());
app.use(morgan('combined'));
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000'
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.use('/api/auth', authRoutes);
app.use('/api/tags', tagsRoutes);
app.use('/api/forums', forumsRoutes);
app.use('/api/geocoding', geocodingRoutes);
app.use('/api/employee', employeeRoutes);
app.use('/api/points', pointRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api', contactRoutes);

app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    service: 'Infrastructure Report Backend'
  });
});

app.get('/test-db', async (req, res) => {
  try {
    const { supabaseDb } = require('./config/database');
    
    const { data, error } = await supabaseDb
      .from('auth.users')
      .select('count')
      .limit(1);
    
    if (error) {
      return res.status(500).json({
        status: 'Database connection failed',
        error: error.message
      });
    }
    
    res.status(200).json({
      status: 'Database connected successfully',
      database: 'Supabase PostgreSQL',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      status: 'Database connection failed',
      error: error.message
    });
  }
});

app.get('/test-auth', async (req, res) => {
  try {
    const { supabase } = require('./config/supabase');
    
    const { data, error } = await supabase.auth.getSession();
    
    res.status(200).json({
      status: 'Supabase Auth service accessible',
      hasSession: !!data.session,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      status: 'Supabase Auth connection failed',
      error: error.message
    });
  }
});

app.use('*', (req, res) => {
  res.status(404).json({
    status: 'Not Found',
    message: 'Route not found'
  });
});

app.use((error, req, res, next) => {
  console.error('Error:', error);
  res.status(500).json({
    status: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
  });
});

const startServer = async () => {
  try {
    console.log('🔧 Testing database connections...\n');
    
    await testConnection();
    
    await testSupabaseConnection();
    
    console.log('\n🚀 Starting server...');
    
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`Health check: http://localhost:${PORT}/health`);
      console.log(`Test database: http://localhost:${PORT}/test-db`);
      console.log(`Test auth: http://localhost:${PORT}/test-auth`);
      console.log(`Environment: ${process.env.NODE_ENV}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error.message);
    process.exit(1);
  }
};

startServer();

module.exports = app;
