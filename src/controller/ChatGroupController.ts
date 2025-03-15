import { Request, response, Response } from "express"
import prisma from "../config/db.config.js";

class ChatGroupController {
    static async index(req: Request, res: Response) {
        try {
            const body = req.body;
            const user = req.user;
            const groups = await prisma.chatGroup.findMany({
                // where: {

                //     user_id: user.id
                // },
                orderBy: {
                    created_at: "desc"
                }
            })
            return res.json({ message: "Chat Groups Fetched Succesfully!", data: groups })
        }
        catch (error) {
            return response.status(500).json({
                message: "Something went wrong please try again."
            })
        }
    }
    static async show(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const user = req.user; // Get the authenticated user from req.user

            const group = await prisma.chatGroup.findUnique({
                where: {
                    id: id
                }
            })
            console.log('conosling the group', group)
            // if (!group) {
            //     return res.status(404).json({ message: "Chat Group not found" });
            // }

            // // Public groups can be accessed by anyone
            // if (group.is_public) {
            //     return res.json({ message: "Chat Group Fetched Successfully!", data: group });
            // } else {
            //     // Authorization check for private groups: Is the user a member?
            //     const isMember = await prisma.groupUsers.findFirst({
            //         where: {
            //             group_id: group.id,
            //             group: {
            //                 user_id: user.id // Corrected: Check user_id in ChatGroup
            //             }
            //         },
            //     });

            //     if (isMember) {
            //         return res.json({ message: "Chat Group Fetched Successfully!", data: group });
            //     } else {
            //         return res
            //             .status(403)
            //             .json({ message: "Unauthorized to access this private group" });
            //     }
            // }
            return res.json({ data: group })
        } catch (error) {
            console.error("Error fetching chat group:", error);
            return response.status(500).json({
                message: "Something went wrong please try again.",
            });
        }
    }
    static async store(req: Request, res: Response) {
        try {
            const body = req.body;
            const user = req.user;
            const isPublic = body.is_public; // Get is_public from body
            const passcode = isPublic ? null : body.passcode; // Conditionally set passcode

            const newGroup = await prisma.chatGroup.create({
                data: {
                    title: body.title,
                    passcode: passcode,
                    user_id: user.id,
                    is_public: isPublic,
                },
            });

            return res.json({ message: "Chat Group Created Successfully!" });
        } catch (error) {
            console.error("Error creating chat group:", error);
            return res.status(500).json({
                message: "Something went wrong please try again.",
            });
        }
    }
    static async update(req: Request, res: Response) {
        try {
            const body = req.body;
            const { id } = req.params;
            await prisma.chatGroup.update({
                data: {
                    title: body.title,
                    passcode: body.passcode
                },
                where: {
                    id: id
                }
            })
            return res.json({ message: "Chat Group Updated Succesfully!" })
        }
        catch (error) {
            return response.status(500).json({
                message: "Something went wrong please try again."
            })
        }
    }
    static async destroy(req: Request, res: Response) {
        try {
            const { id } = req.params;
            await prisma.chatGroup.delete({
                where: {
                    id: id
                }
            })
            return res.json({ message: "Chat Group Deleted Succesfully!" })
        }
        catch (error) {
            return response.status(500).json({
                message: "Something went wrong please try again."
            })
        }
    }

}

export default ChatGroupController