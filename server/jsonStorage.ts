import { promises as fs } from 'fs';
import path from 'path';
import crypto from 'crypto';

// Define the User interface with added fields for fingerprint tracking
export interface User {
  id: string;
  username?: string;
  email?: string;
  password?: string;
  firstName?: string;
  lastName?: string;
  profileImageUrl?: string;
  coinBalance: number;
  isAdmin: boolean;
  isBanned?: boolean;
  isSuspended?: boolean;
  deviceFingerprints?: string[]; // Stores multiple device fingerprints
  ipAddresses?: string[]; // Stores unique IP addresses
  createdAt: Date;
  updatedAt: Date;
}

class JSONStorage {
  private dataDir: string;
  private usersFile: string;
  private projectsFile: string;
  private activitiesFile: string;
  private settingsFile: string;
  private projectsDir: string;
  // In-memory store for users, will be loaded from/saved to file
  private users: { [key: string]: User } = {};


  constructor() {
    this.dataDir = path.join(process.cwd(), 'data');
    this.usersFile = path.join(this.dataDir, 'users.json');
    this.projectsFile = path.join(this.dataDir, 'projects.json');
    this.activitiesFile = path.join(this.dataDir, 'activities.json');
    this.settingsFile = path.join(this.dataDir, 'settings.json');
    this.projectsDir = path.join(process.cwd(), 'user_projects');

    this.initializeStorage();
  }

  async initializeStorage() {
    try {
      // Create data directory if it doesn't exist
      await fs.mkdir(this.dataDir, { recursive: true });
      await fs.mkdir(this.projectsDir, { recursive: true });

      // Initialize users file with admin account
      try {
        await fs.access(this.usersFile);
        const fileContent = await fs.readFile(this.usersFile, 'utf8');
        this.users = JSON.parse(fileContent);
      } catch {
        const defaultUsers: { [key: string]: User } = {
          "admin": {
            id: "admin",
            username: "Adegboyega",
            email: "admin@edwardpanels.com",
            password: this.hashPassword("Ibukun"),
            coinBalance: 999999,
            isAdmin: true,
            // Initialize other fields to satisfy the User interface
            deviceFingerprints: [],
            ipAddresses: [],
            createdAt: new Date(),
            updatedAt: new Date()
          }
        };
        await fs.writeFile(this.usersFile, JSON.stringify(defaultUsers, null, 2));
        this.users = defaultUsers;
      }

      // Initialize other files
      await this.initializeFile(this.projectsFile, {});
      await this.initializeFile(this.activitiesFile, {});
      await this.initializeFile(this.settingsFile, {
        siteName: "Edward Panels",
        siteDescription: "Node.js Hosting Management Panel",
        welcomeCoins: 1000,
        projectCost: 100,
        updatedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error('Failed to initialize storage:', error);
    }
  }

  async initializeFile(filePath: string, defaultData: any) {
    try {
      await fs.access(filePath);
    } catch {
      await fs.writeFile(filePath, JSON.stringify(defaultData, null, 2));
    }
  }

  hashPassword(password: string): string {
    return crypto.createHash('sha256').update(password + 'edward-panels-salt').digest('hex');
  }

  generateId(): string {
    return crypto.randomUUID();
  }

  async readFile(filePath: string) {
    try {
      const data = await fs.readFile(filePath, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      console.error(`Error reading ${filePath}:`, error);
      return {};
    }
  }

  async writeFile(filePath: string, data: any) {
    try {
      await fs.writeFile(filePath, JSON.stringify(data, null, 2));
    } catch (error) {
      console.error(`Error writing ${filePath}:`, error);
      throw error;
    }
  }

  // User operations
  async getUsers() {
    // Return the in-memory users
    return this.users;
  }

  async getUser(id: string) {
    // Return user from in-memory store
    return this.users[id];
  }

  async getUserByUsername(username: string) {
    return Object.values(this.users).find((user: any) => user.username === username);
  }

  async getUserByEmail(email: string) {
    return Object.values(this.users).find((user: any) => user.email === email);
  }

  async createUser(userData: any) {
    const settings = await this.getSettings();

    // Check for duplicate accounts before creating a new user
    const existingUsersByFingerprint = await this.findUsersByFingerprint(userData.fingerprint);
    const existingUsersByIp = await this.findUsersByIPAddress(userData.ipAddress);
    const potentialDuplicates = [...existingUsersByFingerprint, ...existingUsersByIp];
    const uniquePotentialDuplicates = Array.from(new Map(potentialDuplicates.map(u => [u.id, u])).values());

    if (uniquePotentialDuplicates.length > 0) {
      // Optionally, you could throw an error or return a specific message
      console.warn(`Potential duplicate account creation detected for fingerprint: ${userData.fingerprint}, IP: ${userData.ipAddress}`);
      // For now, we'll still create the account but log a warning.
      // Depending on requirements, you might want to prevent creation here.
    }

    const user = {
      id: this.generateId(),
      username: userData.username,
      email: userData.email,
      password: this.hashPassword(userData.password),
      coinBalance: settings.welcomeCoins || 1000,
      isAdmin: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      // Initialize fingerprint and IP tracking fields
      deviceFingerprints: userData.fingerprint ? [userData.fingerprint] : [],
      ipAddresses: userData.ipAddress ? [userData.ipAddress] : [],
    };

    this.users[user.id] = user; // Add to in-memory store
    await this.writeFile(this.usersFile, this.users); // Save to file

    // Remove password from returned user
    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  async updateUser(id: string, updates: any) {
    if (!this.users[id]) return null;

    this.users[id] = {
      ...this.users[id],
      ...updates,
      updatedAt: new Date().toISOString()
    };

    await this.writeFile(this.usersFile, this.users);
    const { password, ...userWithoutPassword } = this.users[id];
    return userWithoutPassword;
  }

  async updateUserCoins(id: string, amount: number) {
    if (!this.users[id]) return null;

    this.users[id].coinBalance += amount;
    this.users[id].updatedAt = new Date().toISOString();

    await this.writeFile(this.usersFile, this.users);
    const { password, ...userWithoutPassword } = this.users[id];
    return userWithoutPassword;
  }

  // Add methods to track device fingerprints and IP addresses
  async addDeviceFingerprint(userId: string, fingerprint: string, ipAddress: string): Promise<void> {
    if (!this.users[userId]) return;

    // Ensure deviceFingerprints and ipAddresses arrays exist
    if (!this.users[userId].deviceFingerprints) {
      this.users[userId].deviceFingerprints = [];
    }
    if (!this.users[userId].ipAddresses) {
      this.users[userId].ipAddresses = [];
    }

    // Add fingerprint if not already present
    if (!this.users[userId].deviceFingerprints?.includes(fingerprint)) {
      this.users[userId].deviceFingerprints?.push(fingerprint);
    }

    // Add IP address if not already present
    if (!this.users[userId].ipAddresses?.includes(ipAddress)) {
      this.users[userId].ipAddresses?.push(ipAddress);
    }

    this.users[userId].updatedAt = new Date().toISOString();
    await this.writeFile(this.usersFile, this.users);
  }

  async findUsersByFingerprint(fingerprint: string): Promise<User[]> {
    return Object.values(this.users).filter(user =>
      user.deviceFingerprints?.includes(fingerprint)
    );
  }

  async findUsersByIPAddress(ipAddress: string): Promise<User[]> {
    return Object.values(this.users).filter(user =>
      user.ipAddresses?.includes(ipAddress)
    );
  }

  async checkForDuplicateAccounts(fingerprint: string, ipAddress: string, excludeUserId?: string): Promise<User[]> {
    const fingerprintMatches = await this.findUsersByFingerprint(fingerprint);
    const ipMatches = await this.findUsersByIPAddress(ipAddress);

    const allMatches = [...fingerprintMatches, ...ipMatches];
    // Use a Map to get unique users based on their IDs
    const uniqueMatches = Array.from(new Map(allMatches.map(u => [u.id, u])).values());

    // Exclude the current user if an excludeUserId is provided
    return uniqueMatches.filter(user => user.id !== excludeUserId);
  }


  // Project operations
  async getProjects() {
    return await this.readFile(this.projectsFile);
  }

  async getProject(id: string) {
    const projects = await this.getProjects();
    return projects[id];
  }

  async getProjectsByUser(userId: string) {
    const projects = await this.getProjects();
    return Object.values(projects).filter((p: any) => p.userId === userId);
  }

  async createProject(projectData: any) {
    const projects = await this.getProjects();
    const projectId = this.generateId();

    // Create project folder
    const folderPath = await this.createProjectFolder(projectId, projectData.name);

    const project = {
      id: projectId,
      name: projectData.name,
      description: projectData.description || '',
      userId: projectData.userId,
      folderPath,
      status: 'stopped',
      template: projectData.template || 'blank',
      nodeVersion: '18.17.0',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    projects[projectId] = project;
    await this.writeFile(this.projectsFile, projects);
    return project;
  }

  async updateProject(id: string, updates: any) {
    const projects = await this.getProjects();
    if (!projects[id]) return null;

    projects[id] = {
      ...projects[id],
      ...updates,
      updatedAt: new Date().toISOString()
    };

    await this.writeFile(this.projectsFile, projects);
    return projects[id];
  }

  async deleteProject(id: string) {
    const projects = await this.getProjects();
    const project = projects[id];
    if (!project) return false;

    try {
      // Delete project folder
      await this.deleteProjectFolder(project.folderPath);
      delete projects[id];
      await this.writeFile(this.projectsFile, projects);
      return true;
    } catch (error) {
      console.error('Failed to delete project:', error);
      return false;
    }
  }

  // Activity operations
  async getActivities() {
    return await this.readFile(this.activitiesFile);
  }

  async createActivity(activityData: any) {
    const activities = await this.getActivities();
    const activity = {
      id: this.generateId(),
      userId: activityData.userId,
      projectId: activityData.projectId || null,
      action: activityData.action,
      description: activityData.description,
      metadata: activityData.metadata || null,
      createdAt: new Date().toISOString()
    };

    activities[activity.id] = activity;
    await this.writeFile(this.activitiesFile, activities);
    return activity;
  }

  async getActivitiesByUser(userId: string, limit = 10) {
    const activities = await this.getActivities();
    return Object.values(activities)
      .filter((a: any) => a.userId === userId)
      .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, limit);
  }

  // Settings operations
  async getSettings() {
    return await this.readFile(this.settingsFile);
  }

  async updateSettings(updates: any) {
    const settings = await this.getSettings();
    const newSettings = {
      ...settings,
      ...updates,
      updatedAt: new Date().toISOString()
    };

    await this.writeFile(this.settingsFile, newSettings);
    return newSettings;
  }

  // File operations
  async createProjectFolder(projectId: string, projectName: string) {
    const folderPath = path.join(this.projectsDir, `${projectName}_${projectId}`);
    await fs.mkdir(folderPath, { recursive: true });

    // Create basic package.json for the project
    const packageJson = {
      name: projectName.toLowerCase().replace(/[^a-z0-9-]/g, '-'),
      version: "1.0.0",
      description: "",
      main: "index.js",
      scripts: {
        start: "node index.js",
        dev: "node index.js"
      },
      dependencies: {}
    };

    await fs.writeFile(
      path.join(folderPath, "package.json"),
      JSON.stringify(packageJson, null, 2)
    );

    // Create basic index.js file
    const indexJs = `// Welcome to your new Node.js project!
console.log("Hello from ${projectName}!");

// Your code goes here...
`;
    await fs.writeFile(path.join(folderPath, "index.js"), indexJs);

    return folderPath;
  }

  async deleteProjectFolder(folderPath: string) {
    await fs.rm(folderPath, { recursive: true, force: true });
  }

  // Authentication helper
  async authenticateUser(username: string, password: string, fingerprint?: string, ipAddress?: string) {
    const user = await this.getUserByUsername(username);
    if (!user) return null;

    const hashedPassword = this.hashPassword(password);
    if (user.password !== hashedPassword) return null;

    // If fingerprint and/or IP address are provided, update the user's records
    if (fingerprint || ipAddress) {
      await this.addDeviceFingerprint(user.id, fingerprint, ipAddress);
    }

    // Return user without password
    const { password: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }
}

export default new JSONStorage();