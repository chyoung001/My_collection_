import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { pingDB } from "./utils/db.js";
import cardsRouter from "./service/cards.js";
import gradingRouter from "./service/grading.js";
import dashboardRouter from "./service/dashboard.js";
import marketRouter from "./service/market.js";
import snapshotsRouter from "./service/snapshots.js";
import swaggerUi from "swagger-ui-express";
import { swaggerSpec } from "./swagger.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

app.use("/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.get("/", (_req, res) => {
  res.redirect("/docs");
});

app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.use("/api/cards", cardsRouter);
app.use("/api/grading", gradingRouter);
app.use("/api/dashboard", dashboardRouter);
app.use("/api/market", marketRouter);
app.use("/api/snapshots", snapshotsRouter);

async function start() {
  try {
    await pingDB();
    console.log("[my_collection_backend] DB 연결 성공");
  } catch (err) {
    console.error("[my_collection_backend] DB 연결 실패:", err.message);
  }
  app.listen(PORT, () => {
    console.log(`[my_collection_backend] listening on port ${PORT}`);
  });
}

start();

