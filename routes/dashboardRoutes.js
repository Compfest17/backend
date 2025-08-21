const express = require('express');
const DashboardController = require('../controllers/DashboardController');
const DashboardEmployeeController = require('../controllers/DashboardEmployeeController');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();

router.get('/system-overview', 
  authenticateToken, 
  requireRole(['admin', 'karyawan']), 
  DashboardController.getSystemOverview
);

router.get('/employee-codes',
  authenticateToken,
  requireRole(['admin']),
  DashboardController.getEmployeeCodes
);

router.get('/by-province/:province', 
  authenticateToken, 
  requireRole(['karyawan']), 
  DashboardEmployeeController.getProgressReports
);

module.exports = router;
