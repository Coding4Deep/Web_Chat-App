import { users, chatMessages, dynamicUrls, type User, type InsertUser, type ChatMessage, type InsertChatMessage, type DynamicUrl, type InsertDynamicUrl } from "@shared/schema";
import session from "express-session";
import createMemoryStore from "memorystore";

const MemoryStore = createMemoryStore(session);

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getAllUsers(): Promise<User[]>;
  
  getChatMessages(): Promise<ChatMessage[]>;
  createChatMessage(message: InsertChatMessage): Promise<ChatMessage>;
  clearChatMessages(): Promise<void>;
  deleteUserChatMessages(userId: number): Promise<void>;
  
  getDynamicUrls(): Promise<DynamicUrl[]>;
  createDynamicUrl(url: InsertDynamicUrl): Promise<DynamicUrl>;
  
  sessionStore: any;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private chatMessages: Map<number, ChatMessage>;
  private dynamicUrls: Map<number, DynamicUrl>;
  private currentUserId: number;
  private currentChatId: number;
  private currentUrlId: number;
  sessionStore: any;

  constructor() {
    this.users = new Map();
    this.chatMessages = new Map();
    this.dynamicUrls = new Map();
    this.currentUserId = 1;
    this.currentChatId = 1;
    this.currentUrlId = 1;
    
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000,
    });

    // Initialize some dynamic URLs
    this.initializeDynamicUrls();
  }

  private async initializeDynamicUrls() {
    const defaultUrls = [
      { name: "Server Status", url: "https://status.example.com", icon: "fas fa-server" },
      { name: "Analytics Dashboard", url: "https://analytics.example.com", icon: "fas fa-chart-line" },
      { name: "Configuration", url: "https://config.example.com", icon: "fas fa-cogs" },
      { name: "DevOps Tools", url: "https://tools.example.com", icon: "fas fa-tools" },
    ];

    for (const url of defaultUrls) {
      await this.createDynamicUrl(url);
    }
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.email === email,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  async getAllUsers(): Promise<User[]> {
    return Array.from(this.users.values());
  }

  async getChatMessages(): Promise<ChatMessage[]> {
    return Array.from(this.chatMessages.values()).sort((a, b) => 
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
  }

  async createChatMessage(insertMessage: InsertChatMessage): Promise<ChatMessage> {
    const id = this.currentChatId++;
    const message: ChatMessage = { 
      ...insertMessage, 
      id, 
      timestamp: new Date() 
    };
    this.chatMessages.set(id, message);
    return message;
  }

  async clearChatMessages(): Promise<void> {
    this.chatMessages.clear();
  }

  async deleteUserChatMessages(userId: number): Promise<void> {
    const messages = Array.from(this.chatMessages.entries());
    for (const [id, message] of messages) {
      if (message.userId === userId) {
        this.chatMessages.delete(id);
      }
    }
  }

  async getDynamicUrls(): Promise<DynamicUrl[]> {
    return Array.from(this.dynamicUrls.values());
  }

  async createDynamicUrl(insertUrl: InsertDynamicUrl): Promise<DynamicUrl> {
    const id = this.currentUrlId++;
    const url: DynamicUrl = { ...insertUrl, id };
    this.dynamicUrls.set(id, url);
    return url;
  }
}

export const storage = new MemStorage();
