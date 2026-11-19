import { MongoClient } from "mongodb";

let client = null;
let db = null;

export function getDBName() {
  return process.env.DB_NAME || "mentorlagbe";
}

/**
 * Creates the indexes used by the application collections.
 * Safe to run on every boot (createIndex is idempotent).
 */
async function ensureIndexes(database) {
  const users = database.collection("users");
  const tuitions = database.collection("tuitions");
  const applications = database.collection("applications");
  const payments = database.collection("payments");

  await Promise.all([
    users.createIndex({ email: 1 }, { unique: true }),
    users.createIndex({ role: 1 }),
    users.createIndex({ plan: 1 }),
    tuitions.createIndex({ approvalStatus: 1, isActive: 1, createdAt: -1 }),
    tuitions.createIndex({ tutorEmail: 1, createdAt: -1 }),
    tuitions.createIndex({ subject: 1 }),
    tuitions.createIndex({ classLevel: 1 }),
    tuitions.createIndex({ title: "text", subject: "text", description: "text" }),
    applications.createIndex({ tuitionId: 1, studentEmail: 1 }, { unique: true }),
    applications.createIndex({ studentEmail: 1, appliedAt: -1 }),
    applications.createIndex({ tutorEmail: 1, status: 1 }),
    applications.createIndex({ status: 1 }),
    payments.createIndex({ stripeSessionId: 1 }, { unique: true }),
    payments.createIndex({ transactionId: 1 }),
    payments.createIndex({ userEmail: 1, paidAt: -1 }),
    payments.createIndex({ paymentStatus: 1 }),
  ]);
}

export async function connectDB() {
  if (db) return db;

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error("MONGODB_URI is missing. Add it to mentor-server/.env");
  }

  client = new MongoClient(uri, {
    serverSelectionTimeoutMS: 15000,
    maxPoolSize: 20,
  });

  await client.connect();
  db = client.db(getDBName());
  await db.command({ ping: 1 });
  await ensureIndexes(db);

  console.log(`MongoDB connected (database: ${getDBName()})`);
  return db;
}

export function getDB() {
  if (!db) throw new Error("Database is not connected yet");
  return db;
}

export function getClient() {
  if (!client) throw new Error("Database is not connected yet");
  return client;
}

export async function closeDB() {
  if (client) {
    await client.close();
    client = null;
    db = null;
  }
}

export function isDBConnected() {
  return Boolean(db);
}
