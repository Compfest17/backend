const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Role = require('../models/Role');
const Level = require('../models/Level');
const ValidationUtils = require('../utils/ValidationUtils');

class AuthController {
  static createToken(user) {
    return jwt.sign(
      { 
        id: user.id, 
        email: user.email,
        role_id: user.role_id 
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );
  }

  static async register(req, res) {
    try {
      const sanitizedData = ValidationUtils.sanitizeInput(req.body);
      const { email, password, full_name } = sanitizedData;

      const validation = ValidationUtils.validateRegistrationData(sanitizedData);
      if (!validation.isValid) {
        return res.status(400).json({
          success: false,
          message: 'Data tidak valid',
          errors: validation.errors
        });
      }

      const existingUser = await User.findByEmail(email);
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'Email sudah terdaftar'
        });
      }

      await Role.ensureDefaultRoles();
      await Level.ensureDefaultLevels();

      const defaultRole = await Role.getDefault();
      const defaultLevel = await Level.getDefault();

      const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS) || 12;
      const hashedPassword = await bcrypt.hash(password, saltRounds);

      const userData = {
        email,
        password: hashedPassword,
        full_name,
        role_id: defaultRole.id,
        level_id: defaultLevel.id
      };

      const newUser = await User.create(userData);

      const token = AuthController.createToken(newUser);

      res.status(201).json({
        success: true,
        message: 'Akun berhasil dibuat',
        data: {
          user: {
            id: newUser.id,
            email: newUser.email,
            full_name: newUser.full_name,
            username: newUser.username,
            phone: newUser.phone,
            role: newUser.roles?.name,
            level: newUser.levels?.name
          },
          token
        }
      });

    } catch (error) {
      console.error('Register error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  static async login(req, res) {
    try {
      const { email, password } = req.body;

      const validationErrors = AuthController.validateLoginInput(req.body);
      if (validationErrors.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Validation error',
          errors: validationErrors
        });
      }

      const user = await User.findByEmail(email);
      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Email atau password salah'
        });
      }

      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        return res.status(401).json({
          success: false,
          message: 'Email atau password salah'
        });
      }

      const token = AuthController.createToken(user);

      res.json({
        success: true,
        message: 'Login berhasil',
        data: {
          user: {
            id: user.id,
            email: user.email,
            full_name: user.full_name,
            username: user.username,
            phone: user.phone,
            role: user.roles?.name,
            level: user.levels?.name,
            avatar_url: user.avatar_url
          },
          token
        }
      });

    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  static async getProfile(req, res) {
    try {
      const userId = req.user.id;

      const user = await User.findById(userId);

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User tidak ditemukan'
        });
      }

      res.json({
        success: true,
        data: {
          user: {
            id: user.id,
            email: user.email,
            full_name: user.full_name,
            username: user.username,
            phone: user.phone,
            avatar_url: user.avatar_url,
            created_at: user.created_at,
            role: user.roles?.name,
            level: user.levels
          }
        }
      });

    } catch (error) {
      console.error('Profile error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  static async updateProfile(req, res) {
    try {
      const userId = req.user.id;
      const { full_name, username, phone } = req.body;

      if (!full_name && !username && !phone) {
        return res.status(400).json({
          success: false,
          message: 'Minimal satu field harus diisi'
        });
      }

      const updateData = {};
      if (full_name) updateData.full_name = full_name;
      if (username) updateData.username = username;
      if (phone) updateData.phone = phone;

      const updatedUser = await User.update(userId, updateData);

      res.json({
        success: true,
        message: 'Profil berhasil diperbarui',
        data: {
          user: {
            id: updatedUser.id,
            email: updatedUser.email,
            full_name: updatedUser.full_name,
            username: updatedUser.username,
            phone: updatedUser.phone,
            avatar_url: updatedUser.avatar_url,
            role: updatedUser.roles?.name,
            level: updatedUser.levels?.name
          }
        }
      });

    } catch (error) {
      console.error('Update profile error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  static async changePassword(req, res) {
    try {
      const userId = req.user.id;
      const { currentPassword, newPassword } = req.body;

      if (!currentPassword || !newPassword) {
        return res.status(400).json({
          success: false,
          message: 'Password lama dan password baru wajib diisi'
        });
      }

      if (newPassword.length < 6) {
        return res.status(400).json({
          success: false,
          message: 'Password baru minimal 6 karakter'
        });
      }

      const user = await User.findByEmail(req.user.email);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User tidak ditemukan'
        });
      }

      const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
      if (!isCurrentPasswordValid) {
        return res.status(400).json({
          success: false,
          message: 'Password lama salah'
        });
      }

      const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS) || 12;
      const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds);

      await User.updatePassword(userId, hashedNewPassword);

      res.json({
        success: true,
        message: 'Password berhasil diubah'
      });

    } catch (error) {
      console.error('Change password error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }
}

module.exports = AuthController;
