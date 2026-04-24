const mongoose = require("mongoose");
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);
const connectDB = async () => {
  mongoose.set("strictQuery", true);
  const mongoUri = process.env.MONGO_URL || process.env.MONGO_URI;
  const conn = await mongoose.connect(mongoUri);
  console.log(`MongoDB Connected: ${conn.connection.host}`);
};
module.exports = connectDB;
