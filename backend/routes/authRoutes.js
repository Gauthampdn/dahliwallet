const express = require('express');
const passport = require('passport');
const authController = require('../controllers/authController');
const { isAuthenticated } = require('../middleware/auth');

const router = express.Router();

// Google OAuth routes
router.get('/google', passport.authenticate('google', {
  scope: ['profile', 'email']
}));

router.get('/google/callback', 
  passport.authenticate('google', { 
    failureRedirect: '/login',
    failureMessage: true
  }),
  authController.googleAuthCallback
);

// Logout route
router.get('/logout', isAuthenticated, authController.logout);

// Check authentication status
router.get('/status', authController.checkAuthStatus);

module.exports = router;
