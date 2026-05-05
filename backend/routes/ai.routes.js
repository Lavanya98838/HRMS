import express from "express";
import { chat } from "../controllers/ai.controller.js";
import { verifyToken } from "../middleware/verifyToken.js";

const router = express.Router();
router.use(verifyToken);
router.post("/chat", chat);

export default router;