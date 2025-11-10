// Middleware to check if user is authenticated
const isAuthenticated = (req, res, next) => {
  console.log('🔐 Authentication check:');
  console.log('   URL:', req.url);
  console.log('   Method:', req.method);
  console.log('   Session ID:', req.sessionID);
  console.log('   User authenticated:', req.isAuthenticated());
  console.log('   User object:', req.user ? { id: req.user._id, email: req.user.email } : 'No user');
  console.log('   Cookies:', req.headers.cookie ? 'Present' : 'Missing');
  
  if (req.isAuthenticated()) {
    console.log('✅ Authentication successful');
    return next();
  }
  
  console.log('❌ Authentication failed - user not authenticated');
  res.status(401).json({
    success: false,
    message: 'Authentication required'
  });
};

module.exports = {
  isAuthenticated
};
