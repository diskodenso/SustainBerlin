import { MongoClient, ObjectId } from "mongodb";
import 'dotenv/config';

// Credentials aus .env Datei laden (nicht im Git!)
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
// USER CRUD FUNCTIONS
// ===========================

export const findOneUser = async function (uNameIn, passwdIn) {
  const client = new MongoClient(uri);
  console.log("DB: " + uNameIn + "," + passwdIn);
  try {
    const database = client.db(db_name);
    const users = database.collection(users_collection);
    const query = { username: uNameIn, password: passwdIn };
    const doc = await users.findOne(query);
    if (doc) {
      delete doc.password;
    }
    return doc;
  } finally {
    // Ensures that the client will close when finished and on error
    await client.close();
  }
};

export const findAllUsers = async function () {
  const client = new MongoClient(uri);
  try {
    const database = client.db(db_name);
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
  } finally {
    // Ensures that the client will close when finished and on error
    await client.close();
  }
};

// ===========================
// LOCATION CRUD FUNCTIONS
// ===========================

// GET /loc - Alle Standorte abrufen
export const findAllLocations = async function () {
  const client = new MongoClient(uri);
  try {
    const database = client.db(db_name);
    const locations = database.collection(locations_collection);
    const cursor = locations.find({});
    const docs = await cursor.toArray();
    return docs;
  } finally {
    await client.close();
  }
};

// GET /loc/:id - Einzelnen Standort abrufen
export const findLocationById = async function (id) {
  const client = new MongoClient(uri);
  try {
    const database = client.db(db_name);
    const locations = database.collection(locations_collection);
    const query = { _id: new ObjectId(id) };
    const doc = await locations.findOne(query);
    return doc;
  } finally {
    await client.close();
  }
};

// POST /loc - Neuen Standort anlegen
export const insertLocation = async function (location) {
  const client = new MongoClient(uri);
  try {
    const database = client.db(db_name);
    const locations = database.collection(locations_collection);
    const result = await locations.insertOne(location);
    return result.insertedId;
  } finally {
    await client.close();
  }
};

// PUT /loc/:id - Standort aktualisieren
export const updateLocation = async function (id, location) {
  const client = new MongoClient(uri);
  try {
    const database = client.db(db_name);
    const locations = database.collection(locations_collection);
    // Entferne _id aus dem Update-Objekt falls vorhanden
    const { _id, ...updateData } = location;
    const result = await locations.updateOne(
      { _id: new ObjectId(id) },
      { $set: updateData }
    );
    return result.modifiedCount > 0;
  } finally {
    await client.close();
  }
};

// DELETE /loc/:id - Standort löschen
export const deleteLocation = async function (id) {
  const client = new MongoClient(uri);
  try {
    const database = client.db(db_name);
    const locations = database.collection(locations_collection);
    const result = await locations.deleteOne({ _id: new ObjectId(id) });
    return result.deletedCount > 0;
  } finally {
    await client.close();
  }
};