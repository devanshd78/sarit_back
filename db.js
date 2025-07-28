// db.js
require('dotenv').config();
const { MongoClient } = require('mongodb');

const { MONGODB_URI, DB_NAME = 'sarit' } = process.env;

if (!MONGODB_URI) {
  throw new Error('Missing MONGODB_URI environment variable');
}

let cachedClient = null;
let cachedDb     = null;


async function connectToDatabase() {
  if (cachedClient && cachedDb) {
    return { client: cachedClient, db: cachedDb };
  }

  const client = new MongoClient(MONGODB_URI);
  await client.connect();

  const db = client.db(DB_NAME);
  cachedClient = client;
  cachedDb     = db;

  console.log(`✔️  Connected to MongoDB → ${DB_NAME}`);
  return { client, db };
}

/**
 * Gracefully closes the cached connection.
 */
async function closeConnection() {
  if (cachedClient) {
    await cachedClient.close();
    cachedClient = null;
    cachedDb     = null;
    console.log('🔒  MongoDB connection closed');
  }
}

module.exports = {
  connectToDatabase,
  connectDB: connectToDatabase,   // alias
  closeConnection,
};
