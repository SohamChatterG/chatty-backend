import { Router } from "express";
const router = Router();
import AuthController from "../controller/AuthController.js";
import authMiddleware from "../middlewares/AuthMiddlewares.js";
import ChatGroupController from "../controller/ChatGroupController.js";
import ChatGroupUserController from "../controller/ChatGroupUserController.js";
import ChatsController from "../controller/ChatsController.js";
import MessageReactionsController from "../controller/MessageReactionsController.js";
import JoinRequestController from "../controller/JoinRequestController.js";
import { upload } from "../config/multer.config.js";
import encryptionRoutes from "./encryptionRoutes.js";

router.post("/auth/login", AuthController.login);

// Encryption routes
router.use("/encryption", encryptionRoutes);

// Chat group routes
router.post("/chat-group", authMiddleware, ChatGroupController.store);
router.get("/chat-group", authMiddleware, ChatGroupController.index);
router.get("/chat-group/:id", ChatGroupController.show);
router.put("/chat-group/:id", authMiddleware, ChatGroupController.update);
router.delete("/chat-group/:id", authMiddleware, ChatGroupController.destroy);

// chat group users
router.get("/chat-group-users", ChatGroupUserController.index);
router.post("/chat-group-users", authMiddleware, ChatGroupUserController.store);
router.post("/chat-group-users/make-admin", authMiddleware, ChatGroupUserController.updateAdminStatus);
router.delete("/chat-group-users/remove-user", authMiddleware, ChatGroupUserController.removeUser);
router.post("/chat-group-users/mute-user", authMiddleware, ChatGroupUserController.muteUser);
router.post("/chat-group-users/ban-user", authMiddleware, ChatGroupUserController.banUser);

// Join requests (for public groups)
router.post("/join-requests", authMiddleware, JoinRequestController.createRequest);
router.get("/join-requests/:group_id", authMiddleware, JoinRequestController.getPendingRequests);
router.post("/join-requests/:request_id/approve", authMiddleware, JoinRequestController.approveRequest);
router.post("/join-requests/:request_id/reject", authMiddleware, JoinRequestController.rejectRequest);
router.get("/join-requests/:group_id/status", authMiddleware, JoinRequestController.checkRequestStatus);
router.get("/membership/:group_id", authMiddleware, JoinRequestController.checkMembership);

// chats messages
router.get("/chats/:groupId", ChatsController.index);
router.get("/chats/:messageId/thread", ChatsController.getThread);
router.put("/chats/:id", ChatsController.update);
router.delete("/chats/:id", ChatsController.destroy);
router.get("/chats-search", ChatsController.search);

// File upload (Cloudinary)
router.post("/chats/upload", upload.single("file"), ChatsController.uploadFile);
router.post("/chats/voice", upload.single("file"), ChatsController.uploadVoice);

// Read receipts
router.post("/chats/read", ChatsController.markAsRead);

// Message forwarding
router.post("/chats/forward", authMiddleware, ChatsController.forwardMessage);

// Message pinning
router.post("/chats/pin", authMiddleware, ChatsController.pinMessage);
router.post("/chats/unpin", authMiddleware, ChatsController.unpinMessage);
router.get("/chats/:groupId/pinned", ChatsController.getPinnedMessages);

// Message reactions
router.post("/reactions", MessageReactionsController.addReaction);
router.delete("/reactions", MessageReactionsController.removeReaction);
router.get("/reactions/:message_id", MessageReactionsController.getReactions);

// User status
router.post("/users/status", AuthController.updateStatus);
router.get("/users/:userId/status", AuthController.getStatus);

export default router;