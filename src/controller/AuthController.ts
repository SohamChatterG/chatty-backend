import prisma from "../config/db.config.js";
import { Request, Response } from "express";
import jwt from "jsonwebtoken"

interface LoginPlayloadType {
    name: string;
    email: string;
    provider: string;
    oauth_id: string;
    image?: string
}
class AuthController {
    static async login(request: Request, response: Response) {
        try {
            const body: LoginPlayloadType = request.body;
            let findUser = await prisma.user.findUnique({
                where: {
                    email: body.email
                }
            })
            if (!findUser) {
                findUser = await prisma.user.create({
                    data: body
                })
            }

            // Update user as online
            await prisma.user.update({
                where: { id: findUser.id },
                data: {
                    is_online: true,
                    last_seen: new Date(),
                }
            });

            let JWTPayload = {
                name: body.name,
                email: body.email,
                id: findUser.id
            }
            const token = jwt.sign(JWTPayload, process.env.JWT_SECRET, {
                expiresIn: "365d"
            })
            return response.json({
                message: "logged in succesfully",
                user: {
                    ...findUser,
                    token: `Bearer ${token}`
                }
            })
        } catch (error) {
            console.error('Login error:', error);

            if (error instanceof Error) {
                return response.status(500).json({
                    message: error.message
                });
            }
            return response.status(500).json({
                message: "Something went wrong. Please try again!"
            })
        }
    }

    // Update user online/offline status
    static async updateStatus(request: Request, response: Response) {
        try {
            const { userId, isOnline } = request.body;

            if (!userId) {
                return response.status(400).json({ message: "User ID is required" });
            }

            await prisma.user.update({
                where: { id: parseInt(userId) },
                data: {
                    is_online: isOnline,
                    last_seen: new Date(),
                }
            });

            return response.json({ message: "Status updated successfully" });
        } catch (error) {
            console.error('Update status error:', error);
            return response.status(500).json({
                message: "Something went wrong. Please try again!"
            });
        }
    }

    // Get user status
    static async getStatus(request: Request, response: Response) {
        try {
            const { userId } = request.params;

            const user = await prisma.user.findUnique({
                where: { id: parseInt(userId) },
                select: {
                    id: true,
                    name: true,
                    is_online: true,
                    last_seen: true,
                }
            });

            if (!user) {
                return response.status(404).json({ message: "User not found" });
            }

            return response.json({ data: user });
        } catch (error) {
            console.error('Get status error:', error);
            return response.status(500).json({
                message: "Something went wrong. Please try again!"
            });
        }
    }
}

export default AuthController