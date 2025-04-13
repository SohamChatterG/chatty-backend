import { Request, Response } from "express"
import prisma from "../config/db.config.js";
import { Prisma } from "@prisma/client";
// interface GroupUserType {
//     name: string,
//     group_id: string
// }
class ChatGroupUserController {
    static async index(req: Request, res: Response) {
        try {

            const { group_id } = req.query;
            const users = await prisma.groupUsers.findMany({
                where: {
                    group_id: group_id as string
                }
            })
            return res.json({ message: "Data fetched succesfully", data: users });
        }
        catch (error) {
            return res.status(500).json({ message: "Something went wrong please try again" })
        }

    }
    static async store(req: Request, res: Response) {
        try {
            console.log("request initiated")
            const { name, group_id, user_id } = req.body;

            const group = await prisma.chatGroup.findUnique({
                where: { id: group_id },
            });

            if (!group) {
                console.log("no group")
                return res.status(404).json({ message: "Group not found" });
            }
            console.log("group user_id", group.user_id);
            console.log("req user id", req.user?.id)
            // Check if the user is the group creator
            const isCreator = group.user_id === req.user?.id; // Assuming `req.user` contains logged-in user info

            const user = await prisma.groupUsers.create({
                data: {
                    name,
                    group_id,
                    user_id: Number(user_id),
                    is_admin: isCreator,
                },
            });



            return res.json({ message: "User added successfully", data: user });
        } catch (error) {
            console.log("error occured", error)
            return res.status(500).json({ message: "Something went wrong, please try again" });
        }
    }
    static async updateAdminStatus(req: Request, res: Response) {
        try {
            const { groupId, targetId, is_admin, adminId } = req.body;
            // const adminId = req.user?.id;

            const requestingUser = await prisma.groupUsers.findFirst({
                where: {
                    group_id: groupId,
                    user_id: Number(adminId),
                    is_admin: true,
                },
            });

            if (!requestingUser) {
                return res.status(403).json({ message: "Only admins can modify roles" });
            }

            const count = await prisma.groupUsers.updateMany({
                where: {
                    group_id: groupId,
                    id: Number(targetId),
                },
                data: {
                    is_admin: !is_admin,
                },
            });
            console.log("count", count)

            return res.json({
                message: `User ${!is_admin ? "promoted to admin" : "demoted from admin"} successfully`,
            });
        } catch (error) {
            console.error("Error updating admin status:", error);
            return res.status(500).json({
                message: "Something went wrong, please try again",
            });
        }
    }


    static async removeUser(req: Request, res: Response) {
        try {
            const { group_id, targetId, requestedById } = req.body;
            console.log(group_id, "target", targetId, " requestedB", requestedById);

            if (!group_id || !targetId || !requestedById) {
                console.log("missing parameters");
                return res.status(400).json({
                    message: "Missing required parameters: group_id, targetId, or requestedById"
                });
            }

            // Convert IDs to numbers for consistency
            const numericTargetId = Number(targetId);
            const numericRequestedById = Number(requestedById);

            if (numericRequestedById !== req.user?.id) {
                console.log("request doesn't match auth user");
                return res.status(403).json({
                    message: "You can only make requests on your own behalf"
                });
            }

            const requesterRecord = await prisma.groupUsers.findFirst({
                where: {
                    group_id,
                    user_id: numericRequestedById
                },
            });

            if (!requesterRecord) {
                console.log("requester not in group");
                return res.status(403).json({
                    message: "You are not a member of this group"
                });
            }

            const targetRecord = await prisma.groupUsers.findFirst({
                where: {
                    group_id,
                    id: numericTargetId
                },
            });

            if (!targetRecord) {
                console.log("target user not found");
                return res.status(404).json({
                    message: "User not found in this group"
                });
            }

            const isSelfRemoval = targetRecord.user_id === requesterRecord.user_id;
            console.log("isSelfRemoval", isSelfRemoval);

            if (!isSelfRemoval) {
                if (!requesterRecord.is_admin) {
                    console.log("requester is not admin");
                    return res.status(403).json({
                        message: "Only admins can remove other users"
                    });
                }
            }

            await prisma.groupUsers.delete({
                where: {
                    id: targetRecord.id
                }
            });

            return res.json({
                success: true,
                isSelfRemoval,
                message: isSelfRemoval
                    ? "You have left the group successfully"
                    : "User removed successfully"
            });

        } catch (error) {
            console.error("Error in removeUser:", error);

            if (error instanceof Prisma.PrismaClientKnownRequestError) {
                return res.status(500).json({
                    message: "Database error occurred while removing user"
                });
            }

            return res.status(500).json({
                message: "Something went wrong, please try again"
            });
        }
    }
}

export default ChatGroupUserController