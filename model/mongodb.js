
const { MongoClient, ServerApiVersion } = require("mongodb");

// Define the MongoDB URI based on the environment
const uri = process.env.MONGODB_URI ; // Default to local

const client = new MongoClient(uri, {
  serverApi: ServerApiVersion.v1,
});

// Function to connect to MongoDB and handle errors
async function connectDB() {
  try {
    await client.connect();
    await client.db("admin").command({ ping: 1 });
    // If the ping is successful, log the following message
    console.log("Successfully connected to MongoDB!");
  } catch (error) {
    // If there is an error during connection, log the error message
    console.error("Connection to MongoDB failed:", error);
  }
}

module.exports = { connectDB, client };
