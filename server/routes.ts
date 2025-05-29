import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { setupAuth } from "./auth";
import { storage } from "./postgresStorage";
import { redisClient } from "./redis";
import { publishTask, checkRabbitMQHealth } from "./rabbitmq";
import { register, httpRequestsTotal, httpRequestDuration, activeConnections, chatMessagesTotal } from "./metrics";
import { insertChatMessageSchema, insertDynamicUrlSchema, insertAppSettingSchema } from "@shared/schema";

export function registerRoutes(app: Express): Server {
  // Add metrics middleware
  app.use((req, res, next) => {
    const start = Date.now();
    const end = httpRequestDuration.startTimer({ method: req.method, route: req.route?.path || req.path });
    
    res.on('finish', () => {
      const duration = (Date.now() - start) / 1000;
      httpRequestsTotal.inc({ method: req.method, route: req.route?.path || req.path, status_code: res.statusCode });
      end();
    });
    
    next();
  });

  // Metrics endpoint for Prometheus
  app.get('/metrics', async (req, res) => {
    try {
      res.set('Content-Type', register.contentType);
      res.end(await register.metrics());
    } catch (error) {
      res.status(500).end(error);
    }
  });

  // Health check endpoints for Kubernetes
  app.get('/health', async (req, res) => {
    try {
      // Basic health check - application is running
      res.status(200).json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        service: 'backend'
      });
    } catch (error) {
      res.status(500).json({
        status: 'unhealthy',
        error: error.message,
        service: 'backend'
      });
    }
  });

  app.get('/health/ready', async (req, res) => {
    try {
      // Readiness check - all dependencies are ready
      const checks = [];
      
      // Check Redis connection
      try {
        await redisClient.ping();
        checks.push({ service: 'redis', status: 'healthy' });
      } catch (error) {
        checks.push({ service: 'redis', status: 'unhealthy', error: error.message });
      }

      // Check Database connection
      try {
        const dbCheck = await storage.healthCheck();
        checks.push({ service: 'database', status: dbCheck ? 'healthy' : 'unhealthy' });
      } catch (error) {
        checks.push({ service: 'database', status: 'unhealthy', error: error.message });
      }

      // Check RabbitMQ connection
      try {
        const rabbitCheck = await checkRabbitMQHealth();
        checks.push({ service: 'rabbitmq', status: rabbitCheck ? 'healthy' : 'unhealthy' });
      } catch (error) {
        checks.push({ service: 'rabbitmq', status: 'unhealthy', error: error.message });
      }

      const allHealthy = checks.every(check => check.status === 'healthy');
      
      res.status(allHealthy ? 200 : 503).json({
        status: allHealthy ? 'ready' : 'not_ready',
        timestamp: new Date().toISOString(),
        checks
      });
    } catch (error) {
      res.status(503).json({
        status: 'not_ready',
        error: error.message,
        service: 'backend'
      });
    }
  });

  app.get('/health/live', async (req, res) => {
    try {
      // Liveness check - application is alive and not deadlocked
      const memUsage = process.memoryUsage();
      const cpuUsage = process.cpuUsage();
      
      res.status(200).json({
        status: 'alive',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: {
          rss: Math.round(memUsage.rss / 1024 / 1024) + 'MB',
          heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024) + 'MB',
          heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024) + 'MB'
        },
        cpu: {
          user: cpuUsage.user,
          system: cpuUsage.system
        }
      });
    } catch (error) {
      res.status(500).json({
        status: 'dead',
        error: error.message,
        service: 'backend'
      });
    }
  });

  // Setup authentication routes
  setupAuth(app);

  // Get all users (excluding passwords)
  app.get("/api/users", async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      const safeUsers = users.map(({ password, ...user }) => user);
      res.json(safeUsers);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch users" });
    }
  });

  // Get chat messages
  app.get("/api/chat", async (req, res) => {
    try {
      // Try to get from Redis cache first
      const cacheKey = 'chat_messages';
      const cachedMessages = await redisClient.get(cacheKey);
      
      if (cachedMessages) {
        return res.json(JSON.parse(cachedMessages));
      }
      
      const messages = await storage.getChatMessages();
      
      // Cache for 30 seconds
      await redisClient.setEx(cacheKey, 30, JSON.stringify(messages));
      
      res.json(messages);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch chat messages" });
    }
  });

  // Create chat message
  app.post("/api/chat", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      const validatedData = insertChatMessageSchema.parse({
        userId: req.user!.id,
        content: req.body.content,
      });
      
      const message = await storage.createChatMessage(validatedData);
      
      // Clear cache
      await redisClient.del('chat_messages');
      
      // Increment metrics
      chatMessagesTotal.inc();
      
      // Publish task to RabbitMQ for async processing
      await publishTask('notification_queue', {
        type: 'new_message',
        userId: req.user!.id,
        messageId: message.id,
        timestamp: new Date().toISOString()
      });
      
      // Broadcast to all WebSocket clients
      if ((global as any).wss) {
        const messageWithUser = {
          ...message,
          user: { 
            id: req.user!.id, 
            username: req.user!.username,
            email: req.user!.email 
          }
        };
        
        (global as any).wss.clients.forEach((client: WebSocket) => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({
              type: 'new_message',
              data: messageWithUser
            }));
          }
        });
      }
      
      res.status(201).json(message);
    } catch (error) {
      console.error("Chat message validation failed:", error);
      res.status(400).json({ error: "Invalid message data", details: error });
    }
  });

  // Clear all chat messages
  app.delete("/api/chat", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      await storage.clearChatMessages();
      
      // Broadcast clear event to all WebSocket clients
      if ((global as any).wss) {
        (global as any).wss.clients.forEach((client: WebSocket) => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({
              type: 'chat_cleared'
            }));
          }
        });
      }
      
      res.status(200).json({ message: "Chat cleared" });
    } catch (error) {
      res.status(500).json({ error: "Failed to clear chat" });
    }
  });

  // Delete user's chat messages
  app.delete("/api/chat/user", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      await storage.deleteUserChatMessages(req.user!.id);
      
      // Broadcast user messages deleted event
      if ((global as any).wss) {
        (global as any).wss.clients.forEach((client: WebSocket) => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({
              type: 'user_messages_deleted',
              userId: req.user!.id
            }));
          }
        });
      }
      
      res.status(200).json({ message: "User messages deleted" });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete user messages" });
    }
  });

  // Get dynamic URLs
  app.get("/api/dynamic-urls", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      const urls = await storage.getDynamicUrls();
      res.json(urls);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch dynamic URLs" });
    }
  });

  // Get app settings
  app.get("/api/settings", async (req, res) => {
    try {
      const settings = await storage.getAppSettings();
      res.json(settings);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch settings" });
    }
  });

  // Update app setting
  app.put("/api/settings/:key", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      const { key } = req.params;
      const { value } = req.body;
      
      const setting = await storage.setAppSetting({ key, value });
      res.json(setting);
    } catch (error) {
      res.status(500).json({ error: "Failed to update setting" });
    }
  });

  // Update dynamic URL
  app.put("/api/dynamic-urls/:id", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      const id = parseInt(req.params.id);
      const validatedData = insertDynamicUrlSchema.parse(req.body);
      
      const url = await storage.updateDynamicUrl(id, validatedData);
      res.json(url);
    } catch (error) {
      res.status(500).json({ error: "Failed to update URL" });
    }
  });

  // Background task queue simulation
  app.post("/api/tasks", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      const { type, data } = req.body;
      
      // Simulate async task processing
      setTimeout(() => {
        console.log(`Background task processed: ${type}`, data);
        // In a real implementation, this would use RabbitMQ or similar
      }, 100);
      
      res.status(202).json({ message: "Task queued for processing" });
    } catch (error) {
      res.status(500).json({ error: "Failed to queue task" });
    }
  });

  const httpServer = createServer(app);

  // Setup WebSocket server
  const wss = new WebSocketServer({ 
    server: httpServer, 
    path: '/ws' 
  });

  // Store WebSocket server globally for broadcasting
  (global as any).wss = wss;

  wss.on('connection', (ws: WebSocket) => {
    console.log('WebSocket client connected');
    activeConnections.inc();

    ws.on('message', async (message: Buffer) => {
      try {
        const data = JSON.parse(message.toString());
        
        if (data.type === 'ping') {
          ws.send(JSON.stringify({ type: 'pong' }));
        }
      } catch (error) {
        console.error('WebSocket message error:', error);
      }
    });

    ws.on('close', () => {
      console.log('WebSocket client disconnected');
      activeConnections.dec();
    });

    // Send connection confirmation
    ws.send(JSON.stringify({ 
      type: 'connected',
      message: 'WebSocket connection established' 
    }));
  });

  return httpServer;
}
