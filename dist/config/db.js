import mongoose from 'mongoose';
import { env } from './env.js';
export const connectDB = async () => {
    try {
        mongoose.set('strictQuery', true);
        const conn = await mongoose.connect(env.MONGO_URI);
        console.log(`[Database] MongoDB Connected: ${conn.connection.host}`);
        mongoose.connection.on('error', (err) => {
            console.error(`[Database Error] Connection error: ${err}`);
        });
        mongoose.connection.on('disconnected', () => {
            console.warn('[Database Warning] MongoDB disconnected. Attempting reconnect...');
        });
    }
    catch (error) {
        console.error(`[Database Critical] Failed to connect to MongoDB: ${error}`);
        process.exit(1);
    }
};
