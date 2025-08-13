const jwt = require('jsonwebtoken');
const { supabaseAdmin } = require('../config/supabase');

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

    const { supabase } = require('../config/supabase');
    const { data: { user: supabaseUser }, error: supabaseError } = await supabase.auth.getUser(token);
    
    if (!supabaseError && supabaseUser) {
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
        .eq('email', supabaseUser.email)
        .is('deleted_at', null)
        .single();

      if (error || !user) {
        return res.status(401).json({
          success: false,
          message: 'User tidak ditemukan'
        });
      }

      req.user = user;
      req.supabaseUser = supabaseUser;
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

    if (error || !user) {
      return res.status(401).json({
        success: false,
        message: 'User tidak ditemukan'
      });
    }

    req.user = user;
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
};const requireRole = (roleName) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication diperlukan'
      });
    }

    if (req.user.roles?.name !== roleName) {
      return res.status(403).json({
        success: false,
        message: 'Akses ditolak: Role tidak sesuai'
      });
    }

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
    next();

  } catch (error) {
    req.user = null;
    next();
  }
};

module.exports = {
  authenticateToken,
  requireRole,
  requireAdmin,
  optionalAuth
};
