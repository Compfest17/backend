const express = require('express');
const router = express.Router();
const EmployeeController = require('../controllers/EmployeeController');
const { authenticateToken, requireRole } = require('../middleware/auth');

router.post('/generate-code', 
  authenticateToken, 
  requireRole(['admin']), 
  EmployeeController.generateVerificationCode
);

router.post('/verify-code', 
  authenticateToken, 
  EmployeeController.verifyEmployeeCode
);

router.get('/verification-codes', 
  authenticateToken, 
  requireRole(['admin']), 
  EmployeeController.getVerificationCodes
);

router.get('/by-province/:province', 
  authenticateToken, 
  requireRole(['admin', 'karyawan']), 
  EmployeeController.getEmployeesByProvince
);

router.get('/assigned-reports', 
  authenticateToken, 
  requireRole(['karyawan']), 
  EmployeeController.getAssignedReports
);

router.patch('/:id', 
  authenticateToken, 
  requireRole(['admin']), 
  EmployeeController.updateEmployee
);

router.patch('/:id/assignment', 
  authenticateToken, 
  requireRole(['admin', 'karyawan']), 
  EmployeeController.updateEmployeeAssignment
);

router.delete('/:id', 
  authenticateToken, 
  requireRole(['admin']), 
  EmployeeController.deleteEmployee
);

router.get('/analytics', 
  authenticateToken, 
  requireRole(['karyawan', 'admin']), 
  EmployeeController.getEmployeeAnalytics
);

router.get('/provinces', 
  authenticateToken, 
  requireRole(['admin', 'karyawan']), 
  EmployeeController.getProvinces
);

router.get('/search-provinces', 
  authenticateToken, 
  requireRole(['admin', 'karyawan']), 
  EmployeeController.searchProvinces
);

module.exports = router;
