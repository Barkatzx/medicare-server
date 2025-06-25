import bodyParser from "body-parser";
import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import connectDB from "./config/db";
import { errorHandler } from "./middlewares/errorHandler";
import userRoutes from "./routes/user.routes"; // ✅ Import the router

dotenv.config();
const app = express();

// Middleware
app.use(cors());
app.use(bodyParser.json());

// ✅ Mount the full router, not individual controllers
app.use("/api/v1/users", userRoutes);

// Default Route
app.get("/", (req, res) => {
  res.send("Hello, this is the Flutter backend for the MediCare App.");
});

// Error Handling
app.use(errorHandler);

// Start Server
const PORT = process.env.PORT || 5000;
connectDB().then(() => {
  app.listen(PORT, () =>
    console.log(`🚀 Server running at http://localhost:${PORT}`)
  );
});
