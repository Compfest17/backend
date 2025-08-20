class ValidationUtils {
  static validateEmail(email) {
    const errors = [];
    
    if (!email) {
      errors.push('Email wajib diisi');
      return errors;
    }
    
    if (typeof email !== 'string') {
      errors.push('Email harus berupa string');
      return errors;
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      errors.push('Format email tidak valid');
    }
    
    if (email.length > 254) {
      errors.push('Email terlalu panjang (maksimal 254 karakter)');
    }
    
    return errors;
  }

  static validatePassword(password) {
    const errors = [];
    
    if (!password) {
      errors.push('Password wajib diisi');
      return errors;
    }
    
    if (typeof password !== 'string') {
      errors.push('Password harus berupa string');
      return errors;
    }
    
    if (password.length < 8) {
      errors.push('Password minimal 8 karakter');
    }
    
    if (!/[A-Z]/.test(password)) {
      errors.push('Password perlu huruf besar');
    }
    
    if (!/[a-z]/.test(password)) {
      errors.push('Password perlu huruf kecil');
    }
    
    if (!/[0-9]/.test(password)) {
      errors.push('Password perlu angka');
    }
    
    if (password.length > 128) {
      errors.push('Password terlalu panjang (maksimal 128 karakter)');
    }
    
    const weakPasswords = ['password', '12345678', 'qwerty123', 'admin123'];
    if (weakPasswords.includes(password.toLowerCase())) {
      errors.push('Password terlalu lemah, gunakan kombinasi yang lebih kuat');
    }
    
    return errors;
  }

  static validateFullName(fullName) {
    const errors = [];
    
    if (!fullName) {
      errors.push('Nama lengkap wajib diisi');
      return errors;
    }
    
    if (typeof fullName !== 'string') {
      errors.push('Nama lengkap harus berupa string');
      return errors;
    }
    
    const trimmedName = fullName.trim();
    
    if (trimmedName.length < 2) {
      errors.push('Nama lengkap minimal 2 karakter');
    }
    
    if (trimmedName.length > 100) {
      errors.push('Nama lengkap maksimal 100 karakter');
    }
    
    const nameRegex = /^[a-zA-Z\s\-'\.]+$/;
    if (!nameRegex.test(trimmedName)) {
      errors.push('Nama lengkap hanya boleh mengandung huruf, spasi, tanda hubung, dan apostrof');
    }
    
    return errors;
  }

  static validateUsername(username) {
    const errors = [];
    
    if (!username) {
      return errors; 
    }
    
    if (typeof username !== 'string') {
      errors.push('Username harus berupa string');
      return errors;
    }
    
    const trimmedUsername = username.trim();
    
    if (trimmedUsername.length < 3) {
      errors.push('Username minimal 3 karakter');
    }
    
    if (trimmedUsername.length > 30) {
      errors.push('Username maksimal 30 karakter');
    }
    
    if (trimmedUsername !== trimmedUsername.toLowerCase()) {
      errors.push('Username harus menggunakan huruf kecil semua');
    }
    
    if (trimmedUsername.includes(' ')) {
      errors.push('Username tidak boleh mengandung spasi');
    }
    
    const usernameRegex = /^[a-z0-9_-]+$/;
    if (!usernameRegex.test(trimmedUsername)) {
      errors.push('Username hanya boleh mengandung huruf kecil, angka, underscore, dan tanda hubung');
    }
    
    if (/^[0-9]/.test(trimmedUsername)) {
      errors.push('Username tidak boleh dimulai dengan angka');
    }
    
    return errors;
  }

  static validatePhone(phone) {
    const errors = [];
    
    if (!phone) {
      return errors;
    }
    
    if (typeof phone !== 'string') {
      errors.push('Nomor telepon harus berupa string');
      return errors;
    }
    
    const cleanPhone = phone.replace(/\D/g, '');
    
    if (cleanPhone.length < 10 || cleanPhone.length > 15) {
      errors.push('Nomor telepon harus 10-15 digit');
    }
    
    const indonesianPhoneRegex = /^(\+62|62|0)8[1-9][0-9]{6,10}$/;
    if (!indonesianPhoneRegex.test(phone.replace(/\s/g, ''))) {
      errors.push('Format nomor telepon Indonesia tidak valid');
    }
    
    return errors;
  }

  static validateRegistrationData(data) {
    const { email, password, full_name, username, phone } = data;
    const allErrors = {};
    
    const emailErrors = this.validateEmail(email);
    const passwordErrors = this.validatePassword(password);
    const fullNameErrors = this.validateFullName(full_name);
    const usernameErrors = this.validateUsername(username);
    const phoneErrors = this.validatePhone(phone);
    
    if (emailErrors.length > 0) allErrors.email = emailErrors;
    if (passwordErrors.length > 0) allErrors.password = passwordErrors;
    if (fullNameErrors.length > 0) allErrors.full_name = fullNameErrors;
    if (usernameErrors.length > 0) allErrors.username = usernameErrors;
    if (phoneErrors.length > 0) allErrors.phone = phoneErrors;
    
    return {
      isValid: Object.keys(allErrors).length === 0,
      errors: allErrors
    };
  }

  static validateLoginData(data) {
    const { email, password } = data;
    const allErrors = {};
    
    if (!email) {
      allErrors.email = ['Email wajib diisi'];
    } else {
      const emailErrors = this.validateEmail(email);
      if (emailErrors.length > 0) allErrors.email = emailErrors;
    }
    
    if (!password) {
      allErrors.password = ['Password wajib diisi'];
    }
    
    return {
      isValid: Object.keys(allErrors).length === 0,
      errors: allErrors
    };
  }

  static sanitizeInput(data) {
    const sanitized = {};
    
    Object.keys(data).forEach(key => {
      if (typeof data[key] === 'string') {
        sanitized[key] = data[key].trim();
      } else {
        sanitized[key] = data[key];
      }
    });
    
    return sanitized;
  }
}

module.exports = ValidationUtils;
