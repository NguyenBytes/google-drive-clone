import { Router } from "express";
import { fileController } from "./controllers/file.controller.js";

const router = Router();

router.get("/health", (_request, response) => {
	response.status(200).json({ status: "ok" });
});

// Preserve the controller instance for methods that call other methods.
router.get("/files", fileController.getFiles.bind(fileController));
router.get("/files/presigned-url", fileController.getPresignedDownloadUrl.bind(fileController));
router.get("/files/object", fileController.getFileDownload.bind(fileController));
router.post("/files", fileController.postFile.bind(fileController));
router.post("/files/rename", fileController.postFileRename.bind(fileController));
router.put("/files", fileController.putFile.bind(fileController));
router.delete("/files", fileController.deleteFile.bind(fileController));

export default router;
