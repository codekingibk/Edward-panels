const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

class JSONStorage {
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
      } catch {
        const defaultUsers = {
          "admin": {
            id: "admin",
            username: "Adegboyega",
            email: "admin@edwardpanels.com",
            password: this.hashPassword("Ibukun"),
            coinBalance: 999999,
            isAdmin: true,
            isBanned: false,
            isSuspended: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }
        };
        await fs.writeFile(this.usersFile, JSON.stringify(defaultUsers, null, 2));
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

  async initializeFile(filePath, defaultData) {
    try {
      await fs.access(filePath);
    } catch {
      await fs.writeFile(filePath, JSON.stringify(defaultData, null, 2));
    }
  }

  hashPassword(password) {
    return crypto.createHash('sha256').update(password + 'edward-panels-salt').digest('hex');
  }

  generateId() {
    return crypto.randomUUID();
  }

  async readFile(filePath) {
    try {
      const data = await fs.readFile(filePath, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      console.error(`Error reading ${filePath}:`, error);
      return {};
    }
  }

  async writeFile(filePath, data) {
    try {
      await fs.writeFile(filePath, JSON.stringify(data, null, 2));
    } catch (error) {
      console.error(`Error writing ${filePath}:`, error);
      throw error;
    }
  }

  // User operations
  async getUsers() {
    return await this.readFile(this.usersFile);
  }

  async getUser(id) {
    const users = await this.getUsers();
    return users[id];
  }

  async getUserByUsername(username) {
    const users = await this.getUsers();
    return Object.values(users).find(user => user.username === username);
  }

  async getUserByEmail(email) {
    const users = await this.getUsers();
    return Object.values(users).find(user => user.email === email);
  }

  async createUser(userData) {
    const users = await this.getUsers();
    const settings = await this.getSettings();
    
    const user = {
      id: this.generateId(),
      username: userData.username,
      email: userData.email,
      password: this.hashPassword(userData.password),
      coinBalance: settings.welcomeCoins || 1000,
      isAdmin: false,
      isBanned: false,
      isSuspended: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    users[user.id] = user;
    await this.writeFile(this.usersFile, users);
    
    // Remove password from returned user
    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  async updateUser(id, updates) {
    const users = await this.getUsers();
    if (!users[id]) return null;

    users[id] = {
      ...users[id],
      ...updates,
      updatedAt: new Date().toISOString()
    };

    await this.writeFile(this.usersFile, users);
    const { password, ...userWithoutPassword } = users[id];
    return userWithoutPassword;
  }

  async updateUserCoins(userId, amount) {
    const users = await this.getUsers();
    if (!users[userId]) return null;

    users[userId].coinBalance += amount;
    users[userId].updatedAt = new Date().toISOString();

    await this.writeFile(this.usersFile, users);
    const { password, ...userWithoutPassword } = users[userId];
    return userWithoutPassword;
  }

  // Project operations
  async getProjects() {
    return await this.readFile(this.projectsFile);
  }

  async getProject(id) {
    const projects = await this.getProjects();
    return projects[id];
  }

  async getProjects() {
    return await this.readFile(this.projectsFile);
  }

  async getProjectsByUser(userId) {
    const projects = await this.getProjects();
    return Object.values(projects).filter(p => p.userId === userId);
  }

  async createProject(projectData) {
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

  async updateProject(id, updates) {
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

  async deleteProject(id) {
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

  async createActivity(activityData) {
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

  async getActivitiesByUser(userId, limit = 10) {
    const activities = await this.getActivities();
    return Object.values(activities)
      .filter(a => a.userId === userId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, limit);
  }

  // Settings operations
  async getSettings() {
    return await this.readFile(this.settingsFile);
  }

  async updateSettings(updates) {
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
  async createProjectFolder(projectId, projectName) {
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

  async deleteProjectFolder(folderPath) {
    await fs.rm(folderPath, { recursive: true, force: true });
  }

  // Authentication helper
  async authenticateUser(username, password) {
    const user = await this.getUserByUsername(username);
    if (!user) return null;

    const hashedPassword = this.hashPassword(password);
    if (user.password !== hashedPassword) return null;

    // Return user without password
    const { password: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }
}

module.exports = new JSONStorage();