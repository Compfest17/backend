const express = require('express');
const GeocodingController = require('../controllers/GeocodingController');

const router = express.Router();

router.get('/search', GeocodingController.searchAddresses);

router.get('/reverse', GeocodingController.reverseGeocode);

router.get('/validate', GeocodingController.validateCoordinates);

module.exports = router;
