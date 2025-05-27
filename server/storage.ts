import { users, chatMessages, dynamicUrls, appSettings, type User, type InsertUser, type ChatMessage, type InsertChatMessage, type DynamicUrl, type InsertDynamicUrl, type AppSetting, type InsertAppSetting } from "@shared/schema";
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
  updateDynamicUrl(id: number, url: InsertDynamicUrl): Promise<DynamicUrl>;

  getAppSettings(): Promise<AppSetting[]>;
  getAppSetting(key: string): Promise<AppSetting | undefined>;
  setAppSetting(setting: InsertAppSetting): Promise<AppSetting>;

  sessionStore: any;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private chatMessages: Map<number, ChatMessage>;
  private dynamicUrls: Map<number, DynamicUrl>;
  private appSettings: Map<string, AppSetting>;
  private currentUserId: number;
  private currentChatId: number;
  private currentUrlId: number;
  private currentSettingId: number;
  sessionStore: any;

  constructor() {
    this.users = new Map();
    this.chatMessages = new Map();
    this.dynamicUrls = new Map();
    this.appSettings = new Map();
    this.currentUserId = 1;
    this.currentChatId = 1;
    this.currentUrlId = 1;
    this.currentSettingId = 1;

    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000,
    });

    // Initialize some dynamic URLs and settings
    this.initializeDynamicUrls();
    this.initializeAppSettings();
  }

  private async initializeDynamicUrls() {
    const defaultUrls = [
      { name: "My Portfolio", url: "https://portfolio.example.com", icon: "fas fa-server" },
      { name: "Task Manager App", url: "https://taskmanager.example.com", icon: "fas fa-chart-line" },
      { name: "Dockerfile Optimizer", url: "https://dockerfile.example.com", icon: "fas fa-cogs" },
      { name: "DevOps Tools", url: "https://tools.example.com", icon: "fas fa-tools" },
    ];

    for (const url of defaultUrls) {
      await this.createDynamicUrl(url);
    }
  }

  private async initializeAppSettings() {
    const defaultSettings = [
      { key: "learn_more_url", value: "https://learn.example.com" },
      { key: "github_url", value: "https://github.com/username" },
      { key: "email", value: "contact@example.com" },
      { key: "linkedin_url", value: "https://linkedin.com/in/username" },
    ];

    for (const setting of defaultSettings) {
      await this.setAppSetting(setting);
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

  async updateDynamicUrl(id: number, insertUrl: InsertDynamicUrl): Promise<DynamicUrl> {
    const url: DynamicUrl = { ...insertUrl, id };
    this.dynamicUrls.set(id, url);
    return url;
  }

  async getAppSettings(): Promise<AppSetting[]> {
    return Array.from(this.appSettings.values());
  }

  async getAppSetting(key: string): Promise<AppSetting | undefined> {
    return this.appSettings.get(key);
  }

  async setAppSetting(insertSetting: InsertAppSetting): Promise<AppSetting> {
    const existing = this.appSettings.get(insertSetting.key);
    const id = existing?.id || this.currentSettingId++;
    const setting: AppSetting = { ...insertSetting, id };
    this.appSettings.set(insertSetting.key, setting);
    return setting;
  }

  async healthCheck(): Promise<boolean> {
    try {
      // Simple query to check database connectivity
      // await db.select().from(users).limit(1); // This line will cause error, as db is not defined.
      // Modified health check for MemStorage.
      return true;
    } catch (error) {
      console.error('Database health check failed:', error);
      return false;
    }
  }
}

export const storage = new MemStorage();