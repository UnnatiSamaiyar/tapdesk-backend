// migrate.js
const mongoose = require('mongoose');

const OLD_MONGO_URL = 'mongodb+srv://...';
const MONGO_URL = 'mongodb+srv://...';

async function migrateData() {
  const oldConnection = await mongoose.createConnection(OLD_MONGO_URL, { useNewUrlParser: true, useUnifiedTopology: true });
  const newConnection = await mongoose.createConnection(MONGO_URL, { useNewUrlParser: true, useUnifiedTopology: true });

  const collections = await oldConnection.db.listCollections().toArray();

  for (const coll of collections) {
    const collName = coll.name;
    console.log(`Migrating collection: ${collName}`);

    const OldModel = oldConnection.model(collName, new mongoose.Schema({}, { strict: false }));
    const NewModel = newConnection.model(collName, new mongoose.Schema({}, { strict: false }));

    const docs = await OldModel.find({});
    if (docs.length) {
      await NewModel.insertMany(docs);
      console.log(`✅ Copied ${docs.length} docs from ${collName}`);
    } else {
      console.log(`⚠️ No documents found in ${collName}`);
    }
  }

  await oldConnection.close();
  await newConnection.close();
  console.log('✅ Migration complete!');
}

module.exports = migrateData;
