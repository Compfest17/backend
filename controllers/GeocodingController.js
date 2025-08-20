const axios = require('axios');

class GeocodingController {
  static async searchAddresses(req, res) {
    try {
      const { q: query, limit = 5 } = req.query;
      
      if (!query || query.length < 2) {
        return res.json({ success: true, data: [], count: 0 });
      }

      const response = await axios.get('https://nominatim.openstreetmap.org/search', {
        params: {
          format: 'json',
          q: `${query}, Indonesia`,
          limit: parseInt(limit),
          addressdetails: 1,
          countrycodes: 'id'
        },
        timeout: 5000,
        headers: {
          'User-Agent': 'GatotkotaApp/1.0'
        }
      });

      const addresses = response.data.map(item => ({
        display_name: item.display_name,
        lat: parseFloat(item.lat),
        lon: parseFloat(item.lon),
        address: {
          road: item.address?.road,
          city: item.address?.city || item.address?.town || item.address?.village,
          state: item.address?.state,
          postcode: item.address?.postcode,
          country: item.address?.country
        }
      }));

      res.json({ 
        success: true, 
        data: addresses,
        count: addresses.length 
      });
    } catch (error) {
      console.error('Address search error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to search addresses'
      });
    }
  }

  static _provinceBoundaryCache = new Map();

  static async getProvinceBoundary(req, res) {
    try {
      const { province } = req.query;
      if (!province) {
        return res.status(400).json({ success: false, message: 'province is required' });
      }

      const cacheKey = province.toLowerCase();
      const cached = GeocodingController._provinceBoundaryCache.get(cacheKey);
      const now = Date.now();
      if (cached && (now - cached.timestamp) < 24 * 60 * 60 * 1000) {
        return res.json({ success: true, data: cached.data, cached: true });
      }

      const response = await axios.get('https://nominatim.openstreetmap.org/search', {
        params: {
          format: 'jsonv2',
          q: `${province}, Indonesia`,
          addressdetails: 1,
          polygon_geojson: 1,
          countrycodes: 'id',
          featuretype: 'state',
          limit: 5
        },
        timeout: 10000,
        headers: {
          'User-Agent': 'GatotkotaApp/1.0'
        }
      });

      const candidates = (response.data || []).filter(item => {
        const name = item.address?.state || item.address?.province || '';
        const isAdmin = item.type === 'administrative' || item.class === 'boundary';
        return isAdmin && name.toLowerCase() === province.toLowerCase();
      });

      const chosen = candidates[0] || (response.data || [])[0];
      if (!chosen || !chosen.geojson) {
        return res.status(404).json({ success: false, message: 'Boundary not found' });
      }

      const data = {
        name: chosen.address?.state || chosen.address?.province || province,
        center: { lat: parseFloat(chosen.lat), lon: parseFloat(chosen.lon) },
        boundingbox: chosen.boundingbox,
        geojson: chosen.geojson
      };

      GeocodingController._provinceBoundaryCache.set(cacheKey, { timestamp: now, data });

      res.json({ success: true, data });
    } catch (error) {
      console.error('Province boundary error:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch province boundary' });
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

      const response = await axios.get('https://nominatim.openstreetmap.org/reverse', {
        params: {
          format: 'json',
          lat: parseFloat(lat),
          lon: parseFloat(lon),
          addressdetails: 1
        },
        timeout: 5000,
        headers: {
          'User-Agent': 'GatotkotaApp/1.0'
        }
      });

      if (response.data && response.data.display_name) {
        res.json({
          success: true,
          data: {
            display_name: response.data.display_name,
            address: response.data.address
          }
        });
      } else {
        res.json({
          success: false,
          message: 'No address found for these coordinates'
        });
      }
    } catch (error) {
      console.error('Reverse geocoding error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to reverse geocode'
      });
    }
  }

  static async validateCoordinates(req, res) {
    try {
      const { lat, lon } = req.query;
      
      if (!lat || !lon) {
        return res.status(400).json({
          success: false,
          message: 'Latitude and longitude are required'
        });
      }

      const latitude = parseFloat(lat);
      const longitude = parseFloat(lon);

      if (isNaN(latitude) || isNaN(longitude) ||
          latitude < -90 || latitude > 90 ||
          longitude < -180 || longitude > 180) {
        return res.json({
          success: false,
          message: 'Invalid coordinates'
        });
      }

      const isInIndonesia = latitude >= -11 && latitude <= 6 &&
                           longitude >= 95 && longitude <= 141;

      res.json({
        success: true,
        data: {
          valid: true,
          inIndonesia: isInIndonesia,
          coordinates: { lat: latitude, lon: longitude }
        }
      });
    } catch (error) {
      console.error('Coordinate validation error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to validate coordinates'
      });
    }
  }
  static async searchProvinces(req, res) {
    try {
      const { query } = req.query;
      
      if (!query || query.length < 2) {
        return res.json({ success: true, data: [] });
      }

      const response = await axios.get('https://nominatim.openstreetmap.org/search', {
        params: {
          format: 'json',
          q: `${query}, Indonesia`,
          limit: 10,
          addressdetails: 1,
          extratags: 1,
          featuretype: 'state'
        },
        timeout: 5000,
        headers: {
          'User-Agent': 'GatotkotaApp/1.0'
        }
      });

      const provinces = response.data
        .filter(item => 
          item.address?.country === 'Indonesia' &&
          (item.address?.state || item.address?.province) &&
          item.type === 'administrative'
        )
        .map(item => ({
          name: item.address?.state || item.address?.province,
          display_name: item.display_name,
          lat: item.lat,
          lon: item.lon
        }))
        .filter((province, index, self) => 
          index === self.findIndex(p => p.name === province.name)
        );

      res.json({ success: true, data: provinces });
    } catch (error) {
      console.error('Province search error:', error);
      
      const fallbackProvinces = [
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

      const { query } = req.query;
      const filteredProvinces = fallbackProvinces
        .filter(province => province.toLowerCase().includes(query.toLowerCase()))
        .map(name => ({ name, display_name: `${name}, Indonesia`, lat: null, lon: null }));

      res.json({ 
        success: true, 
        data: filteredProvinces,
        fallback: true,
        message: 'Using fallback data due to API timeout'
      });
    }
  }

  static async searchCities(req, res) {
    try {
      const { query, province } = req.query;
      
      if (!query || query.length < 2 || !province) {
        return res.json({ success: true, data: [] });
      }

      const response = await axios.get('https://nominatim.openstreetmap.org/search', {
        params: {
          format: 'json',
          q: `${query}, ${province}, Indonesia`,
          limit: 10,
          addressdetails: 1,
          featuretype: 'city'
        },
        timeout: 5000,
        headers: {
          'User-Agent': 'GatotkotaApp/1.0'
        }
      });

      const cities = response.data
        .filter(item => 
          item.address?.country === 'Indonesia' &&
          (item.address?.state === province || item.address?.province === province) &&
          (item.address?.city || item.address?.town || item.address?.village || item.address?.county)
        )
        .map(item => ({
          name: item.address?.city || item.address?.town || item.address?.village || item.address?.county,
          display_name: item.display_name,
          lat: item.lat,
          lon: item.lon
        }))
        .filter((city, index, self) => 
          index === self.findIndex(c => c.name === city.name)
        );

      res.json({ success: true, data: cities });
    } catch (error) {
      console.error('City search error:', error);
      
      const fallbackCities = {
        'Aceh': ['Banda Aceh', 'Langsa', 'Lhokseumawe', 'Meulaboh', 'Sabang'],
        'Sumatera Utara': ['Medan', 'Binjai', 'Pematangsiantar', 'Tanjungbalai', 'Tebing Tinggi'],
        'Sumatera Barat': ['Padang', 'Bukittinggi', 'Padangpanjang', 'Pariaman', 'Payakumbuh'],
        'Riau': ['Pekanbaru', 'Dumai', 'Bengkalis', 'Kampar', 'Rokan Hulu'],
        'Jambi': ['Jambi', 'Sungai Penuh', 'Muaro Jambi', 'Batanghari', 'Tanjung Jabung Timur'],
        'Sumatera Selatan': ['Palembang', 'Prabumulih', 'Lubuklinggau', 'Pagar Alam', 'Lahat'],
        'Bengkulu': ['Bengkulu', 'Curup', 'Argamakmur', 'Manna', 'Kaur'],
        'Lampung': ['Bandar Lampung', 'Metro', 'Kotabumi', 'Liwa', 'Kalianda'],
        'Kepulauan Bangka Belitung': ['Pangkalpinang', 'Sungailiat', 'Manggar', 'Mentok', 'Toboali'],
        'Kepulauan Riau': ['Tanjungpinang', 'Batam', 'Bintan', 'Karimun', 'Natuna'],
        'DKI Jakarta': ['Jakarta Pusat', 'Jakarta Utara', 'Jakarta Barat', 'Jakarta Selatan', 'Jakarta Timur'],
        'Jawa Barat': ['Bandung', 'Bekasi', 'Bogor', 'Cirebon', 'Depok', 'Sukabumi', 'Tasikmalaya'],
        'Jawa Tengah': ['Semarang', 'Solo', 'Yogyakarta', 'Magelang', 'Pekalongan', 'Tegal'],
        'DI Yogyakarta': ['Yogyakarta', 'Bantul', 'Sleman', 'Gunungkidul', 'Kulon Progo'],
        'Jawa Timur': ['Surabaya', 'Malang', 'Kediri', 'Blitar', 'Mojokerto', 'Madiun', 'Pasuruan'],
        'Banten': ['Serang', 'Tangerang', 'Cilegon', 'Tangerang Selatan', 'Lebak'],
        'Bali': ['Denpasar', 'Singaraja', 'Tabanan', 'Gianyar', 'Klungkung'],
        'Nusa Tenggara Barat': ['Mataram', 'Bima', 'Dompu', 'Lombok Barat', 'Sumbawa'],
        'Nusa Tenggara Timur': ['Kupang', 'Ende', 'Maumere', 'Atambua', 'Bajawa'],
        'Kalimantan Barat': ['Pontianak', 'Singkawang', 'Sambas', 'Sanggau', 'Sintang'],
        'Kalimantan Tengah': ['Palangkaraya', 'Sampit', 'Muara Teweh', 'Pangkalan Bun', 'Kuala Kapuas'],
        'Kalimantan Selatan': ['Banjarmasin', 'Banjarbaru', 'Martapura', 'Amuntai', 'Rantau'],
        'Kalimantan Timur': ['Samarinda', 'Balikpapan', 'Bontang', 'Tarakan', 'Tenggarong'],
        'Kalimantan Utara': ['Tarakan', 'Bulungan', 'Malinau', 'Nunukan', 'Tana Tidung'],
        'Sulawesi Utara': ['Manado', 'Bitung', 'Tomohon', 'Kotamobagu', 'Minahasa'],
        'Sulawesi Tengah': ['Palu', 'Luwuk', 'Toli-Toli', 'Ampana', 'Parigi'],
        'Sulawesi Selatan': ['Makassar', 'Pare-Pare', 'Palopo', 'Sungguminasa', 'Watampone'],
        'Sulawesi Tenggara': ['Kendari', 'Bau-Bau', 'Kolaka', 'Unaaha', 'Raha'],
        'Gorontalo': ['Gorontalo', 'Limboto', 'Marisa', 'Tilamuta', 'Kwandang'],
        'Sulawesi Barat': ['Mamuju', 'Majene', 'Polewali', 'Tobadak', 'Pasangkayu'],
        'Maluku': ['Ambon', 'Tual', 'Masohi', 'Namlea', 'Dobo'],
        'Maluku Utara': ['Ternate', 'Tidore', 'Sofifi', 'Tobelo', 'Labuha'],
        'Papua Barat': ['Manokwari', 'Sorong', 'Fak-Fak', 'Kaimana', 'Waisai'],
        'Papua': ['Jayapura', 'Timika', 'Merauke', 'Nabire', 'Wamena']
      };

      const { query } = req.query;
      const cities = fallbackCities[province] || [];
      const filteredCities = cities
        .filter(city => city.toLowerCase().includes(query.toLowerCase()))
        .map(name => ({ name, display_name: `${name}, ${province}, Indonesia`, lat: null, lon: null }));

      res.json({ 
        success: true, 
        data: filteredCities,
        fallback: true,
        message: 'Using fallback data due to API timeout'
      });
    }
  }
}

module.exports = GeocodingController;