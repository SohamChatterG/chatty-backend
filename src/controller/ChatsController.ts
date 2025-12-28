import { Request, Response } from "express";
import prisma from "../config/db.config.js";
import { uploadToCloudinary, deleteFromCloudinary } from "../config/cloudinary.config.js";

class ChatsController {
    static async index(req: Request, res: Response) {
        console.log("i am being it");
        const { groupId } = req.params;
        const chats = await prisma.chats.findMany({
            where: {
                group_id: groupId,
                deleted_at: null, // Only fetch non-deleted messages
            },
            include: {
                MessageReactions: true, // Include reactions
                MessageReads: true, // Include read receipts
            },
            orderBy: {
                created_at: "asc",
            },
        });

        return res.json({ data: chats });
    }

    // Get thread messages
    static async getThread(req: Request, res: Response) {
        try {
            const { messageId } = req.params;

            const messages = await prisma.chats.findMany({
                where: {
                    parent_message_id: messageId,
                    deleted_at: null,
                },
                include: {
                    MessageReactions: true,
                    MessageReads: true,
                },
                orderBy: {
                    created_at: "asc",
                },
            });

            return res.json({ data: messages });
        } catch (error) {
            console.error("Error fetching thread:", error);
            return res.status(500).json({
                message: "Something went wrong, please try again",
            });
        }
    }

    // Edit a message
    static async update(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const { message, name } = req.body;

            // Check if message exists and belongs to user
            const existingMessage = await prisma.chats.findUnique({
                where: { id },
            });

            if (!existingMessage) {
                return res.status(404).json({ message: "Message not found" });
            }

            if (existingMessage.name !== name) {
                return res.status(403).json({
                    message: "You can only edit your own messages",
                });
            }

            const updatedMessage = await prisma.chats.update({
                where: { id },
                data: {
                    message,
                    edited_at: new Date(),
                },
                include: {
                    MessageReactions: true,
                },
            });

            return res.json({
                message: "Message updated successfully",
                data: updatedMessage,
            });
        } catch (error) {
            console.error("Error updating message:", error);
            return res.status(500).json({
                message: "Something went wrong, please try again",
            });
        }
    }

    // Delete a message (soft delete)
    static async destroy(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const { name } = req.body;

            // Check if message exists and belongs to user
            const existingMessage = await prisma.chats.findUnique({
                where: { id },
            });

            if (!existingMessage) {
                return res.status(404).json({ message: "Message not found" });
            }

            if (existingMessage.name !== name) {
                return res.status(403).json({
                    message: "You can only delete your own messages",
                });
            }

            // Delete file from Cloudinary if exists
            if (existingMessage.file_public_id) {
                const resourceType = existingMessage.file_type === 'video' ? 'video' :
                    existingMessage.file_type === 'voice' || existingMessage.file_type === 'audio' ? 'video' : 'image';
                await deleteFromCloudinary(existingMessage.file_public_id, resourceType);
            }

            await prisma.chats.update({
                where: { id },
                data: {
                    deleted_at: new Date(),
                    message: null, // Clear message content
                },
            });

            return res.json({ message: "Message deleted successfully" });
        } catch (error) {
            console.error("Error deleting message:", error);
            return res.status(500).json({
                message: "Something went wrong, please try again",
            });
        }
    }

    // Search messages in a group
    static async search(req: Request, res: Response) {
        try {
            const { groupId, query } = req.query;

            if (!query || !groupId) {
                return res.status(400).json({
                    message: "Group ID and search query are required",
                });
            }

            const messages = await prisma.chats.findMany({
                where: {
                    group_id: groupId as string,
                    deleted_at: null,
                    message: {
                        contains: query as string,
                        mode: "insensitive",
                    },
                },
                include: {
                    MessageReactions: true,
                },
                orderBy: {
                    created_at: "desc",
                },
                take: 50, // Limit results
            });

            return res.json({ data: messages });
        } catch (error) {
            console.error("Error searching messages:", error);
            return res.status(500).json({
                message: "Something went wrong, please try again",
            });
        }
    }

    // Upload file to Cloudinary
    static async uploadFile(req: Request, res: Response) {
        try {
            const anyReq = req as any;

            if (!anyReq.file) {
                return res.status(400).json({ message: "No file uploaded" });
            }

            const mimeType = anyReq.file.mimetype;
            let resourceType: 'image' | 'video' | 'raw' | 'auto' = 'auto';
            let fileType = 'document';

            if (mimeType.startsWith('image/')) {
                resourceType = 'image';
                fileType = 'image';
            } else if (mimeType.startsWith('video/')) {
                resourceType = 'video';
                fileType = 'video';
            } else if (mimeType.startsWith('audio/')) {
                resourceType = 'video'; // Cloudinary uses video for audio
                fileType = 'audio';
            }

            const result = await uploadToCloudinary(anyReq.file.buffer, {
                folder: 'chat-app/uploads',
                resource_type: resourceType,
            });

            return res.json({
                message: "File uploaded successfully",
                data: {
                    url: result.url,
                    public_id: result.public_id,
                    type: fileType,
                    size: result.bytes,
                    duration: result.duration,
                    originalName: anyReq.file.originalname,
                },
            });
        } catch (error) {
            console.error("Error uploading file:", error);
            return res.status(500).json({
                message: "Something went wrong, please try again",
            });
        }
    }

    // Upload voice message
    static async uploadVoice(req: Request, res: Response) {
        try {
            const anyReq = req as any;

            if (!anyReq.file) {
                return res.status(400).json({ message: "No voice file uploaded" });
            }

            const result = await uploadToCloudinary(anyReq.file.buffer, {
                folder: 'chat-app/voice',
                resource_type: 'video', // Cloudinary uses video for audio
            });

            return res.json({
                message: "Voice message uploaded successfully",
                data: {
                    url: result.url,
                    public_id: result.public_id,
                    type: 'voice',
                    size: result.bytes,
                    duration: result.duration,
                },
            });
        } catch (error) {
            console.error("Error uploading voice:", error);
            return res.status(500).json({
                message: "Something went wrong, please try again",
            });
        }
    }

    // Mark message as read
    static async markAsRead(req: Request, res: Response) {
        try {
            const { messageIds, userId, userName } = req.body;

            if (!messageIds || !userName) {
                return res.status(400).json({
                    message: "Message IDs and user name are required",
                });
            }

            // Create read receipts for all messages
            await prisma.messageRead.createMany({
                data: messageIds.map((messageId: string) => ({
                    message_id: messageId,
                    user_id: userId ? Number(userId) : null,
                    user_name: userName,
                })),
                skipDuplicates: true,
            });

            return res.json({ message: "Messages marked as read" });
        } catch (error) {
            console.error("Error marking messages as read:", error);
            return res.status(500).json({
                message: "Something went wrong, please try again",
            });
        }
    }

    // Forward message
    static async forwardMessage(req: Request, res: Response) {
        try {
            const { messageId, targetGroupId, userName } = req.body;

            // Get original message
            const originalMessage = await prisma.chats.findUnique({
                where: { id: messageId },
            });

            if (!originalMessage) {
                return res.status(404).json({ message: "Message not found" });
            }

            // Create forwarded message
            const forwardedMessage = await prisma.chats.create({
                data: {
                    group_id: targetGroupId,
                    message: originalMessage.message,
                    name: userName,
                    file: originalMessage.file,
                    file_type: originalMessage.file_type,
                    file_size: originalMessage.file_size,
                    file_public_id: originalMessage.file_public_id,
                    duration: originalMessage.duration,
                    forwarded_from: messageId,
                },
                include: {
                    MessageReactions: true,
                },
            });

            return res.json({
                message: "Message forwarded successfully",
                data: forwardedMessage,
            });
        } catch (error) {
            console.error("Error forwarding message:", error);
            return res.status(500).json({
                message: "Something went wrong, please try again",
            });
        }
    }

    // Pin message
    static async pinMessage(req: Request, res: Response) {
        try {
            const { messageId, groupId, userName } = req.body;

            const pinnedMessage = await prisma.pinnedMessage.create({
                data: {
                    message_id: messageId,
                    group_id: groupId,
                    pinned_by: userName,
                },
            });

            return res.json({
                message: "Message pinned successfully",
                data: pinnedMessage,
            });
        } catch (error) {
            console.error("Error pinning message:", error);
            return res.status(500).json({
                message: "Something went wrong, please try again",
            });
        }
    }

    // Unpin message
    static async unpinMessage(req: Request, res: Response) {
        try {
            const { messageId, groupId } = req.body;

            await prisma.pinnedMessage.delete({
                where: {
                    message_id_group_id: {
                        message_id: messageId,
                        group_id: groupId,
                    },
                },
            });

            return res.json({ message: "Message unpinned successfully" });
        } catch (error) {
            console.error("Error unpinning message:", error);
            return res.status(500).json({
                message: "Something went wrong, please try again",
            });
        }
    }

    // Get pinned messages for a group
    static async getPinnedMessages(req: Request, res: Response) {
        try {
            const { groupId } = req.params;

            const pinnedMessages = await prisma.pinnedMessage.findMany({
                where: { group_id: groupId },
                include: {
                    message: {
                        include: {
                            MessageReactions: true,
                        },
                    },
                },
                orderBy: {
                    pinned_at: "desc",
                },
            });

            return res.json({ data: pinnedMessages });
        } catch (error) {
            console.error("Error fetching pinned messages:", error);
            return res.status(500).json({
                message: "Something went wrong, please try again",
            });
        }
    }
}

export default ChatsController;