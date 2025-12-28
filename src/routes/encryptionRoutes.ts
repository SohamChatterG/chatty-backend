import { Router, Request, Response } from "express";
import prisma from "../config/db.config.js";

const router = Router();

/**
 * Store or update user's public key
 * POST /api/encryption/public-key
 */
router.post("/public-key", async (req: Request, res: Response) => {
    try {
        const { user_id, public_key } = req.body;

        if (!user_id || !public_key) {
            return res.status(400).json({
                success: false,
                message: "user_id and public_key are required"
            });
        }

        const result = await prisma.userPublicKey.upsert({
            where: { user_id: parseInt(user_id) },
            update: { public_key, updated_at: new Date() },
            create: { user_id: parseInt(user_id), public_key }
        });

        return res.json({
            success: true,
            message: "Public key stored successfully",
            data: { user_id: result.user_id }
        });
    } catch (error) {
        console.error("Error storing public key:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to store public key"
        });
    }
});

/**
 * Get user's public key
 * GET /api/encryption/public-key/:userId
 */
router.get("/public-key/:userId", async (req: Request, res: Response) => {
    try {
        const userId = parseInt(req.params.userId);

        const key = await prisma.userPublicKey.findUnique({
            where: { user_id: userId }
        });

        if (!key) {
            return res.status(404).json({
                success: false,
                message: "Public key not found for this user"
            });
        }

        return res.json({
            success: true,
            data: {
                user_id: key.user_id,
                public_key: key.public_key
            }
        });
    } catch (error) {
        console.error("Error fetching public key:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to fetch public key"
        });
    }
});

/**
 * Get public keys for multiple users
 * POST /api/encryption/public-keys
 */
router.post("/public-keys", async (req: Request, res: Response) => {
    try {
        const { user_ids } = req.body;

        if (!user_ids || !Array.isArray(user_ids)) {
            return res.status(400).json({
                success: false,
                message: "user_ids array is required"
            });
        }

        const keys = await prisma.userPublicKey.findMany({
            where: {
                user_id: { in: user_ids.map((id: string | number) => parseInt(String(id))) }
            }
        });

        return res.json({
            success: true,
            data: keys.map(k => ({
                user_id: k.user_id,
                public_key: k.public_key
            }))
        });
    } catch (error) {
        console.error("Error fetching public keys:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to fetch public keys"
        });
    }
});

/**
 * Enable encryption for a group
 * POST /api/encryption/enable-group
 */
router.post("/enable-group", async (req: Request, res: Response) => {
    try {
        const { group_id, user_id } = req.body;

        if (!group_id || !user_id) {
            return res.status(400).json({
                success: false,
                message: "group_id and user_id are required"
            });
        }

        // Verify user is owner/admin of the group
        const group = await prisma.chatGroup.findUnique({
            where: { id: group_id },
            include: {
                GroupUsers: {
                    where: {
                        user_id: parseInt(user_id),
                        OR: [{ is_admin: true }, { is_owner: true }]
                    }
                }
            }
        });

        if (!group) {
            return res.status(404).json({
                success: false,
                message: "Group not found"
            });
        }

        const isOwner = group.user_id === parseInt(user_id);
        const isAdmin = group.GroupUsers.length > 0;

        if (!isOwner && !isAdmin) {
            return res.status(403).json({
                success: false,
                message: "Only group owner or admin can enable encryption"
            });
        }

        // Enable encryption
        await prisma.chatGroup.update({
            where: { id: group_id },
            data: { is_encrypted: true }
        });

        return res.json({
            success: true,
            message: "Encryption enabled for group"
        });
    } catch (error) {
        console.error("Error enabling encryption:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to enable encryption"
        });
    }
});

/**
 * Store encrypted group key for a user
 * POST /api/encryption/group-key
 */
router.post("/group-key", async (req: Request, res: Response) => {
    try {
        const { group_id, user_id, encrypted_key, key_version = 1 } = req.body;

        if (!group_id || !user_id || !encrypted_key) {
            return res.status(400).json({
                success: false,
                message: "group_id, user_id, and encrypted_key are required"
            });
        }

        const result = await prisma.groupEncryptionKey.upsert({
            where: {
                group_id_user_id: {
                    group_id,
                    user_id: parseInt(user_id)
                }
            },
            update: {
                encrypted_key,
                key_version,
                updated_at: new Date()
            },
            create: {
                group_id,
                user_id: parseInt(user_id),
                encrypted_key,
                key_version
            }
        });

        return res.json({
            success: true,
            message: "Group key stored successfully",
            data: { id: result.id }
        });
    } catch (error) {
        console.error("Error storing group key:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to store group key"
        });
    }
});

/**
 * Store encrypted group keys for multiple users at once
 * POST /api/encryption/group-keys-batch
 */
router.post("/group-keys-batch", async (req: Request, res: Response) => {
    try {
        const { group_id, keys } = req.body;
        // keys should be array of { user_id, encrypted_key }

        if (!group_id || !keys || !Array.isArray(keys)) {
            return res.status(400).json({
                success: false,
                message: "group_id and keys array are required"
            });
        }

        const operations = keys.map((k: { user_id: number | string; encrypted_key: string }) =>
            prisma.groupEncryptionKey.upsert({
                where: {
                    group_id_user_id: {
                        group_id,
                        user_id: parseInt(String(k.user_id))
                    }
                },
                update: {
                    encrypted_key: k.encrypted_key,
                    updated_at: new Date()
                },
                create: {
                    group_id,
                    user_id: parseInt(String(k.user_id)),
                    encrypted_key: k.encrypted_key
                }
            })
        );

        await prisma.$transaction(operations);

        return res.json({
            success: true,
            message: "Group keys stored successfully"
        });
    } catch (error) {
        console.error("Error storing group keys:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to store group keys"
        });
    }
});

/**
 * Get encrypted group key for a user
 * GET /api/encryption/group-key/:groupId/:userId
 */
router.get("/group-key/:groupId/:userId", async (req: Request, res: Response) => {
    try {
        const { groupId, userId } = req.params;

        const key = await prisma.groupEncryptionKey.findUnique({
            where: {
                group_id_user_id: {
                    group_id: groupId,
                    user_id: parseInt(userId)
                }
            }
        });

        if (!key) {
            return res.status(404).json({
                success: false,
                message: "Group key not found"
            });
        }

        // Also get the group creator's public key for decryption
        const group = await prisma.chatGroup.findUnique({
            where: { id: groupId },
            select: { user_id: true }
        });

        let creatorPublicKey = null;
        if (group) {
            const creatorKey = await prisma.userPublicKey.findUnique({
                where: { user_id: group.user_id }
            });
            creatorPublicKey = creatorKey?.public_key;
        }

        return res.json({
            success: true,
            data: {
                encrypted_key: key.encrypted_key,
                key_version: key.key_version,
                creator_public_key: creatorPublicKey
            }
        });
    } catch (error) {
        console.error("Error fetching group key:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to fetch group key"
        });
    }
});

/**
 * Check if user has encryption key for a group
 * GET /api/encryption/has-key/:groupId/:userId
 */
router.get("/has-key/:groupId/:userId", async (req: Request, res: Response) => {
    try {
        const { groupId, userId } = req.params;

        const key = await prisma.groupEncryptionKey.findUnique({
            where: {
                group_id_user_id: {
                    group_id: groupId,
                    user_id: parseInt(userId)
                }
            }
        });

        return res.json({
            success: true,
            data: { has_key: !!key }
        });
    } catch (error) {
        console.error("Error checking group key:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to check group key"
        });
    }
});

/**
 * Rotate group encryption key (admin only)
 * POST /api/encryption/rotate-key
 */
router.post("/rotate-key", async (req: Request, res: Response) => {
    try {
        const { group_id, user_id, new_keys } = req.body;
        // new_keys: array of { user_id, encrypted_key }

        if (!group_id || !user_id || !new_keys) {
            return res.status(400).json({
                success: false,
                message: "group_id, user_id, and new_keys are required"
            });
        }

        // Verify user is owner/admin
        const group = await prisma.chatGroup.findUnique({
            where: { id: group_id },
            include: {
                GroupUsers: {
                    where: {
                        user_id: parseInt(user_id),
                        OR: [{ is_admin: true }, { is_owner: true }]
                    }
                }
            }
        });

        if (!group) {
            return res.status(404).json({
                success: false,
                message: "Group not found"
            });
        }

        const isOwner = group.user_id === parseInt(user_id);
        const isAdmin = group.GroupUsers.length > 0;

        if (!isOwner && !isAdmin) {
            return res.status(403).json({
                success: false,
                message: "Only group owner or admin can rotate keys"
            });
        }

        // Get current max version
        const currentMax = await prisma.groupEncryptionKey.findFirst({
            where: { group_id },
            orderBy: { key_version: 'desc' },
            select: { key_version: true }
        });

        const newVersion = (currentMax?.key_version || 0) + 1;

        // Update all keys with new version
        const operations = new_keys.map((k: { user_id: number | string; encrypted_key: string }) =>
            prisma.groupEncryptionKey.upsert({
                where: {
                    group_id_user_id: {
                        group_id,
                        user_id: parseInt(String(k.user_id))
                    }
                },
                update: {
                    encrypted_key: k.encrypted_key,
                    key_version: newVersion,
                    updated_at: new Date()
                },
                create: {
                    group_id,
                    user_id: parseInt(String(k.user_id)),
                    encrypted_key: k.encrypted_key,
                    key_version: newVersion
                }
            })
        );

        await prisma.$transaction(operations);

        return res.json({
            success: true,
            message: "Keys rotated successfully",
            data: { new_version: newVersion }
        });
    } catch (error) {
        console.error("Error rotating keys:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to rotate keys"
        });
    }
});

export default router;
