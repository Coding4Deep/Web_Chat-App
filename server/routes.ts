import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { insertChatMessageSchema, insertDynamicUrlSchema, insertAppSettingSchema } from "@shared/schema";

export function registerRoutes(app: Express): Server {
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
      const messages = await storage.getChatMessages();
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
      res.status(400).json({ error: "Invalid message data" });
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
    });

    // Send connection confirmation
    ws.send(JSON.stringify({ 
      type: 'connected',
      message: 'WebSocket connection established' 
    }));
  });

  return httpServer;
}
