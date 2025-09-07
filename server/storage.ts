import {
  users,
  projects,
  activities,
  systemSettings,
  type User,
  type UpsertUser,
  type Project,
  type InsertProject,
  type Activity,
  type InsertActivity,
  type SystemSettings,
  type InsertSystemSettings,
} from "@shared/schema";
import { randomUUID } from "crypto";
import * as fs from "fs/promises";
import * as path from "path";

// Interface for storage operations
export interface IStorage {
  // User operations - mandatory for Replit Auth
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  updateUserCoins(userId: string, amount: number): Promise<User | undefined>;
  
  // Project operations
  getProject(id: string): Promise<Project | undefined>;
  getProjectsByUser(userId: string): Promise<Project[]>;
  createProject(project: InsertProject): Promise<Project>;
  updateProject(id: string, updates: Partial<Project>): Promise<Project | undefined>;
  deleteProject(id: string): Promise<boolean>;
  
  // Activity operations
  createActivity(activity: InsertActivity): Promise<Activity>;
  getActivitiesByUser(userId: string, limit?: number): Promise<Activity[]>;
  
  // System settings
  getSystemSettings(): Promise<SystemSettings>;
  updateSystemSettings(settings: Partial<InsertSystemSettings>): Promise<SystemSettings>;
  
  // File operations
  createProjectFolder(projectId: string, projectName: string): Promise<string>;
  deleteProjectFolder(folderPath: string): Promise<void>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User> = new Map();
  private projects: Map<string, Project> = new Map();
  private activities: Map<string, Activity> = new Map();
  private settings: SystemSettings;
  private readonly baseProjectPath = path.join(process.cwd(), "user_projects");

  constructor() {
    this.settings = {
      id: "default",
      siteName: "Edward Panels",
      siteDescription: "Node.js Hosting Management Panel",
      welcomeCoins: 1000,
      projectCost: 100,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    // Create admin user
    const adminUser: User = {
      id: "admin",
      email: "admin@edward-panels.com",
      firstName: "Admin",
      lastName: "User",
      profileImageUrl: null,
      coinBalance: 999999,
      isAdmin: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.users.set("admin", adminUser);
    
    // Ensure base project directory exists
    this.ensureBaseDirectory();
  }

  private async ensureBaseDirectory() {
    try {
      await fs.mkdir(this.baseProjectPath, { recursive: true });
    } catch (error) {
      console.error("Failed to create base project directory:", error);
    }
  }

  // User operations
  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const existingUser = this.users.get(userData.id!);
    if (existingUser) {
      const updatedUser = {
        ...existingUser,
        ...userData,
        updatedAt: new Date(),
      };
      this.users.set(userData.id!, updatedUser);
      return updatedUser;
    } else {
      const newUser: User = {
        id: userData.id || randomUUID(),
        email: userData.email || null,
        firstName: userData.firstName || null,
        lastName: userData.lastName || null,
        profileImageUrl: userData.profileImageUrl || null,
        coinBalance: userData.coinBalance || this.settings.welcomeCoins,
        isAdmin: userData.isAdmin || false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      this.users.set(newUser.id, newUser);
      return newUser;
    }
  }

  async updateUserCoins(userId: string, amount: number): Promise<User | undefined> {
    const user = this.users.get(userId);
    if (!user) return undefined;
    
    const updatedUser = {
      ...user,
      coinBalance: user.coinBalance + amount,
      updatedAt: new Date(),
    };
    this.users.set(userId, updatedUser);
    return updatedUser;
  }

  // Project operations
  async getProject(id: string): Promise<Project | undefined> {
    return this.projects.get(id);
  }

  async getProjectsByUser(userId: string): Promise<Project[]> {
    return Array.from(this.projects.values()).filter(p => p.userId === userId);
  }

  async createProject(projectData: InsertProject): Promise<Project> {
    const id = randomUUID();
    const folderPath = await this.createProjectFolder(id, projectData.name);
    
    const project: Project = {
      id,
      name: projectData.name,
      description: projectData.description || null,
      userId: projectData.userId,
      folderPath,
      status: projectData.status || "stopped",
      template: projectData.template || "blank",
      nodeVersion: projectData.nodeVersion || "18.17.0",
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    this.projects.set(id, project);
    return project;
  }

  async updateProject(id: string, updates: Partial<Project>): Promise<Project | undefined> {
    const project = this.projects.get(id);
    if (!project) return undefined;
    
    const updatedProject = {
      ...project,
      ...updates,
      updatedAt: new Date(),
    };
    this.projects.set(id, updatedProject);
    return updatedProject;
  }

  async deleteProject(id: string): Promise<boolean> {
    const project = this.projects.get(id);
    if (!project) return false;
    
    try {
      await this.deleteProjectFolder(project.folderPath);
      this.projects.delete(id);
      return true;
    } catch (error) {
      console.error("Failed to delete project folder:", error);
      return false;
    }
  }

  // Activity operations
  async createActivity(activityData: InsertActivity): Promise<Activity> {
    const activity: Activity = {
      id: randomUUID(),
      userId: activityData.userId,
      projectId: activityData.projectId || null,
      action: activityData.action,
      description: activityData.description,
      metadata: activityData.metadata || null,
      createdAt: new Date(),
    };
    
    this.activities.set(activity.id, activity);
    return activity;
  }

  async getActivitiesByUser(userId: string, limit = 10): Promise<Activity[]> {
    return Array.from(this.activities.values())
      .filter(a => a.userId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit);
  }

  // System settings
  async getSystemSettings(): Promise<SystemSettings> {
    return this.settings;
  }

  async updateSystemSettings(updates: Partial<InsertSystemSettings>): Promise<SystemSettings> {
    this.settings = {
      ...this.settings,
      ...updates,
      updatedAt: new Date(),
    };
    return this.settings;
  }

  // File operations
  async createProjectFolder(projectId: string, projectName: string): Promise<string> {
    const folderPath = path.join(this.baseProjectPath, `${projectName}_${projectId}`);
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

  async deleteProjectFolder(folderPath: string): Promise<void> {
    await fs.rm(folderPath, { recursive: true, force: true });
  }
}

export const storage = new MemStorage();
