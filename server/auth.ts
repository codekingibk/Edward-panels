import session from 'express-session';
import { Express, Request, Response, NextFunction } from 'express';
import MemoryStore from 'memorystore';
import storage from './jsonStorage.js';
import { generateFingerprint, getClientIP } from './fingerprint.js';

// Create memory store
const MemoryStoreClass = MemoryStore(session);

// Session configuration
export function setupSessions(app: Express) {
  const sessionStore = new MemoryStoreClass({
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
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.session || !(req.session as any).userId) {
    return res.status(401).json({ message: 'Authentication required' });
  }
  next();
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.session || !(req.session as any).userId || !(req.session as any).isAdmin) {
    return res.status(403).json({ message: 'Admin access required' });
  }
  next();
}

// Auth routes
export function setupAuthRoutes(app: Express) {
  // Register
  app.post('/api/register', async (req: Request, res: Response) => {
    try {
      const { username, email, password, clientFingerprint } = req.body;

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

      // Generate device fingerprint
      const deviceFingerprint = generateFingerprint(req, clientFingerprint);
      const ipAddress = getClientIP(req);

      // Check for duplicate accounts
      const duplicateAccounts = await storage.checkForDuplicateAccounts(deviceFingerprint, ipAddress);
      if (duplicateAccounts.length > 0) {
        // Log suspicious activity
        console.warn(`Potential duplicate account creation attempt: ${username} (${email}) - IP: ${ipAddress}, Fingerprint: ${deviceFingerprint}`);
        
        // Check if any duplicate account was created recently (within 24 hours)
        const recentDuplicates = duplicateAccounts.filter(user => {
          const timeDiff = Date.now() - new Date(user.createdAt).getTime();
          return timeDiff < 24 * 60 * 60 * 1000; // 24 hours
        });

        if (recentDuplicates.length > 0) {
          return res.status(429).json({ 
            message: 'Account creation temporarily restricted. Please contact support if you believe this is an error.' 
          });
        }
      }

      // Create user
      const user = await storage.createUser({ username, email, password });

      // Store device fingerprint
      await storage.addDeviceFingerprint(user.id, deviceFingerprint, ipAddress);

      // Create session
      (req.session as any).userId = user.id;
      (req.session as any).username = user.username;
      (req.session as any).isAdmin = user.isAdmin;

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
  app.post('/api/login', async (req: Request, res: Response) => {
    try {
      const { username, password, clientFingerprint } = req.body;

      if (!username || !password) {
        return res.status(400).json({ message: 'Username and password are required' });
      }

      // Authenticate user
      const user = await storage.authenticateUser(username, password);
      if (!user) {
        return res.status(401).json({ message: 'Invalid username or password' });
      }

      // Update device fingerprint
      const deviceFingerprint = generateFingerprint(req, clientFingerprint);
      const ipAddress = getClientIP(req);
      await storage.addDeviceFingerprint(user.id, deviceFingerprint, ipAddress);

      // Create session
      (req.session as any).userId = user.id;
      (req.session as any).username = user.username;
      (req.session as any).isAdmin = user.isAdmin;

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
  app.post('/api/logout', (req: Request, res: Response) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ message: 'Logout failed' });
      }
      res.clearCookie('connect.sid');
      res.json({ message: 'Logout successful' });
    });
  });

  // Get current user
  app.get('/api/user', requireAuth, async (req: Request, res: Response) => {
    try {
      const user = await storage.getUser((req.session as any).userId);
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