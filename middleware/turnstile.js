const TurnstileService = require('../services/TurnstileService');

const verifyTurnstile = async (req, res, next) => {
  const turnstileToken = req.body.turnstileToken || req.headers['x-turnstile-token'];
  
  if (!TurnstileService.isVerificationRequired()) {
    return next();
  }

  if (!turnstileToken) {
    return res.status(400).json({
      success: false,
      message: 'Turnstile verification required'
    });
  }

  try {
    const clientIP = req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for'];
    const verification = await TurnstileService.verifyToken(turnstileToken, clientIP);
    
    if (!verification.success) {
      return res.status(400).json({
        success: false,
        message: verification.message
      });
    }
    
    next();
  } catch (error) {
    console.error('Turnstile middleware error:', error);
    return res.status(500).json({
      success: false,
      message: 'Verification service error'
    });
  }
};

module.exports = verifyTurnstile;
