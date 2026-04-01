import cors from "cors";
import dotenv from "dotenv";
import express, { Request, Response } from "express";
import { authenticate } from "./middleware/auth.middleware";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Example protected route
app.get(
  "/api/protected",
  authenticate,
  (req: Request & { user?: any }, res: Response) => {
    res.json({ message: "This is a protected route", user: req.user });
  },
);

// Example public route
app.get("/api/health", (req, res) => {
  res.json({ status: "OK", timestamp: new Date() });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
