const express = require('express');
const router = express.Router();
const GeocodingController = require('../controllers/GeocodingController');
const { authenticateToken } = require('../middleware/auth');

router.get('/search', authenticateToken, GeocodingController.searchAddresses);

router.get('/reverse', authenticateToken, GeocodingController.reverseGeocode);

router.get('/validate', authenticateToken, GeocodingController.validateCoordinates);

router.get('/provinces', authenticateToken, GeocodingController.searchProvinces);

router.get('/cities', authenticateToken, GeocodingController.searchCities);

router.get('/province-boundary', authenticateToken, GeocodingController.getProvinceBoundary);

module.exports = router;