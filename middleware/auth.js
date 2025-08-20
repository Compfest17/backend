const jwt = require('jsonwebtoken');
const { supabaseAdmin } = require('../config/supabase');


const tokenBlacklist = new Set();

const addTokenToBlacklist = (token) => {
  tokenBlacklist.add(token);

  setTimeout(() => {
    tokenBlacklist.delete(token);
  }, 24 * 60 * 60 * 1000); 
};

const isTokenBlacklisted = (token) => {
  return tokenBlacklist.has(token);
};

const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; 

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access token diperlukan'
      });
    }

    if (isTokenBlacklisted(token)) {
      return res.status(401).json({
        success: false,
        message: 'Token sudah tidak valid, silakan login kembali'
      });
    }

    const { supabase } = require('../config/supabase');
    const { data: { user: supabaseUser }, error: supabaseError } = await supabase.auth.getUser(token);
    
    console.log('Supabase auth attempt:', { 
      hasSupabaseUser: !!supabaseUser, 
      supabaseError: supabaseError?.message || 'none',
      tokenLength: token?.length 
    });
    
    if (!supabaseError && supabaseUser) {
      console.log('🟢 Using Supabase auth path');
      const { data: user, error } = await supabaseAdmin
        .from('users')
        .select(`
          id, 
          email, 
          full_name, 
          username, 
          role_id,
          level_id,
          current_points,
          assigned_province,
          assigned_city,
          coverage_coordinates,
          roles(name),
          levels(name, points)
        `)
        .eq('email', supabaseUser.email)
        .is('deleted_at', null)
        .single();

      console.log('🔍 Supabase user query result:');
      console.log('📧 Email:', supabaseUser.email);
      console.log('❌ Query error:', error);
      console.log('👤 User data:', JSON.stringify(user, null, 2));

      if (error || !user) {
        return res.status(401).json({
          success: false,
          message: 'User tidak ditemukan'
        });
      }

      req.user = user;
      req.supabaseUser = supabaseUser;
      req.token = token;
      return next();
    }

    console.log('🔴 Falling back to custom JWT verification');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('✅ Custom JWT decoded successfully:', { userId: decoded.id, email: decoded.email });
    
    const { data: user, error } = await supabaseAdmin
      .from('users')
      .select(`
        id, 
        email, 
        full_name, 
        username, 
        role_id,
        level_id,
        roles(name),
        levels(name, points)
      `)
      .eq('id', decoded.id)
      .is('deleted_at', null)
      .single();

    console.log('🔍 JWT user query result:');
    console.log('🆔 User ID:', decoded.id);
    console.log('❌ Query error:', error);
    console.log('👤 User data:', JSON.stringify(user, null, 2));

    if (error || !user) {
      return res.status(401).json({
        success: false,
        message: 'User tidak ditemukan'
      });
    }

    req.user = user;
    req.token = token;
    next();

  } catch (error) {
    console.error('Auth middleware error:', error);
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Token tidak valid'
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token telah kadaluarsa'
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};const requireRole = (allowedRoles) => {
  return (req, res, next) => {
    console.log('🔐 requireRole middleware called');
    console.log('📝 Allowed roles:', allowedRoles);
    console.log('👤 req.user exists:', !!req.user);
    
    if (!req.user) {
      console.log('❌ No req.user found');
      return res.status(401).json({
        success: false,
        message: 'Authentication diperlukan'
      });
    }

    console.log('👤 Full req.user object:', JSON.stringify(req.user, null, 2));
    
    const userRole = req.user.roles?.name;
    const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
    
    console.log('🎭 User role from req.user.roles?.name:', userRole);
    console.log('🎭 Required roles:', roles);
    
    if (!roles.includes(userRole)) {
      console.log('❌ Role check failed');
      console.log('❌ User role:', userRole);
      console.log('❌ Allowed roles:', roles);
      return res.status(403).json({
        success: false,
        message: 'Akses ditolak: Role tidak sesuai'
      });
    }

    console.log('✅ Role check passed');
    next();
  };
};

const requireAdmin = requireRole('admin');

const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      req.user = null;
      return next();
    }

    if (isTokenBlacklisted(token)) {
      req.user = null;
      return next();
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    const { data: user, error } = await supabaseAdmin
      .from('users')
      .select(`
        id, 
        email, 
        full_name, 
        username, 
        role_id,
        level_id,
        roles(name),
        levels(name, points)
      `)
      .eq('id', decoded.id)
      .is('deleted_at', null)
      .single();

    req.user = error || !user ? null : user;
    req.token = token;
    next();

  } catch (error) {
    req.user = null;
    next();
  }
};

const authenticateForLogout = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; 

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access token diperlukan untuk logout'
      });
    }
    
    req.token = token;
    next();

  } catch (error) {
    console.error('Auth for logout error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

module.exports = {
  authenticateToken,
  requireRole,
  requireAdmin,
  optionalAuth,
  authenticateForLogout,
  addTokenToBlacklist
};
