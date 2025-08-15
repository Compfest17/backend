const GeocodingUtils = require('../utils/GeocodingUtils');

class GeocodingController {
  static async searchAddresses(req, res) {
    try {
      const { q: query, limit = 5 } = req.query;

      if (!query || query.trim().length < 3) {
        return res.status(400).json({
          success: false,
          message: 'Query must be at least 3 characters long'
        });
      }

      const addresses = await GeocodingUtils.searchAddresses(query, {
        limit: Math.min(parseInt(limit), 10), 
        countryCode: 'id'
      });

      res.json({
        success: true,
        data: addresses,
        count: addresses.length
      });

    } catch (error) {
      console.error('Error in searchAddresses:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to search addresses',
        error: error.message
      });
    }
  }

  static async reverseGeocode(req, res) {
    try {
      const { lat, lon } = req.query;

      if (!lat || !lon) {
        return res.status(400).json({
          success: false,
          message: 'Latitude and longitude are required'
        });
      }

      if (!GeocodingUtils.validateCoordinates(lat, lon)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid coordinates'
        });
      }

      const address = await GeocodingUtils.reverseGeocode(lat, lon);

      res.json({
        success: true,
        data: address
      });

    } catch (error) {
      console.error('Error in reverseGeocode:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to reverse geocode coordinates',
        error: error.message
      });
    }
  }

  static validateCoordinates(req, res) {
    try {
      const { lat, lon } = req.query;

      if (!lat || !lon) {
        return res.status(400).json({
          success: false,
          message: 'Latitude and longitude are required'
        });
      }

      const isValid = GeocodingUtils.validateCoordinates(lat, lon);
      const isInIndonesia = isValid ? GeocodingUtils.isWithinIndonesia(lat, lon) : false;

      res.json({
        success: true,
        data: {
          valid: isValid,
          withinIndonesia: isInIndonesia,
          lat: parseFloat(lat),
          lon: parseFloat(lon)
        }
      });

    } catch (error) {
      console.error('Error in validateCoordinates:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to validate coordinates',
        error: error.message
      });
    }
  }
}

module.exports = GeocodingController;
