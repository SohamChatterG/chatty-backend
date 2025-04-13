import { Request, Response } from "express"
import prisma from "../config/db.config.js";

interface GroupUserType {
    name: string,
    group_id: string
}
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

            // Get the group details
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

            // Step 1: Check if the requesting user is an admin
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
            // Step 3: Update the target user's admin status

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
            console.log("removing user")
            let { group_id, user_id } = req.body;
            user_id = Number(user_id);
            console.log("consoling the user_id", user_id)
            // Check if the request sender is an admin
            const admin = await prisma.groupUsers.findFirst({
                where: { group_id, user_id: req.user?.id, is_admin: true },
            });

            if (!admin) {
                console.log("\n u r not admin\n")
                return res.status(403).json({ message: "Only admins can remove users" });
            }

            // Remove the user from the group
            await prisma.groupUsers.deleteMany({
                where: { group_id, id: user_id },
            });

            return res.json({ message: "User removed successfully" });
        } catch (error) {
            console.log(error)
            return res.status(500).json({ message: "Something went wrong, please try again" });
        }
    }


}

export default ChatGroupUserController