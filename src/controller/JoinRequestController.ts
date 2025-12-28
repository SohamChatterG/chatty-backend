import { Request, Response } from "express";
import prisma from "../config/db.config.js";

class JoinRequestController {
    // Create a join request (for public groups)
    static async createRequest(req: Request, res: Response) {
        try {
            const { group_id, name } = req.body;
            const user_id = req.user?.id;

            // Check if group exists and is public
            const group = await prisma.chatGroup.findUnique({
                where: { id: group_id },
            });

            if (!group) {
                return res.status(404).json({ message: "Group not found" });
            }

            if (!group.is_public) {
                return res.status(400).json({
                    message: "This is a private group. Please use passcode to join."
                });
            }

            // Check if user is already a member
            const existingMember = await prisma.groupUsers.findFirst({
                where: {
                    group_id,
                    OR: [
                        { user_id: user_id },
                        { name: name }
                    ]
                },
            });

            if (existingMember) {
                return res.status(400).json({
                    message: "You are already a member of this group"
                });
            }

            // Check if there's already a pending request
            const existingRequest = await prisma.joinRequest.findFirst({
                where: {
                    group_id,
                    user_id: user_id || null,
                    status: "pending",
                },
            });

            if (existingRequest) {
                return res.status(400).json({
                    message: "You already have a pending join request for this group"
                });
            }

            // Create join request
            const joinRequest = await prisma.joinRequest.create({
                data: {
                    group_id,
                    user_id: user_id || null,
                    name,
                    status: "pending",
                },
            });

            return res.status(201).json({
                message: "Join request submitted. Waiting for admin approval.",
                data: joinRequest,
            });
        } catch (error) {
            console.error("Error creating join request:", error);
            return res.status(500).json({
                message: "Something went wrong, please try again",
            });
        }
    }

    // Get pending join requests for a group (admin only)
    static async getPendingRequests(req: Request, res: Response) {
        try {
            const { group_id } = req.params;
            const user_id = req.user?.id;

            // Check if user is admin of the group
            const isAdmin = await prisma.groupUsers.findFirst({
                where: {
                    group_id,
                    user_id,
                    OR: [{ is_admin: true }, { is_owner: true }],
                },
            });

            // Also check if user is the group creator
            const group = await prisma.chatGroup.findUnique({
                where: { id: group_id },
            });

            if (!isAdmin && group?.user_id !== user_id) {
                return res.status(403).json({
                    message: "Only admins can view join requests"
                });
            }

            const requests = await prisma.joinRequest.findMany({
                where: {
                    group_id,
                    status: "pending",
                },
                include: {
                    user: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                            image: true,
                        },
                    },
                },
                orderBy: {
                    created_at: "desc",
                },
            });

            return res.json({ data: requests });
        } catch (error) {
            console.error("Error fetching join requests:", error);
            return res.status(500).json({
                message: "Something went wrong, please try again",
            });
        }
    }

    // Approve a join request (admin only)
    static async approveRequest(req: Request, res: Response) {
        try {
            const { request_id } = req.params;
            const user_id = req.user?.id;

            const joinRequest = await prisma.joinRequest.findUnique({
                where: { id: Number(request_id) },
                include: { group: true },
            });

            if (!joinRequest) {
                return res.status(404).json({ message: "Join request not found" });
            }

            // Check if user is admin of the group
            const isAdmin = await prisma.groupUsers.findFirst({
                where: {
                    group_id: joinRequest.group_id,
                    user_id,
                    OR: [{ is_admin: true }, { is_owner: true }],
                },
            });

            if (!isAdmin && joinRequest.group.user_id !== user_id) {
                return res.status(403).json({
                    message: "Only admins can approve join requests"
                });
            }

            // Create group user
            const groupUser = await prisma.groupUsers.create({
                data: {
                    group_id: joinRequest.group_id,
                    user_id: joinRequest.user_id,
                    name: joinRequest.name,
                    is_admin: false,
                    is_owner: false,
                },
            });

            // Update request status
            await prisma.joinRequest.update({
                where: { id: Number(request_id) },
                data: { status: "approved" },
            });

            return res.json({
                message: "Join request approved",
                data: groupUser,
            });
        } catch (error) {
            console.error("Error approving join request:", error);
            return res.status(500).json({
                message: "Something went wrong, please try again",
            });
        }
    }

    // Reject a join request (admin only)
    static async rejectRequest(req: Request, res: Response) {
        try {
            const { request_id } = req.params;
            const user_id = req.user?.id;

            const joinRequest = await prisma.joinRequest.findUnique({
                where: { id: Number(request_id) },
                include: { group: true },
            });

            if (!joinRequest) {
                return res.status(404).json({ message: "Join request not found" });
            }

            // Check if user is admin of the group
            const isAdmin = await prisma.groupUsers.findFirst({
                where: {
                    group_id: joinRequest.group_id,
                    user_id,
                    OR: [{ is_admin: true }, { is_owner: true }],
                },
            });

            if (!isAdmin && joinRequest.group.user_id !== user_id) {
                return res.status(403).json({
                    message: "Only admins can reject join requests"
                });
            }

            // Update request status
            await prisma.joinRequest.update({
                where: { id: Number(request_id) },
                data: { status: "rejected" },
            });

            return res.json({ message: "Join request rejected" });
        } catch (error) {
            console.error("Error rejecting join request:", error);
            return res.status(500).json({
                message: "Something went wrong, please try again",
            });
        }
    }

    // Check if user has a pending request for a group
    static async checkRequestStatus(req: Request, res: Response) {
        try {
            const { group_id } = req.params;
            const user_id = req.user?.id;

            const request = await prisma.joinRequest.findFirst({
                where: {
                    group_id,
                    user_id: user_id || null,
                },
                orderBy: {
                    created_at: "desc",
                },
            });

            return res.json({
                data: request,
                status: request?.status || null,
            });
        } catch (error) {
            console.error("Error checking request status:", error);
            return res.status(500).json({
                message: "Something went wrong, please try again",
            });
        }
    }

    // Check if user is a member of a group
    static async checkMembership(req: Request, res: Response) {
        try {
            const { group_id } = req.params;
            const user_id = req.user?.id;

            // Check if user is a member
            const member = await prisma.groupUsers.findFirst({
                where: {
                    group_id,
                    user_id,
                },
            });

            // Also get the group info
            const group = await prisma.chatGroup.findUnique({
                where: { id: group_id },
            });

            if (!group) {
                return res.status(404).json({ message: "Group not found" });
            }

            return res.json({
                isMember: !!member,
                isOwner: group.user_id === user_id,
                isAdmin: member?.is_admin || false,
                group: {
                    id: group.id,
                    title: group.title,
                    is_public: group.is_public,
                    has_passcode: !!group.passcode,
                },
                member,
            });
        } catch (error) {
            console.error("Error checking membership:", error);
            return res.status(500).json({
                message: "Something went wrong, please try again",
            });
        }
    }
}

export default JoinRequestController;
