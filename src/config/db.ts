import dotenv from "dotenv";
import { connect, connection } from "mongoose";

dotenv.config();

const connectDB = async (): Promise<void> => {
  const { MONGODB_URI } = process.env;

  try {
    await connect(MONGODB_URI as string);
    console.log("MongoDB connected");

    connection.on("connected", () => {
      console.log("Mongoose connected to DB");
    });

    connection.on("error", (err) => {
      console.log("Mongoose connection error:", err);
    });

    connection.on("disconnected", () => {
      console.log("Mongoose disconnected from DB");
    });
  } catch (err) {
    console.error("MongoDB connection error:", err);
    process.exit(1);
  }
};

export default connectDB;
