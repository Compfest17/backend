const { supabaseAdmin } = require('../config/supabase');

class EmployeeCode {
  static generateGeneralCode() {
    const year = new Date().getFullYear().toString().slice(-2);
    const randomChars = Math.random().toString(36).substring(2, 6).toUpperCase();
    const randomNum = Math.floor(Math.random() * 100).toString().padStart(2, '0');
    return `EMP${year}${randomChars}${randomNum}`;
  }

  static async create(createdBy, expiryHours = 24, notes = null) {
    const code = this.generateGeneralCode();
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + expiryHours);

    const { data, error } = await supabaseAdmin
      .from('employee_verification_codes')
      .insert({
        code,
        province: 'GENERAL',
        expires_at: expiresAt.toISOString(),
        expiry_hours: expiryHours,
        created_by: createdBy,
        notes: notes || 'General employee verification code'
      })
      .select('*')
      .single();

    if (error) throw error;
    return data;
  }

  static async validateCode(code, userId) {
    const { data, error } = await supabaseAdmin
      .from('employee_verification_codes')
      .select('*')
      .eq('code', code.toUpperCase())
      .gt('expires_at', new Date().toISOString())
      .single();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    if (!data) {
      return { isValid: false, message: 'Kode tidak valid atau sudah expired' };
    }

    const { data: usageHistory } = await supabaseAdmin
      .from('code_usage_history')
      .select('*')
      .eq('code_id', data.id)
      .eq('used_by', userId);

    if (usageHistory && usageHistory.length > 0) {
      return { isValid: false, message: 'Anda sudah menggunakan kode ini sebelumnya' };
    }

    if (data.max_uses && data.current_uses >= data.max_uses) {
      return { isValid: false, message: 'Kode sudah mencapai batas maksimal penggunaan' };
    }

    return { 
      isValid: true, 
      province: data.province, 
      city: data.city,
      codeData: data
    };
  }

  static async markCodeAsUsed(codeId, userId) {
    const { error: historyError } = await supabaseAdmin
      .from('code_usage_history')
      .insert({
        code_id: codeId,
        used_by: userId
      });

    if (historyError) throw historyError;

    const { data, error } = await supabaseAdmin
      .from('employee_verification_codes')
      .update({
        current_uses: supabaseAdmin.raw('current_uses + 1')
      })
      .eq('id', codeId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async getByAdmin(adminId, filters = {}) {
    let query = supabaseAdmin
      .from('employee_verification_codes')
      .select('*')
      .eq('created_by', adminId)
      .order('created_at', { ascending: false });

    if (filters.status === 'active') {
      query = query.gt('expires_at', new Date().toISOString());
    } else if (filters.status === 'expired') {
      query = query.lt('expires_at', new Date().toISOString());
    }

    if (filters.province && filters.province !== 'all') {
      query = query.eq('province', filters.province);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  }

  static async getStats(adminId) {
    const codes = await this.getByAdmin(adminId);
    const now = new Date();

    const stats = {
      total: codes.length,
      used: codes.filter(code => code.current_uses > 0).length,
      active: codes.filter(code => new Date(code.expires_at) > now).length,
      expired: codes.filter(code => new Date(code.expires_at) <= now).length
    };

    return stats;
  }

  static async getAllProvinces() {
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

    return provinces.map(name => ({ name }));
  }

  static async delete(codeId, adminId) {
    const { data, error } = await supabaseAdmin
      .from('employee_verification_codes')
      .delete()
      .eq('id', codeId)
      .eq('created_by', adminId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }
}

module.exports = EmployeeCode;