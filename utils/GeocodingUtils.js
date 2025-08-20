const axios = require('axios');

class GeocodingUtils {
  static NOMINATIM_BASE_URL = 'https://nominatim.openstreetmap.org';
  

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


  static isWithinIndonesia(lat, lon) {
    const latitude = parseFloat(lat);
    const longitude = parseFloat(lon);
    
    return latitude >= -11 && 
           latitude <= 6 && 
           longitude >= 95 && 
           longitude <= 141;
  }


  static async getIndonesianProvinces() {
    try {
      const provinces = [
        'Aceh', 'Sumatera Utara', 'Sumatera Barat', 'Riau', 'Jambi', 
        'Sumatera Selatan', 'Bengkulu', 'Lampung', 'Kepulauan Bangka Belitung',
        'Kepulauan Riau', 'DKI Jakarta', 'Jawa Barat', 'Jawa Tengah', 
        'DI Yogyakarta', 'Jawa Timur', 'Banten', 'Bali', 'Nusa Tenggara Barat',
        'Nusa Tenggara Timur', 'Kalimantan Barat', 'Kalimantan Tengah',
        'Kalimantan Selatan', 'Kalimantan Timur', 'Kalimantan Utara',
        'Sulawesi Utara', 'Sulawesi Tengah', 'Sulawesi Selatan', 
        'Sulawesi Tenggara', 'Gorontalo', 'Sulawesi Barat', 'Maluku',
        'Maluku Utara', 'Papua Barat', 'Papua'
      ];

      const provinceData = await Promise.all(
        provinces.map(async (provinceName) => {
          try {
            const searchResults = await this.searchAddresses(`${provinceName}, Indonesia`, {
              limit: 1,
              countryCode: 'id'
            });
            
            if (searchResults.length > 0) {
              const result = searchResults[0];
              return {
                name: provinceName,
                lat: result.lat,
                lon: result.lon,
                display_name: result.display_name,
                bounds: result.boundingbox || null
              };
            }
            
            return { name: provinceName, lat: null, lon: null };
          } catch (error) {
            console.error(`Failed to geocode ${provinceName}:`, error);
            return { name: provinceName, lat: null, lon: null };
          }
        })
      );

      return provinceData.filter(province => province.lat && province.lon);
    } catch (error) {
      console.error('Failed to fetch Indonesian provinces:', error);
      throw new Error('Failed to fetch province data');
    }
  }


  static extractProvinceFromAddress(address) {
    if (!address) return null;
    
    const parts = address.split(',').map(part => part.trim());
    return parts[parts.length - 1] || null;
  }


  static calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }
}

module.exports = GeocodingUtils;
