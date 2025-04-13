import { Router } from "express";
const router = Router();
import AuthController from "../controller/AuthController.js"
import authMiddleware from "../middlewares/AuthMiddlewares.js";
import ChatGroupController from "../controller/ChatGroupController.js";
import ChatGroupUserController from "../controller/ChatGroupUserController.js";
import ChatsController from "../controller/ChatsController.js";


router.post("/auth/login", AuthController.login);


// Chat group routes
router.post("/chat-group", authMiddleware, ChatGroupController.store);
router.get("/chat-group", authMiddleware, ChatGroupController.index);
router.get("/chat-group/:id", ChatGroupController.show)
router.put("/chat-group/:id", authMiddleware, ChatGroupController.update)
router.delete("/chat-group/:id", authMiddleware, ChatGroupController.destroy)

// chat group users 
router.get("/chat-group-users", ChatGroupUserController.index);
router.post("/chat-group-users", authMiddleware, ChatGroupUserController.store);
router.post("/chat-group-users/make-admin", authMiddleware, ChatGroupUserController.updateAdminStatus);
router.delete("/chat-group-users/remove-user", authMiddleware, ChatGroupUserController.removeUser);

// chats messages
router.get("/chats/:groupId", ChatsController.index);

export default router