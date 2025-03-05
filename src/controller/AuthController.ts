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
            let JWTPayload = {
                name: body.name,
                email: body.email,
                id: findUser.id
            }
            const token = jwt.sign(JWTPayload, process.env.JWT_SECRET, {
                expiresIn: "36h"
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
}

export default AuthController