import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { spawn } from "child_process";
import * as fs from "fs/promises";
import * as path from "path";
import multer from 'multer';
import { createReadStream, createWriteStream } from 'fs';
import { pipeline } from 'stream';
import { promisify } from 'util';
import { randomUUID } from 'crypto';

// Import the new JSON storage and auth system
import storage from './jsonStorage.js';
import { setupSessions, setupAuthRoutes, requireAuth, requireAdmin } from './auth.js';

const pipelineAsync = promisify(pipeline);

interface AuthenticatedRequest extends Request {
  session?: {
    userId: string;
    username: string;
    isAdmin: boolean;
  };
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup sessions and auth
  setupSessions(app);
  setupAuthRoutes(app);

  // Auth routes
  app.get('/api/user', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.session?.userId;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const user = await storage.getUser(userId);
      res.json({
        id: user.id,
        username: user.username,
        email: user.email,
        coinBalance: user.coinBalance,
        isAdmin: user.isAdmin
      });
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Dashboard stats
  app.get('/api/dashboard/stats', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.session?.userId;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const projects = await storage.getProjectsByUser(userId);
      const user = await storage.getUser(userId);
      const activities = await storage.getActivitiesByUser(userId, 1);

      const stats = {
        activeProjects: projects.filter((p: any) => p.status === 'running').length,
        totalProjects: projects.length,
        coinBalance: user?.coinBalance || 0,
        commandsToday: activities.length,
        storageUsed: "2.4 GB",
        storageLimit: "4 GB"
      };

      res.json(stats);
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
      res.status(500).json({ message: "Failed to fetch dashboard stats" });
    }
  });

  // Projects CRUD
  app.get('/api/projects', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.session?.userId;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const projects = await storage.getProjectsByUser(userId);
      res.json(projects);
    } catch (error) {
      console.error("Error fetching projects:", error);
      res.status(500).json({ message: "Failed to fetch projects" });
    }
  });

  app.get('/api/projects/:id', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.session?.userId;
      const projectId = req.params.id;

      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const project = await storage.getProject(projectId);
      if (!project || project.userId !== userId) {
        return res.status(404).json({ message: "Project not found" });
      }

      res.json(project);
    } catch (error) {
      console.error("Error fetching project:", error);
      res.status(500).json({ message: "Failed to fetch project" });
    }
  });

  app.post('/api/projects', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.session?.userId;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const { name, description, template } = req.body;

      // Validation
      if (!name || !name.trim()) {
        return res.status(400).json({ message: 'Project name is required' });
      }

      if (!/^[a-zA-Z0-9-_]+$/.test(name)) {
        return res.status(400).json({ message: 'Project name can only contain letters, numbers, hyphens, and underscores' });
      }

      const user = await storage.getUser(userId);
      const settings = await storage.getSettings();

      if (!user || user.coinBalance < settings.projectCost) {
        return res.status(400).json({ message: "Insufficient coins" });
      }

      // Create project
      const project = await storage.createProject({
        name,
        description,
        template: template || 'blank',
        userId
      });

      // Deduct coins
      await storage.updateUserCoins(userId, -settings.projectCost);

      // Log activity
      await storage.createActivity({
        userId,
        projectId: project.id,
        action: "project_created",
        description: `Created new project: ${project.name}`,
        metadata: { template: project.template }
      });

      res.status(201).json(project);
    } catch (error) {
      console.error("Error creating project:", error);
      res.status(500).json({ message: "Failed to create project" });
    }
  });

  app.delete('/api/projects/:id', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.session?.userId;
      const projectId = req.params.id;

      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const project = await storage.getProject(projectId);
      if (!project || project.userId !== userId) {
        return res.status(404).json({ message: "Project not found" });
      }

      const deleted = await storage.deleteProject(projectId);
      if (!deleted) {
        return res.status(500).json({ message: "Failed to delete project" });
      }

      // Log activity
      await storage.createActivity({
        userId,
        action: "project_deleted",
        description: `Deleted project: ${project.name}`
      });

      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting project:", error);
      res.status(500).json({ message: "Failed to delete project" });
    }
  });

  // Project controls
  app.post('/api/projects/:id/start', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.session?.userId;
      const projectId = req.params.id;

      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const project = await storage.getProject(projectId);
      if (!project || project.userId !== userId) {
        return res.status(404).json({ message: "Project not found" });
      }

      // Update project status
      await storage.updateProject(projectId, { status: "running" });

      // Log activity
      await storage.createActivity({
        userId,
        projectId,
        action: "project_started",
        description: `Started project: ${project.name}`
      });

      res.json({ success: true });
    } catch (error) {
      console.error("Error starting project:", error);
      res.status(500).json({ message: "Failed to start project" });
    }
  });

  app.post('/api/projects/:id/stop', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.session?.userId;
      const projectId = req.params.id;

      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const project = await storage.getProject(projectId);
      if (!project || project.userId !== userId) {
        return res.status(404).json({ message: "Project not found" });
      }

      // Update project status
      await storage.updateProject(projectId, { status: "stopped" });

      // Log activity
      await storage.createActivity({
        userId,
        projectId,
        action: "project_stopped",
        description: `Stopped project: ${project.name}`
      });

      res.json({ success: true });
    } catch (error) {
      console.error("Error stopping project:", error);
      res.status(500).json({ message: "Failed to stop project" });
    }
  });

  // Terminal execution
  app.post('/api/projects/:id/execute', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.session?.userId;
      const projectId = req.params.id;
      const { command } = req.body;

      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const project = await storage.getProject(projectId);
      if (!project || project.userId !== userId) {
        return res.status(404).json({ message: "Project not found" });
      }

      // Execute command in project directory
      const child = spawn(command.split(' ')[0], command.split(' ').slice(1), {
        cwd: project.folderPath,
        stdio: 'pipe'
      });

      let output = '';
      let error = '';

      child.stdout?.on('data', (data) => {
        output += data.toString();
      });

      child.stderr?.on('data', (data) => {
        error += data.toString();
      });

      child.on('close', async (code) => {
        // Log activity
        await storage.createActivity({
          userId,
          projectId,
          action: "command_executed",
          description: `Executed command: ${command}`,
          metadata: { command, output, error, exitCode: code }
        });

        res.json({ output, error, exitCode: code });
      });

    } catch (error) {
      console.error("Error executing command:", error);
      res.status(500).json({ message: "Failed to execute command" });
    }
  });

  // File operations
  app.get('/api/projects/:id/files', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.session?.userId;
      const projectId = req.params.id;
      const filePath = req.query.path as string || '';

      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const project = await storage.getProject(projectId);
      if (!project || project.userId !== userId) {
        return res.status(404).json({ message: "Project not found" });
      }

      const fullPath = path.join(project.folderPath, filePath);
      const stats = await fs.stat(fullPath);

      if (stats.isDirectory()) {
        const files = await fs.readdir(fullPath);
        const fileInfos = await Promise.all(
          files.map(async (file) => {
            const fileStats = await fs.stat(path.join(fullPath, file));
            return {
              name: file,
              isDirectory: fileStats.isDirectory(),
              size: fileStats.size,
              modifiedAt: fileStats.mtime
            };
          })
        );
        res.json({ files: fileInfos });
      } else {
        const content = await fs.readFile(fullPath, 'utf-8');
        res.json({ content });
      }
    } catch (error) {
      console.error("Error reading file:", error);
      res.status(500).json({ message: "Failed to read file" });
    }
  });

  app.post('/api/projects/:id/files', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.session?.userId;
      const projectId = req.params.id;
      const { filePath, content } = req.body;

      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const project = await storage.getProject(projectId);
      if (!project || project.userId !== userId) {
        return res.status(404).json({ message: "Project not found" });
      }

      const fullPath = path.join(project.folderPath, filePath);

      // Create directory if it doesn't exist
      const dir = path.dirname(fullPath);
      await fs.mkdir(dir, { recursive: true });

      await fs.writeFile(fullPath, content, 'utf-8');

      // Log activity
      await storage.createActivity({
        userId,
        projectId,
        action: "file_modified",
        description: `Modified file: ${filePath}`
      });

      res.json({ success: true });
    } catch (error) {
      console.error("Error writing file:", error);
      res.status(500).json({ message: "Failed to write file" });
    }
  });

  // Create new file or folder
  app.post('/api/projects/:id/files/create', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.session?.userId;
      const projectId = req.params.id;
      const { filePath, type, content = '' } = req.body;

      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const project = await storage.getProject(projectId);
      if (!project || project.userId !== userId) {
        return res.status(404).json({ message: "Project not found" });
      }

      const fullPath = path.join(project.folderPath, filePath);

      if (type === 'folder') {
        await fs.mkdir(fullPath, { recursive: true });
      } else {
        // Create directory if it doesn't exist
        const dir = path.dirname(fullPath);
        await fs.mkdir(dir, { recursive: true });
        await fs.writeFile(fullPath, content, 'utf-8');
      }

      // Log activity
      await storage.createActivity({
        userId,
        projectId,
        action: type === 'folder' ? "folder_created" : "file_created",
        description: `Created ${type}: ${filePath}`
      });

      res.json({ success: true });
    } catch (error) {
      console.error("Error creating file/folder:", error);
      res.status(500).json({ message: "Failed to create file/folder" });
    }
  });

  // Delete file or folder
  app.delete('/api/projects/:id/files', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.session?.userId;
      const projectId = req.params.id;
      const { filePath } = req.body;

      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const project = await storage.getProject(projectId);
      if (!project || project.userId !== userId) {
        return res.status(404).json({ message: "Project not found" });
      }

      const fullPath = path.join(project.folderPath, filePath);
      const stats = await fs.stat(fullPath);

      if (stats.isDirectory()) {
        await fs.rmdir(fullPath, { recursive: true });
      } else {
        await fs.unlink(fullPath);
      }

      // Log activity
      await storage.createActivity({
        userId,
        projectId,
        action: stats.isDirectory() ? "folder_deleted" : "file_deleted",
        description: `Deleted ${stats.isDirectory() ? 'folder' : 'file'}: ${filePath}`
      });

      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting file/folder:", error);
      res.status(500).json({ message: "Failed to delete file/folder" });
    }
  });

  // Rename/move file or folder
  app.put('/api/projects/:id/files/move', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.session?.userId;
      const projectId = req.params.id;
      const { oldPath, newPath } = req.body;

      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const project = await storage.getProject(projectId);
      if (!project || project.userId !== userId) {
        return res.status(404).json({ message: "Project not found" });
      }

      const fullOldPath = path.join(project.folderPath, oldPath);
      const fullNewPath = path.join(project.folderPath, newPath);

      // Create directory for new path if it doesn't exist
      const newDir = path.dirname(fullNewPath);
      await fs.mkdir(newDir, { recursive: true });

      await fs.rename(fullOldPath, fullNewPath);

      // Log activity
      await storage.createActivity({
        userId,
        projectId,
        action: "file_moved",
        description: `Moved ${oldPath} to ${newPath}`
      });

      res.json({ success: true });
    } catch (error) {
      console.error("Error moving file/folder:", error);
      res.status(500).json({ message: "Failed to move file/folder" });
    }
  });

  // File download
  app.get('/api/projects/:id/files/download', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.session?.userId;
      const projectId = req.params.id;
      const filePath = req.query.path as string || '';

      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const project = await storage.getProject(projectId);
      if (!project || project.userId !== userId) {
        return res.status(404).json({ message: "Project not found" });
      }

      const fullPath = path.join(project.folderPath, filePath);
      const stats = await fs.stat(fullPath);

      if (stats.isFile()) {
        res.download(fullPath, path.basename(filePath));
      } else {
        res.status(400).json({ message: "Cannot download directories" });
      }
    } catch (error) {
      console.error("Error downloading file:", error);
      res.status(500).json({ message: "Failed to download file" });
    }
  });

  // Move/rename file
  app.post('/api/projects/:id/files/move', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.session?.userId;
      const projectId = req.params.id;
      const { oldPath, newPath } = req.body;

      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      if (!oldPath || !newPath) {
        return res.status(400).json({ message: "Both oldPath and newPath are required" });
      }

      const project = await storage.getProject(projectId);
      if (!project || project.userId !== userId) {
        return res.status(404).json({ message: "Project not found" });
      }

      const fullOldPath = path.join(project.folderPath, oldPath);
      const fullNewPath = path.join(project.folderPath, newPath);

      // Check if source file exists
      await fs.stat(fullOldPath);

      // Create directory for new path if it doesn't exist
      const newDir = path.dirname(fullNewPath);
      await fs.mkdir(newDir, { recursive: true });

      // Move/rename the file
      await fs.rename(fullOldPath, fullNewPath);

      // Log activity
      await storage.createActivity({
        userId,
        projectId,
        action: "file_moved",
        description: `Moved/renamed: ${oldPath} → ${newPath}`
      });

      res.json({ success: true });
    } catch (error) {
      console.error("Error moving/renaming file:", error);
      res.status(500).json({ message: "Failed to move/rename file" });
    }
  });

  // File upload with multer
  const upload = multer({ dest: 'uploads/' });

  app.post('/api/projects/:id/files/upload', requireAuth, upload.single('file'), async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.session?.userId;
      const projectId = req.params.id;
      const uploadedFile = req.file;

      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      if (!uploadedFile) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const project = await storage.getProject(projectId);
      if (!project || project.userId !== userId) {
        return res.status(404).json({ message: "Project not found" });
      }

      // Copy file to project directory
      const targetPath = path.join(project.folderPath, uploadedFile.originalname);
      await pipelineAsync(
        createReadStream(uploadedFile.path),
        createWriteStream(targetPath)
      );

      // Clean up temporary file
      await fs.unlink(uploadedFile.path);

      // Log activity
      await storage.createActivity({
        userId,
        projectId,
        action: "file_uploaded",
        description: `Uploaded file: ${uploadedFile.originalname}`
      });

      res.json({ success: true, message: "File uploaded successfully" });
    } catch (error) {
      console.error("Error uploading file:", error);
      res.status(500).json({ message: "Failed to upload file" });
    }
  });

  // ZIP file extraction
  app.post('/api/projects/:id/files/extract', requireAuth, upload.single('zipfile'), async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.session?.userId;
      const projectId = req.params.id;
      const zipFile = req.file;

      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      if (!zipFile) {
        return res.status(400).json({ message: "No ZIP file uploaded" });
      }

      const project = await storage.getProject(projectId);
      if (!project || project.userId !== userId) {
        return res.status(404).json({ message: "Project not found" });
      }

      // Extract ZIP file using unzip command
      const child = spawn('unzip', ['-o', zipFile.path, '-d', project.folderPath], {
        stdio: 'pipe'
      });

      let output = '';
      let error = '';

      child.stdout?.on('data', (data) => {
        output += data.toString();
      });

      child.stderr?.on('data', (data) => {
        error += data.toString();
      });

      child.on('close', async (code) => {
        // Clean up temporary file
        await fs.unlink(zipFile.path);

        if (code === 0) {
          // Log activity
          await storage.createActivity({
            userId,
            projectId,
            action: "zip_extracted",
            description: `Extracted ZIP file: ${zipFile.originalname}`
          });

          res.json({ success: true, message: "ZIP file extracted successfully" });
        } else {
          res.status(500).json({ message: "Failed to extract ZIP file", error });
        }
      });

    } catch (error) {
      console.error("Error extracting ZIP file:", error);
      res.status(500).json({ message: "Failed to extract ZIP file" });
    }
  });

  // Archive project
  app.post('/api/projects/:id/archive', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.session?.userId;
      const projectId = req.params.id;

      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const project = await storage.getProject(projectId);
      if (!project || project.userId !== userId) {
        return res.status(404).json({ message: "Project not found" });
      }

      // Update project status to archived
      await storage.updateProject(projectId, { status: "archived" });

      // Log activity
      await storage.createActivity({
        userId,
        projectId,
        action: "project_archived",
        description: `Archived project: ${project.name}`
      });

      res.json({ success: true });
    } catch (error) {
      console.error("Error archiving project:", error);
      res.status(500).json({ message: "Failed to archive project" });
    }
  });

  // Update startup command
  app.put('/api/projects/:id/startup', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.session?.userId;
      const projectId = req.params.id;
      const { command } = req.body;

      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const project = await storage.getProject(projectId);
      if (!project || project.userId !== userId) {
        return res.status(404).json({ message: "Project not found" });
      }

      // Update project startup command
      await storage.updateProject(projectId, { startupCommand: command });

      // Log activity
      await storage.createActivity({
        userId,
        projectId,
        action: "startup_command_updated",
        description: `Updated startup command: ${command}`
      });

      res.json({ success: true });
    } catch (error) {
      console.error("Error updating startup command:", error);
      res.status(500).json({ message: "Failed to update startup command" });
    }
  });

  // Activity log
  app.get('/api/activities', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.session?.userId;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const limit = parseInt(req.query.limit as string) || 10;
      const activities = await storage.getActivitiesByUser(userId, limit);
      res.json(activities);
    } catch (error) {
      console.error("Error fetching activities:", error);
      res.status(500).json({ message: "Failed to fetch activities" });
    }
  });

  // Admin routes
  app.get('/api/admin/users', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const users = await storage.getUsers();
      // Remove passwords from response
      const safeUsers = Object.values(users).map((user: any) => {
        const { password, ...safeUser } = user;
        return safeUser;
      });
      res.json(safeUsers);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.get('/api/admin/projects', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const projects = await storage.getProjects();
      res.json(projects);
    } catch (error) {
      console.error("Error fetching projects:", error);
      res.status(500).json({ message: "Failed to fetch projects" });
    }
  });

  app.get('/api/admin/settings', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const settings = await storage.getSettings();
      res.json(settings);
    } catch (error) {
      console.error("Error fetching settings:", error);
      res.status(500).json({ message: "Failed to fetch settings" });
    }
  });

  app.put('/api/admin/settings', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const settings = await storage.updateSettings(req.body);
      res.json(settings);
    } catch (error) {
      console.error("Error updating settings:", error);
      res.status(500).json({ message: "Failed to update settings" });
    }
  });

  app.post('/api/admin/users/:id/coins', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.params.id;
      const { amount } = req.body;

      const user = await storage.updateUserCoins(userId, amount);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      // Log activity
      await storage.createActivity({
        userId: req.session?.userId,
        action: 'admin_coins_updated',
        description: `Admin updated coins for user ${user.username}: ${amount > 0 ? '+' : ''}${amount}`
      });

      res.json(user);
    } catch (error) {
      console.error('Error updating user coins:', error);
      res.status(500).json({ message: 'Failed to update user coins' });
    }
  });

  app.put('/api/admin/users/:id/status', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.params.id;
      const { action } = req.body;

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      let updates: any = {};
      switch (action) {
        case 'ban':
          updates.isBanned = true;
          updates.isSuspended = false;
          break;
        case 'unban':
          updates.isBanned = false;
          break;
        case 'suspend':
          updates.isSuspended = true;
          updates.isBanned = false;
          break;
        case 'unsuspend':
          updates.isSuspended = false;
          break;
        default:
          return res.status(400).json({ message: 'Invalid action' });
      }

      const updatedUser = await storage.updateUser(userId, updates);

      // Log activity
      await storage.createActivity({
        userId: req.session?.userId,
        action: `admin_user_${action}`,
        description: `Admin ${action}ned user ${user.username}`
      });

      res.json(updatedUser);
    } catch (error) {
      console.error('Error updating user status:', error);
      res.status(500).json({ message: 'Failed to update user status' });
    }
  });

  // Store broadcast messages in memory (in production, use Redis or database)
  const broadcastMessages: { id: string; message: string; timestamp: Date; target: string }[] = [];

  app.post('/api/admin/broadcast', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { message, target } = req.body;

      // Store broadcast message
      const broadcast = {
        id: randomUUID(),
        message,
        target,
        timestamp: new Date()
      };
      broadcastMessages.push(broadcast);

      // Log broadcast activity
      await storage.createActivity({
        userId: req.session?.userId,
        action: 'admin_broadcast',
        description: `Admin sent broadcast message to ${target} users: ${message.substring(0, 50)}...`,
        metadata: { message, target }
      });

      res.json({ success: true, message: 'Broadcast sent successfully' });
    } catch (error) {
      console.error('Error sending broadcast:', error);
      res.status(500).json({ message: 'Failed to send broadcast' });
    }
  });

  // Endpoint to get pending broadcasts for a user
  app.get('/api/broadcasts', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.session?.userId;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      // Get broadcasts from last 24 hours
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const recentBroadcasts = broadcastMessages.filter(b => 
        b.timestamp > oneDayAgo && 
        (b.target === 'all' || b.target === 'active')
      );

      res.json(recentBroadcasts);
    } catch (error) {
      console.error('Error fetching broadcasts:', error);
      res.status(500).json({ message: 'Failed to fetch broadcasts' });
    }
  });

  // Admin route to check for duplicate accounts
  app.get('/api/admin/duplicates', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const users = await storage.getUsers();
      const duplicateGroups: { [key: string]: any[] } = {};
      
      // Group users by fingerprint
      for (const user of Object.values(users)) {
        if (user.deviceFingerprints) {
          for (const fingerprint of user.deviceFingerprints) {
            if (!duplicateGroups[fingerprint]) {
              duplicateGroups[fingerprint] = [];
            }
            duplicateGroups[fingerprint].push({
              id: user.id,
              username: user.username,
              email: user.email,
              createdAt: user.createdAt,
              ipAddresses: user.ipAddresses
            });
          }
        }
      }
      
      // Filter groups with more than one user
      const actualDuplicates = Object.entries(duplicateGroups)
        .filter(([_, users]) => users.length > 1)
        .map(([fingerprint, users]) => ({ fingerprint, users }));
      
      res.json(actualDuplicates);
    } catch (error) {
      console.error('Error fetching duplicate accounts:', error);
      res.status(500).json({ message: 'Failed to fetch duplicate accounts' });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
