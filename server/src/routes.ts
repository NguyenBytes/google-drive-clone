import { Router } from "express";
import {
	createFile,
	deleteFile,
	downloadFile,
	getPresignedDownloadUrl,
	listFiles,
	updateFile,
} from "./controllers/file.controller.js";

const router = Router();

router.get("/health", (_request, response) => {
	response.status(200).json({ status: "ok" });
});

router.get("/files", listFiles);
router.get("/files/presigned-url", getPresignedDownloadUrl);
router.get("/files/object", downloadFile);
router.post("/files", createFile);
router.put("/files", updateFile);
router.delete("/files", deleteFile);

export default router;
