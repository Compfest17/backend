const { supabaseAdmin } = require('../config/supabase');
const NotificationService = require('../services/NotificationService');

class DashboardEmployeeController { 
  static async getProgressReports(req, res) {
    try {
      const { province } = req.params;
      const { status } = req.query; 
      
      if (!province) {
        return res.status(400).json({
          success: false,
          message: 'Province parameter required'
        });
      }

      let query = supabaseAdmin
        .from('forums')
        .select(`
          id,
          title,
          description,
          latitude,
          longitude,
          address,
          status,
          priority,
          created_at,
          incident_date,
          users(full_name, email)
        `)
        .ilike('address', `%${province}%`)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (status) {
        query = query.eq('status', status);
      }

      const { data, error } = await query;

      if (error) throw error;

      // kalau ada filter status dan data kosong → kasih pesan
      if (status && (!data || data.length === 0)) {
        return res.status(404).json({
          success: false,
          message: `Tidak ada laporan dengan status "${status}" di provinsi "${province}"`
        });
      }

      res.json({
        success: true,
        data: data || []
      });

    } catch (error) {
      console.error('Get reports by province error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }
}

module.exports = DashboardEmployeeController;
