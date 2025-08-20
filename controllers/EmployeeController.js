const User = require('../models/User');
const EmployeeCode = require('../models/EmployeeCode');
const ValidationUtils = require('../utils/ValidationUtils');
const { supabaseAdmin } = require('../config/supabase');

class EmployeeController {
  static async generateVerificationCode(req, res) {
    try {
      const { expiryHours, notes } = req.body;
      const adminId = req.user.id;

      const codeData = await EmployeeCode.create(
        adminId, 
        expiryHours || 24, 
        notes
      );

      res.status(201).json({
        success: true,
        message: 'Kode verifikasi berhasil dibuat',
        data: {
          code: codeData.code,
          expires_at: codeData.expires_at,
          expiry_hours: codeData.expiry_hours
        }
      });

    } catch (error) {
      console.error('Generate verification code error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  static async verifyEmployeeCode(req, res) {
    try {
      const { verificationCode } = req.body;
      const userId = req.user.id;

      if (!verificationCode) {
        return res.status(400).json({
          success: false,
          message: 'Kode verifikasi wajib diisi'
        });
      }

      const currentUser = await User.findById(userId);
      if (currentUser.roles?.name !== 'user') {
        return res.status(400).json({
          success: false,
          message: 'Hanya user biasa yang bisa upgrade ke karyawan'
        });
      }

      const upgradedUser = await User.upgradeToEmployee(userId, verificationCode);

      res.json({
        success: true,
        message: 'Berhasil upgrade ke karyawan',
        data: {
          user: {
            id: upgradedUser.id,
            email: upgradedUser.email,
            full_name: upgradedUser.full_name,
            role: upgradedUser.roles?.name,
            assigned_province: upgradedUser.assigned_province,
            assigned_city: upgradedUser.assigned_city
          }
        }
      });

    } catch (error) {
      console.error('Verify employee code error:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Kode verifikasi tidak valid'
      });
    }
  }

  static async getVerificationCodes(req, res) {
    try {
      const adminId = req.user.id;
      const { province, status } = req.query;

      const codes = await EmployeeCode.getByAdmin(adminId, { province, status });
      const stats = await EmployeeCode.getStats(adminId);

      res.json({
        success: true,
        data: {
          codes,
          stats
        }
      });

    } catch (error) {
      console.error('Get verification codes error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  static async getEmployeesByProvince(req, res) {
    try {
      const { province } = req.params;

      if (!province) {
        return res.status(400).json({
          success: false,
          message: 'Provinsi wajib diisi'
        });
      }

      const employees = await User.getEmployeesByProvince(province);

      res.json({
        success: true,
        data: employees
      });

    } catch (error) {
      console.error('Get employees by province error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  static async getAssignedReports(req, res) {
    try {
      const employeeId = req.user.id;
      const { reportStatus, priority } = req.query;

      const reports = await User.getAssignedReports(employeeId, {
        reportStatus,
        priority
      });

      res.json({
        success: true,
        data: reports
      });

    } catch (error) {
      console.error('Get assigned reports error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  static async updateEmployee(req, res) {
    try {
      const { id: employeeId } = req.params;
      const { full_name, email, username, phone } = req.body;
      
      const { data, error } = await supabaseAdmin
        .from('users')
        .update({
          full_name,
          email,
          username,
          phone
        })
        .eq('id', employeeId)
        .select(`
          id,
          full_name,
          email,
          username,
          phone,
          assigned_province,
          assigned_city,
          roles(name)
        `)
        .single();

      if (error) throw error;

      res.json({
        success: true,
        data: data,
        message: 'Employee updated successfully'
      });

    } catch (error) {
      console.error('Update employee error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  }

  static async deleteEmployee(req, res) {
    try {
      const { id: employeeId } = req.params;
      
      const { data: userRole } = await supabaseAdmin
        .from('roles')
        .select('id')
        .eq('name', 'user')
        .single();

      const { data, error } = await supabaseAdmin
        .from('users')
        .update({
          role_id: userRole.id,
          assigned_province: null,
          assigned_city: null,
          coverage_coordinates: null
        })
        .eq('id', employeeId)
        .select()
        .single();

      if (error) throw error;

      res.json({
        success: true,
        message: 'Employee removed successfully'
      });

    } catch (error) {
      console.error('Delete employee error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  }

  static async getProvinces(req, res) {
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

      res.json({
        success: true,
        data: provinces.map(name => ({ name }))
      });

    } catch (error) {
      console.error('Get provinces error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  static async searchProvinces(req, res) {
    try {
      const { query } = req.query;
      
      if (!query || query.length < 2) {
        return res.status(400).json({
          success: false,
          message: 'Query minimal 2 karakter'
        });
      }

      const GeocodingUtils = require('../utils/GeocodingUtils');
      
      const results = await GeocodingUtils.searchAddresses(`${query}, Indonesia`, {
        limit: 10,
        countryCode: 'id'
      });

      const provinces = results
        .filter(result => result.address?.state)
        .map(result => ({
          name: result.address.state,
          city: result.address.city,
          lat: result.lat,
          lon: result.lon,
          display_name: result.display_name
        }))
        .filter((province, index, self) => 
          index === self.findIndex(p => p.name === province.name)
        );

      res.json({
        success: true,
        data: provinces
      });

    } catch (error) {
      console.error('Search provinces error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  static async getEmployeeAnalytics(req, res) {
    try {
      const userId = req.user.id;
      const user = await User.findById(userId);

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      const userRole = user.roles?.name;
      if (userRole !== 'karyawan') {
        return res.status(403).json({
          success: false,
          message: 'Access denied - Analytics tab is only for employees (karyawan)'
        });
      }

      let analytics = {
        totalAssigned: 0,
        completed: 0,
        inProgress: 0,
        pending: 0,
        byPriority: {
          high: 0,
          medium: 0,
          low: 0
        },
        province: user.assigned_province,
        city: user.assigned_city,
        role: userRole
      };

      try {
        const { data: reports, error: reportsError } = await supabaseAdmin
          .from('forums')
          .select(`
            id, status, priority, created_at, address
          `)
          .ilike('address', `%${user.assigned_province}%`)
          .is('deleted_at', null);

        if (reportsError) throw reportsError;

        if (reports && reports.length > 0) {
          analytics = {
            totalAssigned: reports.length,
            completed: reports.filter(r => r.status === 'resolved').length,
            inProgress: reports.filter(r => r.status === 'in_progress').length,
            pending: reports.filter(r => r.status === 'open').length,
            byPriority: {
              high: reports.filter(r => r.priority === 'high').length,
              medium: reports.filter(r => r.priority === 'medium').length,
              low: reports.filter(r => r.priority === 'low').length
            },
            province: user.assigned_province,
            city: user.assigned_city,
            role: userRole
          };
        }
      } catch (error) {
        console.log('Error fetching analytics data, using defaults:', error);
      }

      res.json({
        success: true,
        data: analytics
      });

    } catch (error) {
      console.error('Get employee analytics error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  }

  static async getAssignedReports(req, res) {
    try {
      const employeeId = req.user.id;
      const { reportStatus, priority, dateFilter, page = 1, limit = 10 } = req.query;
      
      const filters = {};
      if (reportStatus) filters.reportStatus = reportStatus;
      if (priority) filters.priority = priority;
      if (dateFilter) filters.dateFilter = dateFilter;
      
      const reports = await User.getAssignedReports(employeeId, filters);
      
      const startIndex = (parseInt(page) - 1) * parseInt(limit);
      const endIndex = startIndex + parseInt(limit);
      const paginatedReports = reports.slice(startIndex, endIndex);
      
      res.json({
        success: true,
        data: paginatedReports,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: reports.length,
          totalPages: Math.ceil(reports.length / parseInt(limit))
        }
      });

    } catch (error) {
      console.error('Get assigned reports error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  }

  static async updateEmployeeAssignment(req, res) {
    try {
      const { id: employeeId } = req.params;
      const { assigned_province, assigned_city, coverage_coordinates } = req.body;
      const userRole = req.user.roles?.name;
      const currentUserId = req.user.id;
      
      if (userRole === 'karyawan' && currentUserId !== employeeId) {
        return res.status(403).json({
          success: false,
          message: 'You can only update your own assignment'
        });
      }
      
      if (!assigned_province) {
        return res.status(400).json({
          success: false,
          message: 'Assigned province is required'
        });
      }

      const { data, error } = await supabaseAdmin
        .from('users')
        .update({
          assigned_province,
          assigned_city: assigned_city || null,
          coverage_coordinates
        })
        .eq('id', employeeId)
        .select(`
          id,
          full_name,
          email,
          assigned_province,
          assigned_city,
          coverage_coordinates,
          roles(name)
        `)
        .single();

      if (error) throw error;

      res.json({
        success: true,
        data: data,
        message: 'Employee assignment updated successfully'
      });

    } catch (error) {
      console.error('Update employee assignment error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  }
}

module.exports = EmployeeController;
