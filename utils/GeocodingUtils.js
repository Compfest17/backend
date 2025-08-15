const axios = require('axios');

class GeocodingUtils {
  static NOMINATIM_BASE_URL = 'https://nominatim.openstreetmap.org';
  
  /**
   * Search addresses using OSM Nominatim
   * @param {string} query - Address query
   * @param {object} options - Search options
   * @returns {Promise<Array>} - Array of address suggestions
   */
  static async searchAddresses(query, options = {}) {
    try {
      const {
        limit = 5,
        countryCode = 'id', 
        format = 'json'
      } = options;

      const params = new URLSearchParams({
        q: query,
        format,
        limit,
        countrycodes: countryCode,
        addressdetails: '1',
        extratags: '1',
        namedetails: '1'
      });

      const response = await axios.get(`${this.NOMINATIM_BASE_URL}/search?${params}`, {
        headers: {
          'User-Agent': 'GatotKota-App/1.0 (Infrastructure Report System)'
        },
        timeout: 5000
      });

      return response.data.map(item => ({
        display_name: item.display_name,
        lat: parseFloat(item.lat),
        lon: parseFloat(item.lon),
        address: {
          road: item.address?.road,
          city: item.address?.city || item.address?.town || item.address?.village,
          state: item.address?.state,
          postcode: item.address?.postcode,
          country: item.address?.country
        },
        importance: item.importance,
        osm_id: item.osm_id,
        osm_type: item.osm_type
      }));

    } catch (error) {
      console.error('Geocoding error:', error.message);
      throw new Error('Failed to search addresses');
    }
  }

  /**
   * Reverse geocoding - convert coordinates to address
   * @param {number} lat - Latitude
   * @param {number} lon - Longitude
   * @returns {Promise<object>} - Address object
   */
  static async reverseGeocode(lat, lon) {
    try {
      const params = new URLSearchParams({
        lat,
        lon,
        format: 'json',
        addressdetails: '1',
        zoom: '18'
      });

      const response = await axios.get(`${this.NOMINATIM_BASE_URL}/reverse?${params}`, {
        headers: {
          'User-Agent': 'GatotKota-App/1.0 (Infrastructure Report System)'
        },
        timeout: 5000
      });

      const data = response.data;
      
      return {
        display_name: data.display_name,
        address: {
          road: data.address?.road,
          city: data.address?.city || data.address?.town || data.address?.village,
          state: data.address?.state,
          postcode: data.address?.postcode,
          country: data.address?.country
        },
        lat: parseFloat(data.lat),
        lon: parseFloat(data.lon)
      };

    } catch (error) {
      console.error('Reverse geocoding error:', error.message);
      throw new Error('Failed to reverse geocode coordinates');
    }
  }

  /**
   * Validate coordinates
   * @param {number} lat - Latitude
   * @param {number} lon - Longitude
   * @returns {boolean} - True if valid
   */
  static validateCoordinates(lat, lon) {
    const latitude = parseFloat(lat);
    const longitude = parseFloat(lon);
    
    return !isNaN(latitude) && 
           !isNaN(longitude) && 
           latitude >= -90 && 
           latitude <= 90 && 
           longitude >= -180 && 
           longitude <= 180;
  }

  /**
   * Check if coordinates are within Indonesia bounds (approximate)
   * @param {number} lat - Latitude
   * @param {number} lon - Longitude
   * @returns {boolean} - True if within Indonesia
   */
  static isWithinIndonesia(lat, lon) {
    const latitude = parseFloat(lat);
    const longitude = parseFloat(lon);
    
    return latitude >= -11 && 
           latitude <= 6 && 
           longitude >= 95 && 
           longitude <= 141;
  }
}

module.exports = GeocodingUtils;
