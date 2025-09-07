const express = require('express');
const { createServer } = require('http');
const { spawn } = require('child_process');
const fs = require('fs').promises;
const path = require('path');
const storage = require('./jsonStorage');
const { setupSessions, setupAuthRoutes, requireAuth, requireAdmin } = require('./auth');

async function registerRoutes(app) {
  // Setup sessions and auth
  setupSessions(app);
  setupAuthRoutes(app);

  // Dashboard stats
  app.get('/api/dashboard/stats', requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId;
      const projects = await storage.getProjectsByUser(userId);
      const user = await storage.getUser(userId);
      const activities = await storage.getActivitiesByUser(userId, 1);
      
      const stats = {
        activeProjects: projects.filter(p => p.status === 'running').length,
        totalProjects: projects.length,
        coinBalance: user?.coinBalance || 0,
        commandsToday: activities.length,
        storageUsed: "2.4 GB",
        storageLimit: "4 GB"
      };
      
      res.json(stats);
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      res.status(500).json({ message: 'Failed to fetch dashboard stats' });
    }
  });

  // Projects CRUD
  app.get('/api/projects', requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId;
      const projects = await storage.getProjectsByUser(userId);
      res.json(projects);
    } catch (error) {
      console.error('Error fetching projects:', error);
      res.status(500).json({ message: 'Failed to fetch projects' });
    }
  });

  app.post('/api/projects', requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId;
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
        return res.status(400).json({ message: 'Insufficient coins' });
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
        action: 'project_created',
        description: `Created new project: ${project.name}`,
        metadata: { template: project.template }
      });
      
      res.status(201).json(project);
    } catch (error) {
      console.error('Error creating project:', error);
      res.status(500).json({ message: 'Failed to create project' });
    }
  });

  app.delete('/api/projects/:id', requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId;
      const projectId = req.params.id;
      
      const project = await storage.getProject(projectId);
      if (!project || project.userId !== userId) {
        return res.status(404).json({ message: 'Project not found' });
      }
      
      const deleted = await storage.deleteProject(projectId);
      if (!deleted) {
        return res.status(500).json({ message: 'Failed to delete project' });
      }
      
      // Log activity
      await storage.createActivity({
        userId,
        action: 'project_deleted',
        description: `Deleted project: ${project.name}`
      });
      
      res.json({ success: true });
    } catch (error) {
      console.error('Error deleting project:', error);
      res.status(500).json({ message: 'Failed to delete project' });
    }
  });

  // Project controls
  app.post('/api/projects/:id/start', requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId;
      const projectId = req.params.id;
      
      const project = await storage.getProject(projectId);
      if (!project || project.userId !== userId) {
        return res.status(404).json({ message: 'Project not found' });
      }
      
      // Update project status
      await storage.updateProject(projectId, { status: 'running' });
      
      // Log activity
      await storage.createActivity({
        userId,
        projectId,
        action: 'project_started',
        description: `Started project: ${project.name}`
      });
      
      res.json({ success: true });
    } catch (error) {
      console.error('Error starting project:', error);
      res.status(500).json({ message: 'Failed to start project' });
    }
  });

  app.post('/api/projects/:id/stop', requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId;
      const projectId = req.params.id;
      
      const project = await storage.getProject(projectId);
      if (!project || project.userId !== userId) {
        return res.status(404).json({ message: 'Project not found' });
      }
      
      // Update project status
      await storage.updateProject(projectId, { status: 'stopped' });
      
      // Log activity
      await storage.createActivity({
        userId,
        projectId,
        action: 'project_stopped',
        description: `Stopped project: ${project.name}`
      });
      
      res.json({ success: true });
    } catch (error) {
      console.error('Error stopping project:', error);
      res.status(500).json({ message: 'Failed to stop project' });
    }
  });

  // Terminal execution
  app.post('/api/projects/:id/execute', requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId;
      const projectId = req.params.id;
      const { command } = req.body;
      
      const project = await storage.getProject(projectId);
      if (!project || project.userId !== userId) {
        return res.status(404).json({ message: 'Project not found' });
      }
      
      // Execute command in project directory
      const commandParts = command.split(' ');
      const child = spawn(commandParts[0], commandParts.slice(1), {
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
          action: 'command_executed',
          description: `Executed command: ${command}`,
          metadata: { command, output, error, exitCode: code }
        });
        
        res.json({ output, error, exitCode: code });
      });
      
    } catch (error) {
      console.error('Error executing command:', error);
      res.status(500).json({ message: 'Failed to execute command' });
    }
  });

  // File operations
  app.get('/api/projects/:id/files', requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId;
      const projectId = req.params.id;
      const filePath = req.query.path || '';
      
      const project = await storage.getProject(projectId);
      if (!project || project.userId !== userId) {
        return res.status(404).json({ message: 'Project not found' });
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
      console.error('Error reading file:', error);
      res.status(500).json({ message: 'Failed to read file' });
    }
  });

  app.post('/api/projects/:id/files', requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId;
      const projectId = req.params.id;
      const { filePath, content } = req.body;
      
      const project = await storage.getProject(projectId);
      if (!project || project.userId !== userId) {
        return res.status(404).json({ message: 'Project not found' });
      }
      
      const fullPath = path.join(project.folderPath, filePath);
      await fs.writeFile(fullPath, content, 'utf-8');
      
      // Log activity
      await storage.createActivity({
        userId,
        projectId,
        action: 'file_modified',
        description: `Modified file: ${filePath}`
      });
      
      res.json({ success: true });
    } catch (error) {
      console.error('Error writing file:', error);
      res.status(500).json({ message: 'Failed to write file' });
    }
  });

  // Activity log
  app.get('/api/activities', requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId;
      const limit = parseInt(req.query.limit) || 10;
      const activities = await storage.getActivitiesByUser(userId, limit);
      res.json(activities);
    } catch (error) {
      console.error('Error fetching activities:', error);
      res.status(500).json({ message: 'Failed to fetch activities' });
    }
  });

  // Admin routes
  app.get('/api/admin/users', requireAdmin, async (req, res) => {
    try {
      const users = await storage.getUsers();
      // Remove passwords from response
      const safeUsers = Object.values(users).map(user => {
        const { password, ...safeUser } = user;
        return safeUser;
      });
      res.json(safeUsers);
    } catch (error) {
      console.error('Error fetching users:', error);
      res.status(500).json({ message: 'Failed to fetch users' });
    }
  });

  app.get('/api/admin/settings', requireAdmin, async (req, res) => {
    try {
      const settings = await storage.getSettings();
      res.json(settings);
    } catch (error) {
      console.error('Error fetching settings:', error);
      res.status(500).json({ message: 'Failed to fetch settings' });
    }
  });

  app.put('/api/admin/settings', requireAdmin, async (req, res) => {
    try {
      const settings = await storage.updateSettings(req.body);
      res.json(settings);
    } catch (error) {
      console.error('Error updating settings:', error);
      res.status(500).json({ message: 'Failed to update settings' });
    }
  });

  app.post('/api/admin/users/:id/coins', requireAdmin, async (req, res) => {
    try {
      const userId = req.params.id;
      const { amount } = req.body;
      
      const user = await storage.updateUserCoins(userId, amount);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      // Log activity
      await storage.createActivity({
        userId: req.session.userId,
        action: 'admin_coins_updated',
        description: `Admin updated coins for user ${user.username}: ${amount > 0 ? '+' : ''}${amount}`
      });
      
      res.json(user);
    } catch (error) {
      console.error('Error updating user coins:', error);
      res.status(500).json({ message: 'Failed to update user coins' });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

module.exports = { registerRoutes };