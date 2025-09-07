const express = require('express');
const path = require('path');
const { registerRoutes } = require('./routes');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from client build
app.use(express.static(path.join(__dirname, '../client/dist')));

// API routes
async function startServer() {
  try {
    const server = await registerRoutes(app);
    
    // Serve client app for all non-API routes
    app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, '../client/dist/index.html'));
    });

    server.listen(PORT, '0.0.0.0', () => {
      console.log(`Edward Panels server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();