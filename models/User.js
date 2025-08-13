const { supabaseAdmin } = require('../config/supabase');

class User {
  static async create(userData) {
    const { data, error } = await supabaseAdmin
      .from('users')
      .insert(userData)
      .select(`
        id, 
        email, 
        full_name, 
        username,
        phone,
        role_id,
        level_id,
        avatar_url,
        created_at,
        roles(name, description),
        levels(name, points, description)
      `)
      .single();

    if (error) throw error;
    return data;
  }

  static async findByEmail(email) {
    const { data, error } = await supabaseAdmin
      .from('users')
      .select(`
        id, 
        email, 
        full_name, 
        username,
        phone,
        role_id,
        level_id,
        avatar_url,
        created_at,
        roles(name, description),
        levels(name, points, description)
      `)
      .eq('email', email)
      .is('deleted_at', null)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    return data;
  }

  static async findById(id) {
    const { data, error } = await supabaseAdmin
      .from('users')
      .select(`
        id, 
        email, 
        full_name, 
        username,
        phone,
        role_id,
        level_id,
        avatar_url,
        created_at,
        updated_at,
        roles(name, description),
        levels(name, points, description)
      `)
      .eq('id', id)
      .is('deleted_at', null)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    return data;
  }

  static async update(id, userData) {
    const { data, error } = await supabaseAdmin
      .from('users')
      .update({
        ...userData,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select(`
        id, 
        email, 
        full_name, 
        username,
        phone,
        role_id,
        level_id,
        avatar_url,
        updated_at,
        roles(name, description),
        levels(name, points, description)
      `)
      .single();

    if (error) throw error;
    return data;
  }

  static async updatePassword(id, hashedPassword) {
    const { data, error } = await supabaseAdmin
      .from('users')
      .update({
        password: hashedPassword,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select('id, email')
      .single();

    if (error) throw error;
    return data;
  }

  static async delete(id) {
    const { data, error } = await supabaseAdmin
      .from('users')
      .update({
        deleted_at: new Date().toISOString()
      })
      .eq('id', id)
      .select('id')
      .single();

    if (error) throw error;
    return data;
  }

  static async getStats(id) {
    const { data, error } = await supabaseAdmin
      .from('users')
      .select(`
        id,
        created_at,
        levels(points),
        reports:reports(count)
      `)
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  }

  static async existsByEmail(email) {
    const { data, error } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('email', email)
      .is('deleted_at', null)
      .single();

    return !!data && !error;
  }

  static async getAll(page = 1, limit = 10, filters = {}) {
    let query = supabaseAdmin
      .from('users')
      .select(`
        id, 
        email, 
        full_name, 
        username,
        phone,
        created_at,
        roles(name),
        levels(name, points)
      `)
      .is('deleted_at', null);

    if (filters.role) {
      query = query.eq('roles.name', filters.role);
    }
    if (filters.search) {
      query = query.or(`full_name.ilike.%${filters.search}%,email.ilike.%${filters.search}%`);
    }

    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const { data, error, count } = await query
      .range(from, to)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return {
      data,
      pagination: {
        page,
        limit,
        total: count,
        totalPages: Math.ceil(count / limit)
      }
    };
  }
}

module.exports = User;
