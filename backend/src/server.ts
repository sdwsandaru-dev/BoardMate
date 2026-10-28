import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import { prisma } from "./config/database";
import authRoutes from "./modules/auth/auth.routes.js";
import propertyRoutes from "./modules/properties/property.routes";
import roomRoutes from "./modules/rooms/room.routes";
import imageRoutes from "./modules/images/image.routes";
import favoriteRoutes from "./modules/favorites/favorite.routes";
import bookingRoutes from "./modules/bookings/booking.routes";
import reviewRoutes from "./modules/review/review.routes";
import adminRoutes from "./modules/admin/admin.routes";
import profileRoutes from "./modules/profiles/profile.routes";
import notificationRoutes from "./modules/notifications/notification.routes";
import auditRoutes from "./modules/audit/audit.routes";

const app = express();

const PORT = Number(process.env.PORT) || 5000;

app.use(helmet());

app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173",
  }),
);

app.use(express.json());
app.use("/api/v1/properties", propertyRoutes);
app.use("/api/v1/rooms", roomRoutes);
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/favorites", favoriteRoutes);
app.use("/api/v1/images", imageRoutes);
app.use("/api/v1/bookings", bookingRoutes);
app.use("/api/v1", reviewRoutes);
app.use("/api/v1/admin", adminRoutes);
app.use("/api/v1/profiles", profileRoutes);
app.use("/api/v1/notifications", notificationRoutes);
app.use("/api/v1/admin/audit-logs", auditRoutes);

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

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

