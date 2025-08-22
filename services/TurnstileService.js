class TurnstileService {
  constructor() {
    this.secretKey = process.env.TURNSTILE_SECRET_KEY;
    this.isEnabled = process.env.TURNSTILE_ENABLED === 'true';
  }

  async verifyToken(token, remoteip = null) {
    if (!this.isEnabled) {
      console.log('Turnstile verification skipped - development mode');
      return { success: true, message: 'Verification skipped in development mode' };
    }

    if (!token) {
      return { success: false, message: 'Turnstile token is required' };
    }

    if (!this.secretKey) {
      console.error('Turnstile secret key not configured');
      return { success: false, message: 'Turnstile not properly configured' };
    }

    try {
      const formData = new URLSearchParams();
      formData.append('secret', this.secretKey);
      formData.append('response', token);
      if (remoteip) {
        formData.append('remoteip', remoteip);
      }

      const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData.toString(),
      });

      const result = await response.json();

      if (result.success) {
        return { 
          success: true, 
          message: 'Verification successful',
          details: result 
        };
      } else {
        console.error('Turnstile verification failed:', result);
        return { 
          success: false, 
          message: 'Verification failed',
          details: result 
        };
      }
    } catch (error) {
      console.error('Turnstile verification error:', error);
      return { 
        success: false, 
        message: 'Verification service error',
        error: error.message 
      };
    }
  }

  isVerificationRequired() {
    return this.isEnabled;
  }
}

module.exports = new TurnstileService();
