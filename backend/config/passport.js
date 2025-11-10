const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const config = require('./config');
const User = require('../models/User');

// Serialize user into the session
passport.serializeUser((user, done) => {
  done(null, user._id);
});

// Deserialize user from the session
passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id).populate('wallets');
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

// Google OAuth Strategy
passport.use(new GoogleStrategy({
    clientID: config.GOOGLE_CLIENT_ID,
    clientSecret: config.GOOGLE_CLIENT_SECRET,
    callbackURL: config.GOOGLE_CALLBACK_URL
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      const email = profile.emails[0]?.value;
      const name = profile.displayName;
      const picture = profile.photos[0]?.value;

      if (!email || !name || !picture) {
        return done(new Error('Missing required user information'), null);
      }

      // Check if user already exists
      let user = await User.findOne({ email }).populate('wallets');

      if (user) {
        // Update existing user's information
        user.name = name;
        user.picture = picture;
        await user.save();
        console.log(`✅ User logged in: ${email}`);
      } else {
        // Create new user
        user = new User({
          email,
          name,
          picture
        });
        await user.save();
        console.log(`✅ New user created: ${email}`);
      }

      return done(null, user);
    } catch (error) {
      console.error('❌ Error in Google OAuth strategy:', error);
      return done(error, null);
    }
  }
));

module.exports = passport;
