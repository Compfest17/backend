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
        banner_url,
        current_points,
        assigned_province,
        assigned_city,
        coverage_coordinates,
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
        banner_url,
        current_points,
        assigned_province,
        assigned_city,
        coverage_coordinates,
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
        banner_url,
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
        assigned_province,
        assigned_city,
        coverage_coordinates,
        created_at,
        roles(name),
        levels(name, points)
      `)
      .is('deleted_at', null);

    if (filters.role) {
      const Role = require('./Role');
      const roleData = await Role.findByName(filters.role);
      if (roleData) {
        query = query.eq('role_id', roleData.id);
      }
    }
    if (filters.search) {
      query = query.or(`full_name.ilike.%${filters.search}%,email.ilike.%${filters.search}%`);
    }
    if (filters.province) {
      query = query.eq('assigned_province', filters.province);
    }

    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const { data, error, count } = await query
      .range(from, to)
      .order('created_at', { ascending: false });
    
    let countQuery = supabaseAdmin
      .from('users')
      .select('*', { count: 'exact', head: true })
      .is('deleted_at', null);

    if (filters.role) {
      const Role = require('./Role');
      const roleData = await Role.findByName(filters.role);
      if (roleData) {
        countQuery = countQuery.eq('role_id', roleData.id);
      }
    }
    if (filters.search) {
      countQuery = countQuery.or(`full_name.ilike.%${filters.search}%,email.ilike.%${filters.search}%`);
    }
    if (filters.province) {
      countQuery = countQuery.eq('assigned_province', filters.province);
    }

    const { count: totalCount, error: countError } = await countQuery;
    
    if (countError) throw countError;

    if (error) throw error;

    return {
      data,
      pagination: {
        page,
        limit,
        total: totalCount || 0,
        totalPages: Math.ceil((totalCount || 0) / limit)
      }
    };
  }

  static async upgradeToEmployee(userId, verificationCode) {
    const EmployeeCode = require('./EmployeeCode');
    
    const validation = await EmployeeCode.validateCode(verificationCode, userId);
    if (!validation.isValid) {
      throw new Error(validation.message);
    }

    const Role = require('./Role');
    const employeeRole = await Role.findByName('karyawan');
    if (!employeeRole) {
      throw new Error('Employee role not found');
    }

    const { data, error } = await supabaseAdmin
      .from('users')
      .update({
        role_id: employeeRole.id,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)
      .select(`
        id, 
        email, 
        full_name, 
        username,
        phone,
        assigned_province,
        assigned_city,
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

  static async getEmployeesByProvince(province) {
    const { data, error } = await supabaseAdmin
      .from('users')
      .select(`
        id,
        full_name,
        email,
        assigned_province,
        assigned_city,
        coverage_coordinates,
        roles(name)
      `)
      .eq('assigned_province', province)
      .eq('roles.name', 'karyawan')
      .is('deleted_at', null);

    if (error) throw error;
    return data;
  }

  static async getAssignedReports(employeeId, filters = {}) {
    try {
      
      const employee = await this.findById(employeeId);
      
      if (!employee || !employee.assigned_province) {
        return [];
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
          in_progress_at,
          resolved_at,
          closed_at,
          incident_date,
          updated_at
        `)
        .ilike('address', `%${employee.assigned_province}%`);

      if (filters.reportStatus) {
        const statuses = Array.isArray(filters.reportStatus)
          ? filters.reportStatus
          : String(filters.reportStatus).includes(',')
            ? String(filters.reportStatus).split(',').map(s => s.trim()).filter(Boolean)
            : null;
        if (statuses && statuses.length > 0) {
          query = query.in('status', statuses);
        } else {
          query = query.eq('status', filters.reportStatus);
        }
      }
      if (filters.priority) {
        query = query.eq('priority', filters.priority);
      }

      const { data: reports, error: reportsError } = await query.order('created_at', { ascending: false });
      
      if (reportsError) throw reportsError;
      
      return reports.map(report => ({
        id: `fallback-${report.id}`,
        assignment_type: 'province_based',
        assigned_at: report.created_at,
        status: 'active',
        forums: report
      }));
    } catch (error) {
      console.log('Error in getAssignedReports fallback:', error);
      return [];
    }
  }

  static async addPoints(userId, points, description = 'Points earned') {
    try {
      const user = await this.findById(userId);
      if (!user) throw new Error('User not found');

      const newPoints = (user.current_points || 0) + points;

      const { data, error } = await supabaseAdmin
        .from('users')
        .update({ current_points: newPoints })
        .eq('id', userId)
        .select()
        .single();

      if (error) throw error;

      await this.updateUserLevel(userId, newPoints);

      return { 
        success: true, 
        newPoints, 
        pointsAdded: points 
      };
    } catch (error) {
      console.error('Add points error:', error);
      throw error;
    }
  }

  static async updateUserLevel(userId, currentPoints) {
    try {
      const { data: levels, error: levelsError } = await supabaseAdmin
        .from('levels')
        .select('*')
        .lte('points', currentPoints)
        .order('points', { ascending: false })
        .limit(1);

      if (levelsError) throw levelsError;

      if (levels && levels.length > 0) {
        const appropriateLevel = levels[0];

        const { error: updateError } = await supabaseAdmin
          .from('users')
          .update({ level_id: appropriateLevel.id })
          .eq('id', userId);

        if (updateError) throw updateError;

        return appropriateLevel;
      }
    } catch (error) {
      console.error('Update user level error:', error);
      throw error;
    }
  }
}

module.exports = User;
