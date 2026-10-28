import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import { prisma } from "../../config/database";
import zod = require("zod");
import success = require("zod");

const app = express();

const PORT = Number(process.env.PORT) || 5000;

app.use(helmet());

app.use(
  cors({
    origin: process.env.CLIENR_URL || "http://localhost:5173",
  }),
);

app.use(express.json());

app.get("/",(_req, res)=> {
  res.json({
    success: true,
    message: "Welcome to the BoardMate API",
  });
});

app.get("/api/v1/health",(_req,res)=>{
  res.json({
    success:true,
    message: "BoardMate API is running",
  });
});

app.get("/api/v1/health/database", async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;

    res.json({
      success: true,
      message: "Database connection successful",
      database: "PostgreSQL",
    });
  } catch (error) {
    console.error("Database health check failed:", error);

    res.status(503).json({
      success: false,
      message: "Database connection failed",
    });
  }
});

const server = app.listen(PORT, () => {
  console.log(`🚀 BoardMate API running at http://localhost:${PORT}`);
});

async function shutdown() {
  console.log("Shutting down BoardMate API...");

  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
}