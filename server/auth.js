const session = require('express-session');
const storage = require('./jsonStorage');
const MemoryStore = require('memorystore')(session);

// Session configuration
function setupSessions(app) {
  const sessionStore = new MemoryStore({
    checkPeriod: 86400000, // prune expired entries every 24h
  });

  app.use(session({
    secret: 'edward-panels-secret-key',
    resave: false,
    saveUninitialized: false,
    store: sessionStore,
    cookie: {
      secure: false, // Set to true in production with HTTPS
      httpOnly: true,
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    }
  }));
}

// Authentication middleware
function requireAuth(req, res, next) {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ message: 'Authentication required' });
  }
  next();
}

function requireAdmin(req, res, next) {
  if (!req.session || !req.session.userId || !req.session.isAdmin) {
    return res.status(403).json({ message: 'Admin access required' });
  }
  next();
}

// Auth routes
function setupAuthRoutes(app) {
  // Register
  app.post('/api/register', async (req, res) => {
    try {
      const { username, email, password } = req.body;

      // Validation
      if (!username || !email || !password) {
        return res.status(400).json({ message: 'Username, email, and password are required' });
      }

      if (username.length < 3) {
        return res.status(400).json({ message: 'Username must be at least 3 characters long' });
      }

      if (password.length < 6) {
        return res.status(400).json({ message: 'Password must be at least 6 characters long' });
      }

      // Check if user already exists
      const existingUser = await storage.getUserByUsername(username);
      if (existingUser) {
        return res.status(400).json({ message: 'Username already exists' });
      }

      const existingEmail = await storage.getUserByEmail(email);
      if (existingEmail) {
        return res.status(400).json({ message: 'Email already exists' });
      }

      // Create user
      const user = await storage.createUser({ username, email, password });

      // Create session
      req.session.userId = user.id;
      req.session.username = user.username;
      req.session.isAdmin = user.isAdmin;

      // Log activity
      await storage.createActivity({
        userId: user.id,
        action: 'user_registered',
        description: `User ${username} registered`
      });

      res.status(201).json({ 
        message: 'Registration successful',
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          coinBalance: user.coinBalance,
          isAdmin: user.isAdmin
        }
      });
    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({ message: 'Registration failed' });
    }
  });

  // Login
  app.post('/api/login', async (req, res) => {
    try {
      const { username, password } = req.body;

      if (!username || !password) {
        return res.status(400).json({ message: 'Username and password are required' });
      }

      // Authenticate user
      const user = await storage.authenticateUser(username, password);
      if (!user) {
        return res.status(401).json({ message: 'Invalid username or password' });
      }

      // Create session
      req.session.userId = user.id;
      req.session.username = user.username;
      req.session.isAdmin = user.isAdmin;

      // Log activity
      await storage.createActivity({
        userId: user.id,
        action: 'user_login',
        description: `User ${username} logged in`
      });

      res.json({ 
        message: 'Login successful',
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          coinBalance: user.coinBalance,
          isAdmin: user.isAdmin
        }
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ message: 'Login failed' });
    }
  });

  // Logout
  app.post('/api/logout', (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ message: 'Logout failed' });
      }
      res.clearCookie('connect.sid');
      res.json({ message: 'Logout successful' });
    });
  });

  // Get current user
  app.get('/api/user', requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      res.json({
        id: user.id,
        username: user.username,
        email: user.email,
        coinBalance: user.coinBalance,
        isAdmin: user.isAdmin
      });
    } catch (error) {
      console.error('Get user error:', error);
      res.status(500).json({ message: 'Failed to get user' });
    }
  });
}

module.exports = {
  setupSessions,
  setupAuthRoutes,
  requireAuth,
  requireAdmin
};