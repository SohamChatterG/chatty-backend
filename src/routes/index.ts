import { Router } from "express";
const router = Router();
import AuthController from "../controller/AuthController.js"
import authMiddleware from "../middlewares/AuthMiddlewares.js";
import ChatGroupController from "../controller/ChatGroupController.js";
router.post("/auth/login", AuthController.login);
router.post("/chat-group", authMiddleware, ChatGroupController.store);
router.get("/chat-group", authMiddleware, ChatGroupController.index);
router.post("/chat-group/:id", authMiddleware, ChatGroupController.show)
router.put("/chat-group/:id", authMiddleware, ChatGroupController.update)
router.delete("/chat-group/:id", authMiddleware, ChatGroupController.destroy)


export default router