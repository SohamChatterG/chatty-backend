import { Request, Response } from "express";
import prisma from "../config/db.config.js";
import { v2 as cloudinary } from "cloudinary";
import { UploadApiResponse } from "cloudinary";
import multer from "multer";

// Extend Express Request to include file from multer
interface MulterRequest extends Request {
    file?: multer.File;
}

// Get user profile
export async function getProfile(req: Request, res: Response) {
    try {
        const userId = req.user?.id;

        if (!userId) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        const user = await prisma.user.findUnique({
            where: { id: Number(userId) },
            select: {
                id: true,
                name: true,
                email: true,
                image: true,
                profile_image: true,
                about: true,
                created_at: true,
                last_seen: true,
                is_online: true,
            },
        });

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        return res.status(200).json({
            message: "Profile fetched successfully",
            data: user,
        });
    } catch (error) {
        console.error("Error fetching profile:", error);
        return res.status(500).json({ message: "Server error" });
    }
}

// Update user profile (name, about)
export async function updateProfile(req: Request, res: Response) {
    try {
        const userId = req.user?.id;
        const { name, about } = req.body;

        if (!userId) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        const updateData: { name?: string; about?: string } = {};

        if (name && name.trim()) {
            updateData.name = name.trim();
        }

        if (about !== undefined) {
            updateData.about = about.trim();
        }

        const user = await prisma.user.update({
            where: { id: Number(userId) },
            data: updateData,
            select: {
                id: true,
                name: true,
                email: true,
                image: true,
                profile_image: true,
                about: true,
            },
        });

        return res.status(200).json({
            message: "Profile updated successfully",
            data: user,
        });
    } catch (error) {
        console.error("Error updating profile:", error);
        return res.status(500).json({ message: "Server error" });
    }
}

// Upload profile picture
export async function uploadProfilePicture(req: MulterRequest, res: Response) {
    try {
        const userId = req.user?.id;

        if (!userId) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        const file = req.file;

        if (!file) {
            return res.status(400).json({ message: "No file uploaded" });
        }

        // Get current user to check for existing profile image
        const currentUser = await prisma.user.findUnique({
            where: { id: Number(userId) },
            select: { profile_image: true },
        });

        // Delete old profile image from cloudinary if exists
        if (currentUser?.profile_image) {
            try {
                // Extract public_id from the URL
                const urlParts = currentUser.profile_image.split('/');
                const filenameWithExt = urlParts[urlParts.length - 1];
                const filename = filenameWithExt.split('.')[0];
                const folder = urlParts[urlParts.length - 2];
                const publicId = `${folder}/${filename}`;
                
                await cloudinary.uploader.destroy(publicId);
            } catch (deleteError) {
                console.error("Error deleting old profile image:", deleteError);
            }
        }

        // Upload to cloudinary using buffer (memory storage)
        const result: UploadApiResponse = await new Promise((resolve, reject) => {
            const uploadStream = cloudinary.uploader.upload_stream(
                {
                    folder: "profile_pictures",
                    transformation: [
                        { width: 400, height: 400, crop: "fill", gravity: "face" },
                        { quality: "auto", fetch_format: "auto" },
                    ],
                },
                (error, result) => {
                    if (error) reject(error);
                    else resolve(result as UploadApiResponse);
                }
            );
            uploadStream.end(file.buffer);
        });

        // Update user with new profile image URL
        const user = await prisma.user.update({
            where: { id: Number(userId) },
            data: { profile_image: result.secure_url },
            select: {
                id: true,
                name: true,
                email: true,
                image: true,
                profile_image: true,
                about: true,
            },
        });

        return res.status(200).json({
            message: "Profile picture uploaded successfully",
            data: user,
        });
    } catch (error) {
        console.error("Error uploading profile picture:", error);
        return res.status(500).json({ message: "Server error" });
    }
}

// Remove profile picture
export async function removeProfilePicture(req: Request, res: Response) {
    try {
        const userId = req.user?.id;

        if (!userId) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        const currentUser = await prisma.user.findUnique({
            where: { id: Number(userId) },
            select: { profile_image: true },
        });

        // Delete from cloudinary if exists
        if (currentUser?.profile_image) {
            try {
                const urlParts = currentUser.profile_image.split('/');
                const filenameWithExt = urlParts[urlParts.length - 1];
                const filename = filenameWithExt.split('.')[0];
                const folder = urlParts[urlParts.length - 2];
                const publicId = `${folder}/${filename}`;
                
                await cloudinary.uploader.destroy(publicId);
            } catch (deleteError) {
                console.error("Error deleting profile image:", deleteError);
            }
        }

        // Update user to remove profile image
        const user = await prisma.user.update({
            where: { id: Number(userId) },
            data: { profile_image: null },
            select: {
                id: true,
                name: true,
                email: true,
                image: true,
                profile_image: true,
                about: true,
            },
        });

        return res.status(200).json({
            message: "Profile picture removed successfully",
            data: user,
        });
    } catch (error) {
        console.error("Error removing profile picture:", error);
        return res.status(500).json({ message: "Server error" });
    }
}
