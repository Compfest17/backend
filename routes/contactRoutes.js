const express = require('express');
const ContactController = require('../controllers/ContactController');
const { body, validationResult } = require('express-validator');

const router = express.Router();

const validateContactForm = [
  body('fullName')
    .trim()
    .notEmpty()
    .withMessage('Full name is required')
    .isLength({ min: 2, max: 100 })
    .withMessage('Full name must be between 2 and 100 characters'),
  
  body('email')
    .trim()
    .isEmail()
    .withMessage('Valid email is required')
    .normalizeEmail(),
  
  body('phone')
    .optional()
    .trim()
    .custom((value) => {
      if (!value) return true; 
      const phoneRegex = /^[\+]?[0-9\s\-\(\)]{8,20}$/;
      if (!phoneRegex.test(value)) {
        throw new Error('Phone number format is invalid');
      }
      return true;
    }),
  
  body('message')
    .trim()
    .notEmpty()
    .withMessage('Message is required')
    .isLength({ min: 5, max: 1000 })
    .withMessage('Message must be between 5 and 1000 characters')
];

const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors.array()
    });
  }
  next();
};

router.post('/contact', validateContactForm, handleValidationErrors, ContactController.submitContactMessage);
router.get('/contact', ContactController.getContactMessages);
router.put('/contact/:id/status', ContactController.updateContactMessageStatus);

module.exports = router;