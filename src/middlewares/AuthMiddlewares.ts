import jwt from "jsonwebtoken"

import { Request, Response, NextFunction } from "express"

const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
    console.log("headers", req.headers)
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).json({ message: "Unauthorized" })
    }
    const token = authHeader.split(' ')[1];
    console.log("auth mid")
    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) {
            console.log("error in verification", err)
            return res.status(401).json({ message: "Unauthorized" });

        }
        req.user = user as AuthUser;
        
        next()
    })
}

export default authMiddleware;