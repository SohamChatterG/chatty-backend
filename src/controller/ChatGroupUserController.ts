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
            const { name, group_id, user_id } = req.body;

            // Get the group details
            const group = await prisma.chatGroup.findUnique({
                where: { id: group_id },
            });

            if (!group) {
                return res.status(404).json({ message: "Group not found" });
            }

            // Check if the user is the group creator
            const isCreator = group.user_id === req.user?.id; // Assuming `req.user` contains logged-in user info

            const user = await prisma.groupUsers.create({
                data: {
                    name,
                    group_id,
                    user_id: user_id,
                    is_admin: isCreator,
                },
            });



            return res.json({ message: "User added successfully", data: user });
        } catch (error) {
            return res.status(500).json({ message: "Something went wrong, please try again" });
        }
    }
    static async updateAdminStatus(req: Request, res: Response) {
        try {
            const { group_id, user_id, is_admin } = req.body;

            // Check if the request sender is an admin
            const admin = await prisma.groupUsers.findFirst({
                where: { group_id, user_id: req.user?.id, is_admin: true },
            });

            if (!admin) {
                return res.status(403).json({ message: "Only admins can modify roles" });
            }

            // Update the user role
            await prisma.groupUsers.updateMany({
                where: { group_id, user_id },
                data: { is_admin },
            });

            return res.json({ message: `User ${is_admin ? "promoted" : "demoted"} successfully` });
        } catch (error) {
            return res.status(500).json({ message: "Something went wrong, please try again" });
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