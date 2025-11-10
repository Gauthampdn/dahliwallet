const config = require('../config/config');

const authController = {
  // Google OAuth callback handler
  googleAuthCallback: (req, res) => {
    try {
      // User is now authenticated and stored in session
      const user = req.user;
      console.log('🎉 Google OAuth callback successful');
      console.log('   User:', user.email);
      console.log('   Session ID:', req.sessionID);
      console.log('   Is authenticated:', req.isAuthenticated());
      
      // Regenerate session to prevent session fixation attacks
      req.session.regenerate((err) => {
        if (err) {
          console.error('❌ Session regeneration failed:', err);
          return res.redirect(`${config.FRONTEND_URL}/login?error=session_error`);
        }
        
        // Re-establish user in new session
        req.login(user, (loginErr) => {
          if (loginErr) {
            console.error('❌ Re-login after session regeneration failed:', loginErr);
            return res.redirect(`${config.FRONTEND_URL}/login?error=session_error`);
          }
          
          console.log('✅ Session regenerated successfully');
          console.log('   New Session ID:', req.sessionID);
          
          // Redirect to frontend with success
          res.redirect(`${config.FRONTEND_URL}/dashboard?auth=success`);
        });
      });
    } catch (error) {
      console.error('❌ Google auth callback error:', error);
      res.redirect(`${config.FRONTEND_URL}/login?error=auth_failed`);
    }
  },

  // Logout handler
  logout: (req, res) => {
    req.logout((err) => {
      if (err) {
        console.error('❌ Logout failed:', err);
        return res.status(500).json({
          success: false,
          message: 'Logout failed'
        });
      }
      
      req.session.destroy((err) => {
        if (err) {
          console.error('❌ Session cleanup failed:', err);
          return res.status(500).json({
            success: false,
            message: 'Session cleanup failed'
          });
        }
        
        res.clearCookie('connect.sid');
        res.json({
          success: true,
          message: 'Logged out successfully'
        });
      });
    });
  },

  // Check authentication status
  checkAuthStatus: (req, res) => {
    console.log('🔍 Checking auth status:', {
      sessionId: req.sessionID,
      isAuthenticated: req.isAuthenticated(),
      userId: req.user?.id
    });
    
    if (req.isAuthenticated()) {
      const user = req.user;
      console.log('✅ User authenticated:', { userId: user._id, email: user.email });
      res.json({
        success: true,
        data: {
          authenticated: true,
          user: {
            id: user._id.toString(),
            email: user.email,
            name: user.name,
            picture: user.picture,
            callsMade: user.callsMade,
            wallets: user.wallets,
            walletPassword: user.walletPassword
          }
        }
      });
    } else {
      console.log('❌ User not authenticated');
      res.json({
        success: true,
        data: {
          authenticated: false,
          user: null
        }
      });
    }
  }
};

module.exports = authController;
