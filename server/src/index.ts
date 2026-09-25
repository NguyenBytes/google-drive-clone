import express from "express";
import router from "./routes.js";

const port = Number(process.env.PORT) || 3000;
const app = express();

app.use(express.json({ limit: "25mb" }));
app.use(router);

const server = app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});

const shutdown = (signal: string) => {
  console.log(`${signal} received; closing server`);
  server.close(() => process.exit(0));
};

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
