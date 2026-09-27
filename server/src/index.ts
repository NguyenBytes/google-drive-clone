import express from "express";
import process from "node:process";
import cors from "cors";
import router from "./routes.js";

try {
	process.loadEnvFile();
} catch (error) {
	if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
}

const port = Number(process.env.PORT) || 3000;
const app = express();
const allowedOrigins = (process.env.CORS_ORIGIN ?? "http://localhost:5173")
	.split(",")
	.map((origin) => origin.trim())
	.filter(Boolean);

app.use(cors({
	origin: allowedOrigins,
	methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
	allowedHeaders: ["Content-Type", "Authorization"],
	optionsSuccessStatus: 204,
}));

app.use(express.json({ limit: "25mb" }));
app.use("/api/v1", router);

const server = app.listen(port, () => {
	console.log(`Server listening on port ${port}`);
});

const shutdown = (signal: string) => {
	console.log(`${signal} received; closing server`);
	server.close(() => process.exit(0));
};

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
