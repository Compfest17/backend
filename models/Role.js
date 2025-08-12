const { supabaseAdmin } = require('../config/supabase');

class Role {
  static async getAll() {
    const { data, error } = await supabaseAdmin
      .from('roles')
      .select('*')
      .order('name');

    if (error) throw error;
    return data;
  }

  static async findByName(name) {
    const { data, error } = await supabaseAdmin
      .from('roles')
      .select('*')
      .eq('name', name)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    return data;
  }

  static async findById(id) {
    const { data, error } = await supabaseAdmin
      .from('roles')
      .select('*')
      .eq('id', id)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    return data;
  }

  static async getDefault() {
    let role = await this.findByName('user');
    
    if (!role) {
      role = await this.create({
        name: 'user',
        description: 'Regular user - pengguna biasa'
      });
    }

    return role;
  }

  static async create(roleData) {
    const { data, error } = await supabaseAdmin
      .from('roles')
      .insert(roleData)
      .select('*')
      .single();

    if (error) throw error;
    return data;
  }

  static async ensureDefaultRoles() {
    const defaultRoles = [
      { name: 'user', description: 'Regular user - pengguna biasa' },
      { name: 'karyawan', description: 'Employee - karyawan perusahaan' },
      { name: 'admin', description: 'Administrator - admin sistem' }
    ];

    const existingRoles = await this.getAll();
    const existingRoleNames = existingRoles.map(r => r.name);

    const rolesToCreate = defaultRoles.filter(
      role => !existingRoleNames.includes(role.name)
    );

    if (rolesToCreate.length > 0) {
      const { data, error } = await supabaseAdmin
        .from('roles')
        .insert(rolesToCreate)
        .select('*');

      if (error) throw error;
      return data;
    }

    return [];
  }
}

module.exports = Role;
