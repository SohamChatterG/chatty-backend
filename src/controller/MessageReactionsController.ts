import { Request, Response } from "express";
import prisma from "../config/db.config.js";

class MessageReactionsController {
    // Add a reaction to a message
    static async addReaction(req: Request, res: Response) {
        try {
            const { message_id, emoji, user_name, user_id } = req.body;

            if (!message_id || !emoji || !user_name) {
                return res.status(400).json({
                    message: "Message ID, emoji, and user name are required",
                });
            }

            // Check if message exists
            const message = await prisma.chats.findUnique({
                where: { id: message_id },
            });

            if (!message) {
                return res.status(404).json({ message: "Message not found" });
            }

            // Add or update reaction (upsert)
            const reaction = await prisma.messageReactions.upsert({
                where: {
                    message_id_user_name_emoji: {
                        message_id,
                        user_name,
                        emoji,
                    },
                },
                update: {},
                create: {
                    message_id,
                    user_name,
                    user_id: user_id || null,
                    emoji,
                },
            });

            return res.json({
                message: "Reaction added successfully",
                data: reaction,
            });
        } catch (error) {
            console.error("Error adding reaction:", error);
            return res.status(500).json({
                message: "Something went wrong, please try again",
            });
        }
    }

    // Remove a reaction from a message
    static async removeReaction(req: Request, res: Response) {
        try {
            const { message_id, emoji, user_name } = req.body;

            if (!message_id || !emoji || !user_name) {
                return res.status(400).json({
                    message: "Message ID, emoji, and user name are required",
                });
            }

            await prisma.messageReactions.delete({
                where: {
                    message_id_user_name_emoji: {
                        message_id,
                        user_name,
                        emoji,
                    },
                },
            });

            return res.json({ message: "Reaction removed successfully" });
        } catch (error) {
            console.error("Error removing reaction:", error);
            return res.status(500).json({
                message: "Something went wrong, please try again",
            });
        }
    }

    // Get all reactions for a message
    static async getReactions(req: Request, res: Response) {
        try {
            const { message_id } = req.params;

            const reactions = await prisma.messageReactions.findMany({
                where: { message_id },
                orderBy: { created_at: "asc" },
            });

            // Group reactions by emoji
            const groupedReactions = reactions.reduce((acc: any, reaction) => {
                if (!acc[reaction.emoji]) {
                    acc[reaction.emoji] = {
                        emoji: reaction.emoji,
                        count: 0,
                        users: [],
                    };
                }
                acc[reaction.emoji].count++;
                acc[reaction.emoji].users.push(reaction.user_name);
                return acc;
            }, {});

            return res.json({
                data: Object.values(groupedReactions),
            });
        } catch (error) {
            console.error("Error fetching reactions:", error);
            return res.status(500).json({
                message: "Something went wrong, please try again",
            });
        }
    }
}

export default MessageReactionsController;
