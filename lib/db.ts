import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/optirange";

let migrationRan = false;

async function runMigrations() {
  if (migrationRan) return;
  migrationRan = true;

  try {
    const db = mongoose.connection.db;
    if (!db) return;

    // Drop the old unique index on evdatas.userId that prevents multi-car garage
    const evCollection = db.collection('evdatas');
    const indexes = await evCollection.indexes();
    const hasOldIndex = indexes.some((idx: any) => idx.name === 'userId_1' && idx.unique === true);

    if (hasOldIndex) {
      await evCollection.dropIndex('userId_1');
      console.log('[Migration] Dropped unique index userId_1 from evdatas — multi-car garage enabled');
    }
  } catch (err: any) {
    // Index may already be gone — safe to ignore
    if (!err.message?.includes('index not found')) {
      console.warn('[Migration] Index drop warning:', err.message);
    }
  }
}

export async function connectDB() {
  if (mongoose.connection.readyState >= 1) {
    await runMigrations();
    return;
  }

  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB via Mongoose');
    await runMigrations();
  } catch (err) {
    console.error('MongoDB connection error:', err);
  }
}
