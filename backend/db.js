// Database access using the official MongoDB native driver.
// A single MongoClient is shared across the app.
import { MongoClient } from 'mongodb';

const uri = process.env.MONGO_URI;
const dbName = process.env.DB_NAME || 'movie_night';

if (!uri) {
  throw new Error(
    'MONGO_URI is not set. Copy .env.example to .env and fill it in.'
  );
}

const client = new MongoClient(uri);
let db = null;

// Connect once at startup and reuse the connection everywhere.
export async function connectToDatabase() {
  if (db) return db;
  await client.connect();
  db = client.db(dbName);
  console.log(`Connected to MongoDB database: ${dbName}`);
  return db;
}

// Convenience accessor for the shared database handle.
export function getDb() {
  if (!db) {
    throw new Error(
      'Database not initialized. Call connectToDatabase() first.'
    );
  }
  return db;
}

// Named collection getters keep collection names in one place.
export function usersCollection() {
  return getDb().collection('users');
}

export function moviesCollection() {
  return getDb().collection('movies');
}

export function sessionsCollection() {
  return getDb().collection('sessions');
}

export { client };
