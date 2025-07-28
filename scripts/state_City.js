const fs = require("fs");
const path = require("path");
const { connectToDatabase, closeConnection } = require("../db");

async function seedStatesAndCities() {
  try {
    const { db } = await connectToDatabase();

    const statesCollection = db.collection("states");
    const citiesCollection = db.collection("cities");

    const filePath = path.join(__dirname, "state.json");
    const indiaStates = JSON.parse(fs.readFileSync(filePath, "utf8"));

    for (const state of indiaStates) {
      // Upsert state
      const existingState = await statesCollection.findOne({ name: state.name });
      let stateId;

      if (existingState) {
        stateId = existingState._id;
      } else {
        const stateResult = await statesCollection.insertOne({ name: state.name });
        stateId = stateResult.insertedId;
      }

      // Upsert cities
      const cityDocs = state.cities.map((cityName) => ({
        name: cityName,
        stateId,
      }));

      for (const city of cityDocs) {
        await citiesCollection.updateOne(
          { name: city.name, stateId },
          { $setOnInsert: city },
          { upsert: true }
        );
      }
    }

    console.log("✅ States and cities inserted successfully.");
  } catch (err) {
    console.error("❌ Seeding error:", err);
  } finally {
    await closeConnection();
  }
}

seedStatesAndCities();
