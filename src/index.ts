import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import { prisma } from "./config/supabase";
import userRoutes from "./routes/user.routes";
import categoryRoutes from "./routes/category.routes";
import productRoutes from "./routes/product.routes";
import orderRoutes from "./routes/order.routes";
import salesRoutes from "./routes/sales.routes"; // Import sales routes

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use("/api/users", userRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/products", productRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/sales", salesRoutes);

// Health check
app.get("/", (req, res) => {
  res.status(200).json({ status: "OK", message: "Server is running" });
});

// Error handling middleware
app.use(
  (
    err: any,
    req: express.Request,
    res: express.Response,
    next: express.NextFunction,
  ) => {
    console.error(err.stack);
    res.status(500).json({ error: "Something went wrong!" });
  },
);

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

// Graceful shutdown
process.on("SIGINT", async () => {
  await prisma.$disconnect();
  console.log("Disconnected from database");
  process.exit(0);
});
