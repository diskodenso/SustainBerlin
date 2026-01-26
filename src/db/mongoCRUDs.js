import { MongoClient, ObjectId } from "mongodb";
import 'dotenv/config';

// Credentials from .env file (not in Git!)
const db_user = process.env.DB_USER;
const db_pass = process.env.DB_PASS;
const db_name = process.env.DB_NAME;

// Collection names
const users_collection = 'users';
const locations_collection = 'locations';

const dbHostname = process.env.DB_HOST || "mongodb1.f4.htw-berlin.de";
const dbPort = process.env.DB_PORT || 27017;
const uri = `mongodb://${db_user}:${db_pass}@${dbHostname}:${dbPort}/${db_name}`;

// ===========================
// CONNECTION POOL (Singleton Pattern)
// ===========================
let cachedDb = null;

/**
 * Establishes or returns cached MongoDB database connection
 * This implements connection pooling - the connection is reused across requests
 * @returns {Promise<Db>} MongoDB database instance
 */
async function connectToDatabase() {
  if (cachedDb) {
    console.log('Using cached database connection');
    return cachedDb;
  }

  console.log('Creating new database connection');
  const client = new MongoClient(uri);
  await client.connect();
  cachedDb = client.db(db_name);

  return cachedDb;
}

// ===========================
// USER CRUD FUNCTIONS
// ===========================

export const findOneUser = async function (uNameIn, passwdIn) {
  console.log("DB: " + uNameIn + "," + passwdIn);
  const database = await connectToDatabase();
  const users = database.collection(users_collection);
  const query = { username: uNameIn, password: passwdIn };
  const doc = await users.findOne(query);
  if (doc) {
    delete doc.password;
  }
  return doc;
};

export const findAllUsers = async function () {
  const database = await connectToDatabase();
  const users = database.collection(users_collection);
  const query = {};
  const cursor = users.find(query);
  // Print a message if no documents were found
  if ((await users.countDocuments(query)) === 0) {
    console.log("No documents found!");
    return null;
  }
  let docs = new Array();
  for await (const doc of cursor) {
    delete doc.password;
    docs.push(doc);
  }
  return docs;
};

// ===========================
// LOCATION CRUD FUNCTIONS
// ===========================

// GET /loc - Get all locations
export const findAllLocations = async function () {
  const database = await connectToDatabase();
  const locations = database.collection(locations_collection);
  const cursor = locations.find({});
  const docs = await cursor.toArray();
  return docs;
};

// GET /loc/:id - Get single location
export const findLocationById = async function (id) {
  const database = await connectToDatabase();
  const locations = database.collection(locations_collection);
  const query = { _id: ObjectId.createFromHexString(id) };
  const doc = await locations.findOne(query);
  return doc;
};

// POST /loc - Create new location
export const insertLocation = async function (location) {
  const database = await connectToDatabase();
  const locations = database.collection(locations_collection);
  const result = await locations.insertOne(location);
  return result.insertedId;
};

// PUT /loc/:id - Update location
export const updateLocation = async function (id, location) {
  const database = await connectToDatabase();
  const locations = database.collection(locations_collection);
  // Remove _id from update object if present
  const { _id, ...updateData } = location;
  const result = await locations.updateOne(
    { _id: ObjectId.createFromHexString(id) },
    { $set: updateData }
  );
  return result.modifiedCount > 0;
};

// DELETE /loc/:id - Delete location
export const deleteLocation = async function (id) {
  const database = await connectToDatabase();
  const locations = database.collection(locations_collection);
  const result = await locations.deleteOne({ _id: ObjectId.createFromHexString(id) });
  return result.deletedCount > 0;
};