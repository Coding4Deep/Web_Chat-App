import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg"; // Import pg as default
const { Pool } = pg; // Destructure Pool
import { IStorage } from "./storage"; // Assuming IStorage is exported from storage.ts
import * as schema from "@shared/schema";
import { eq } from "drizzle-orm";

// Ensure DATABASE_URL environment variable is set
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
    throw new Error("DATABASE_URL is not set");
}

// Create a new pool instance
const pool = new Pool({
    connectionString: databaseUrl,
});

// Create the Drizzle ORM database connection
const db = drizzle(pool, { schema });

export class PostgresStorage implements IStorage {
    sessionStore: any; // Session store is likely handled separately, or could be a different type

    constructor() {
        // Initialize session store if needed, or remove if not used with Postgres
        // For now, keeping it as any based on IStorage interface
        this.sessionStore = null; // Or an appropriate persistent session store
    }

    // Implement IStorage methods here using 'db'

    async getUser(id: number): Promise<schema.User | undefined> {
        // Example implementation for getUser
        const result = await db.select().from(schema.users).where(eq(schema.users.id, id)).limit(1);
        return result[0];
    }

    // Add implementations for other IStorage methods (getUserByUsername, createUser, etc.)

    async getUserByUsername(username: string): Promise<schema.User | undefined> {
        const result = await db.select().from(schema.users).where(eq(schema.users.username, username)).limit(1);
        return result[0];
    }

    async getUserByEmail(email: string): Promise<schema.User | undefined> {
         const result = await db.select().from(schema.users).where(eq(schema.users.email, email)).limit(1);
        return result[0];
    }

    async createUser(user: schema.InsertUser): Promise<schema.User> {
        const result = await db.insert(schema.users).values(user).returning();
        return result[0]; // Assuming returning() returns the inserted user
    }

    async getAllUsers(): Promise<schema.User[]> {
        const result = await db.select().from(schema.users);
        return result;
    }

    async getChatMessages(): Promise<schema.ChatMessage[]> {
        const result = await db.select().from(schema.chatMessages).orderBy(schema.chatMessages.timestamp);
        return result;
    }

    async createChatMessage(message: schema.InsertChatMessage): Promise<schema.ChatMessage> {
        const result = await db.insert(schema.chatMessages).values(message).returning();
         return result[0]; // Assuming returning() returns the inserted message
    }

    async clearChatMessages(): Promise<void> {
        await db.delete(schema.chatMessages);
    }

    async deleteUserChatMessages(userId: number): Promise<void> {
        await db.delete(schema.chatMessages).where(eq(schema.chatMessages.userId, userId));
    }

     async getDynamicUrls(): Promise<schema.DynamicUrl[]> {
        const result = await db.select().from(schema.dynamicUrls);
        return result;
    }

    async createDynamicUrl(url: schema.InsertDynamicUrl): Promise<schema.DynamicUrl> {
         const result = await db.insert(schema.dynamicUrls).values(url).returning();
         return result[0]; // Assuming returning() returns the inserted url
    }

    async updateDynamicUrl(id: number, url: schema.InsertDynamicUrl): Promise<schema.DynamicUrl> {
        const result = await db.update(schema.dynamicUrls).set(url).where(eq(schema.dynamicUrls.id, id)).returning();
        return result[0]; // Assuming returning() returns the updated url
    }

     async getAppSettings(): Promise<schema.AppSetting[]> {
        const result = await db.select().from(schema.appSettings);
        return result;
    }

    async getAppSetting(key: string): Promise<schema.AppSetting | undefined> {
         const result = await db.select().from(schema.appSettings).where(eq(schema.appSettings.key, key)).limit(1);
        return result[0];
    }

    async setAppSetting(setting: schema.InsertAppSetting): Promise<schema.AppSetting> {
        // Drizzle does not have a direct upsert for all databases, but can be done with onConflict
        // For simplicity here, we might try insert and catch the unique violation, or select first.
        // A more robust solution would use onConflict if your PostgreSQL version supports it and Drizzle exposes it.

        // Let's try inserting and if it fails due to unique key, we'll update.
         try {
            const result = await db.insert(schema.appSettings).values(setting).returning();
            return result[0];
         } catch (error) {
            // Assuming a unique constraint violation on 'key'
            // This is a simplified error handling; real-world would check error details
            const result = await db.update(schema.appSettings).set(setting).where(eq(schema.appSettings.key, setting.key)).returning();
            return result[0];
         }
    }

     async healthCheck(): Promise<boolean> {
        try {
            // Simple query to check database connectivity
            await db.select().from(schema.users).limit(1);
            return true;
        } catch (error) {
            console.error('Database health check failed:', error);
            return false;
        }
    }
}

export const storage = new PostgresStorage(); 