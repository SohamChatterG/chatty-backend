import { Server } from "socket.io";
import { Socket } from "socket.io";
import prisma from "./config/db.config.js";
import { produceMessage } from "./helper.js";

interface CustomSocket extends Socket {
    room?: string;
    user?: {
        id: string;
        user_id?: string;
        name: string;
    };
}

export function setupSocket(io: Server) {
    const activeUsers: { [roomId: string]: { id: string; user_id?: string; name: string; }[] } = {};
    const typingUsers: { [roomId: string]: { [userId: string]: string } } = {};
    const onlineUsers: Map<string, { socketId: string; name: string }> = new Map();

    io.use((socket: CustomSocket, next) => { // middleware for websocket
        const room = socket.handshake.auth.room || socket.handshake.headers.room;
        if (!room) {
            return next(new Error("Invalid room. Please pass correct room id!"))
        }
        socket.room = room;
        const user = socket.handshake.auth.user;
        if (!user) {
            return next(new Error("Invalid user. Please pass correct room id!"))

        } else {
            socket.user = {
                id: user.id || socket.id,
                user_id: user.user_id ? String(user.user_id) : undefined,
                name: user.name || "Guest-" + socket.id.slice(0, 5)
            };
        }
        next();
    })


    io.on("connection", async (socket: CustomSocket) => {
        // join the room
        socket.join(socket.room);

        console.log("The socket connected..", socket.id);
        if (!activeUsers[socket.room]) {
            activeUsers[socket.room] = [];
        }
        
        // Check for duplicates before adding - use user_id if available, otherwise use id
        const userId = socket.user.user_id || socket.user.id;
        const existingIndex = activeUsers[socket.room].findIndex(
            (u) => (u.user_id && u.user_id === userId) || u.id === userId
        );
        
        if (existingIndex === -1) {
            // User not in list, add them
            activeUsers[socket.room].push(socket.user);
        } else {
            // User already exists, update their info (in case name changed)
            activeUsers[socket.room][existingIndex] = socket.user;
        }

        // Track online status
        onlineUsers.set(socket.user.id, { socketId: socket.id, name: socket.user.name });

        // Broadcast updated active users list to ALL users in the room
        io.to(socket.room).emit("activeUsers", activeUsers[socket.room]);

        // Update user online status in database if user_id is numeric and user exists
        const numericUserId = socket.user.user_id ? parseInt(socket.user.user_id) : parseInt(socket.user.id);
        if (!isNaN(numericUserId)) {
            try {
                // Use updateMany to avoid errors when user doesn't exist
                await prisma.user.updateMany({
                    where: { id: numericUserId },
                    data: { is_online: true },
                });
            } catch (err) {
                // Silently ignore - user might be a guest
            }
        }

        // Broadcast online status to room
        io.to(socket.room).emit("userOnline", { userId: socket.user.id, name: socket.user.name });

        // Helper function to check if user is a valid group member
        const isValidGroupMember = async (groupId: string, userName: string, userId?: number): Promise<{ valid: boolean; reason?: string }> => {
            try {
                // Check if user is a member of the group
                const member = await prisma.groupUsers.findFirst({
                    where: {
                        group_id: groupId,
                        OR: [
                            { name: userName },
                            ...(userId ? [{ user_id: userId }] : [])
                        ]
                    }
                });

                if (!member) {
                    return { valid: false, reason: "You are not a member of this group" };
                }

                if (member.is_banned) {
                    return { valid: false, reason: "You have been banned from this group" };
                }

                if (member.is_muted) {
                    return { valid: false, reason: "You have been muted in this group" };
                }

                return { valid: true };
            } catch (error) {
                console.error("Error checking group membership:", error);
                return { valid: false, reason: "Error verifying membership" };
            }
        };

        // Message event
        socket.on("message", async (data) => {
            console.log("on message data", data);
            // Extract user_id and is_encrypted from data
            const { user_id, is_encrypted, ...chatData } = data;

            // Check if user is still a valid member of the group
            const numericUserId = user_id ? parseInt(user_id) : undefined;
            const memberCheck = await isValidGroupMember(socket.room, socket.user.name, numericUserId);

            if (!memberCheck.valid) {
                socket.emit("error", { message: memberCheck.reason });
                return;
            }

            try {
                const createdMessage = await prisma.chats.create({
                    data: {
                        ...chatData,
                        is_encrypted: is_encrypted || false,
                    },
                });
                // await produceMessage(process.env.KAFKA_TOPIC, data)
                // Include user_id and is_encrypted in the emitted message for client-side reference
                socket.to(socket.room).emit("message", { ...data, id: createdMessage.id, is_encrypted });
            } catch (error) {
                console.error("Error creating message:", error);
                socket.emit("error", { message: "Failed to save message" });
            }
        });

        // Edit message event
        socket.on("editMessage", async (data) => {
            const { id, message, name, user_id } = data;

            // Check membership
            const numericUserId = user_id ? parseInt(user_id) : undefined;
            const memberCheck = await isValidGroupMember(socket.room, socket.user.name, numericUserId);
            if (!memberCheck.valid) {
                socket.emit("error", { message: memberCheck.reason });
                return;
            }

            try {
                const updatedMessage = await prisma.chats.update({
                    where: { id },
                    data: {
                        message,
                        edited_at: new Date(),
                    },
                    include: {
                        MessageReactions: true,
                    },
                });
                io.to(socket.room).emit("messageEdited", updatedMessage);
            } catch (error) {
                console.error("Error editing message:", error);
            }
        });

        // Delete message event
        socket.on("deleteMessage", async (data) => {
            const { id, user_id } = data;

            // Check membership
            const numericUserId = user_id ? parseInt(user_id) : undefined;
            const memberCheck = await isValidGroupMember(socket.room, socket.user.name, numericUserId);
            if (!memberCheck.valid) {
                socket.emit("error", { message: memberCheck.reason });
                return;
            }

            try {
                await prisma.chats.update({
                    where: { id },
                    data: {
                        deleted_at: new Date(),
                        message: null,
                    },
                });
                io.to(socket.room).emit("messageDeleted", { id });
            } catch (error) {
                console.error("Error deleting message:", error);
            }
        });

        // Reaction event
        socket.on("addReaction", async (data) => {
            const { message_id, emoji, user_name, user_id } = data;

            // Check membership
            const numericUserId = user_id ? parseInt(user_id) : undefined;
            const memberCheck = await isValidGroupMember(socket.room, socket.user.name, numericUserId);
            if (!memberCheck.valid) {
                socket.emit("error", { message: memberCheck.reason });
                return;
            }

            try {
                await prisma.messageReactions.upsert({
                    where: {
                        message_id_user_name_emoji: {
                            message_id,
                            user_name,
                            emoji,
                        },
                    },
                    update: {},
                    create: {
                        message_id,
                        user_name,
                        user_id: user_id || null,
                        emoji,
                    },
                });
                io.to(socket.room).emit("reactionAdded", data);
            } catch (error) {
                console.error("Error adding reaction:", error);
            }
        });

        // Remove reaction event
        socket.on("removeReaction", async (data) => {
            const { message_id, emoji, user_name } = data;
            try {
                await prisma.messageReactions.delete({
                    where: {
                        message_id_user_name_emoji: {
                            message_id,
                            user_name,
                            emoji,
                        },
                    },
                });
                io.to(socket.room).emit("reactionRemoved", data);
            } catch (error) {
                console.error("Error removing reaction:", error);
            }
        });

        // Read receipt event
        socket.on("markAsRead", async (data) => {
            const { messageIds, userId, userName } = data;
            try {
                // Create read receipts for all messages
                const readReceipts = messageIds.map((messageId: string) => ({
                    message_id: messageId,
                    user_id: userId ? Number(userId) : null,
                    user_name: userName,
                }));

                await prisma.messageRead.createMany({
                    data: readReceipts,
                    skipDuplicates: true,
                });

                // Broadcast read receipts to the room
                io.to(socket.room).emit("messagesRead", {
                    messageIds,
                    userId,
                    userName,
                    readAt: new Date(),
                });
            } catch (error) {
                console.error("Error marking messages as read:", error);
            }
        });

        // Pin message event
        socket.on("pinMessage", async (data) => {
            const { messageId, userId, userName, groupId } = data;

            // Check membership
            const numericUserId = userId ? parseInt(userId) : undefined;
            const memberCheck = await isValidGroupMember(socket.room, socket.user.name, numericUserId);
            if (!memberCheck.valid) {
                socket.emit("error", { message: memberCheck.reason });
                return;
            }

            try {
                const pinnedMessage = await prisma.pinnedMessage.create({
                    data: {
                        message_id: messageId,
                        group_id: groupId || socket.room,
                        pinned_by: userName,
                    },
                    include: {
                        message: true,
                    },
                });

                io.to(socket.room).emit("messagePinned", pinnedMessage);
            } catch (error) {
                console.error("Error pinning message:", error);
            }
        });

        // Unpin message event
        socket.on("unpinMessage", async (data) => {
            const { messageId } = data;
            try {
                await prisma.pinnedMessage.deleteMany({
                    where: { message_id: messageId },
                });

                io.to(socket.room).emit("messageUnpinned", { messageId });
            } catch (error) {
                console.error("Error unpinning message:", error);
            }
        });

        // Forward message event
        socket.on("forwardMessage", async (data) => {
            const { originalMessageId, targetGroupId, userId, userName } = data;

            // Check membership in target group
            const numericUserId = userId ? parseInt(userId) : undefined;
            const memberCheck = await isValidGroupMember(targetGroupId, userName, numericUserId);
            if (!memberCheck.valid) {
                socket.emit("error", { message: "You are not a member of the target group" });
                return;
            }

            try {
                // Get original message
                const originalMessage = await prisma.chats.findUnique({
                    where: { id: originalMessageId },
                });

                if (!originalMessage) {
                    socket.emit("error", { message: "Original message not found" });
                    return;
                }

                // Create forwarded message
                const forwardedMessage = await prisma.chats.create({
                    data: {
                        group_id: targetGroupId,
                        message: originalMessage.message,
                        name: userName,
                        file: originalMessage.file,
                        file_type: originalMessage.file_type,
                        file_size: originalMessage.file_size,
                        forwarded_from: originalMessageId,
                    },
                });

                // Emit to target group
                io.to(targetGroupId).emit("message", forwardedMessage);

                // Confirm to sender
                socket.emit("messageForwarded", {
                    originalMessageId,
                    targetGroupId,
                    newMessageId: forwardedMessage.id
                });
            } catch (error) {
                console.error("Error forwarding message:", error);
            }
        });

        // Mention notification event
        socket.on("mentionUser", (data) => {
            const { mentionedUserIds, messageId, senderName } = data;

            // Notify each mentioned user
            mentionedUserIds.forEach((userId: string) => {
                const userSocket = onlineUsers.get(userId);
                if (userSocket) {
                    io.to(userSocket.socketId).emit("mentioned", {
                        messageId,
                        groupId: socket.room,
                        senderName,
                    });
                }
            });
        });

        socket.on("getUsers", () => {
            console.log(activeUsers);
            socket.emit("activeUsers", activeUsers[socket.room]);
        });

        // Get online users in room
        socket.on("getOnlineUsers", () => {
            const roomUsers = activeUsers[socket.room] || [];
            const onlineInRoom = roomUsers.filter(user => onlineUsers.has(user.id));
            socket.emit("onlineUsers", onlineInRoom);
        });

        // Listen for user removal/ban events and kick them from the room
        socket.on("kickUser", (data) => {
            const { userId, userName, reason } = data;

            // Find the socket of the user to kick
            const userSocket = onlineUsers.get(userId);
            if (userSocket) {
                // Emit kick event to the specific user
                io.to(userSocket.socketId).emit("kicked", {
                    reason: reason || "You have been removed from this group",
                    groupId: socket.room
                });
            }

            // Also broadcast to room that user was removed
            io.to(socket.room).emit("userRemoved", { userId, userName, reason });
        });

        socket.on("typing", (user) => {
            console.log("is typing user", user);
            if (!typingUsers[socket.room]) {
                typingUsers[socket.room] = {};
            }
            typingUsers[socket.room][user.id] = user.name;
            io.to(socket.room).emit("typing", user.name); // Emit a single name
        });

        socket.on("stopTyping", (user) => {
            if (typingUsers[socket.room]) {
                delete typingUsers[socket.room][user.id]; // Remove the user's name from the map
                io.to(socket.room).emit("typing", Object.values(typingUsers[socket.room])); // Emit the updated array of names
            }
        });

        socket.on("disconnect", async () => {
            console.log("A user disconnected...", socket.id);

            // Update online status
            onlineUsers.delete(socket.user.id);

            // Update database - prefer user_id if available
            const numericUserId = socket.user.user_id ? parseInt(socket.user.user_id) : parseInt(socket.user.id);
            if (!isNaN(numericUserId)) {
                try {
                    // Use updateMany to avoid errors when user doesn't exist
                    await prisma.user.updateMany({
                        where: { id: numericUserId },
                        data: {
                            is_online: false,
                            last_seen: new Date(),
                        },
                    });
                } catch (err) {
                    // Silently ignore - user might be a guest
                }
            }

            if (activeUsers[socket.room]) {
                // Remove user by checking both user_id and id
                const userId = socket.user.user_id || socket.user.id;
                activeUsers[socket.room] = activeUsers[socket.room].filter(
                    (user) => {
                        const userIdentifier = user.user_id || user.id;
                        return userIdentifier !== userId;
                    }
                );
                io.to(socket.room).emit("userLeft", userId);
                io.to(socket.room).emit("userOffline", { userId });
                io.to(socket.room).emit("activeUsers", activeUsers[socket.room]);
            }
        });
    });
}

// 🔥 How Partitioning Helps in Kafka Scaling ?
//     Kafka partitioning is the key to scalability because it allows parallelism at multiple levels:
// 1️⃣ Parallelism in Producers(More Producers → More Throughput)
// ✅ Producers can write to different partitions at the same time.
// ✅ This means multiple producers can send messages in parallel without waiting for each other.

//     Example:

// Suppose a topic "orders" has 3 partitions(P0, P1, P2).

// Producer A writes to P0, Producer B writes to P1, and Producer C writes to P2 → all in parallel.

// ✔ Without partitions → one producer at a time → slow writes.
// ✔ With partitions → multiple producers → higher throughput.

// 2️⃣ Parallelism in Consumers(More Consumers → Faster Processing)
// ✅ Each partition is consumed by only one consumer in a consumer group.
// ✅ Multiple consumers in a consumer group can read in parallel from different partitions.

//     Example:

// Suppose you have 3 partitions(P0, P1, P2) and 3 consumers(C1, C2, C3) in a consumer group.

// Kafka assigns:

// C1 → P0

// C2 → P1

// C3 → P2

// Now, each consumer reads & processes messages in parallel.

// ✔ Without partitions → one consumer processes everything → slow.
// ✔ With partitions → multiple consumers process simultaneously → higher throughput.

// 3️⃣ Load Balancing Across Brokers(More Brokers → More Capacity)
// ✅ Kafka distributes partitions across multiple brokers, so no single broker is overloaded.
// ✅ If you increase brokers, Kafka automatically rebalances partitions across them.

//     Example:

// 3 partitions & 3 brokers

// Kafka may assign:

// Broker 1 → Leader for P0

// Broker 2 → Leader for P1

// Broker 3 → Leader for P2

// If a new broker(Broker 4) is added, Kafka may move some partitions to it for better load balancing.

// ✔ Without partitions → all messages go to one broker → bottleneck.
// ✔ With partitions → messages spread across brokers → better scalability.

// 🔥 Final Takeaways: Why Partitioning Helps Scaling ?
// ✅ More partitions → More producers writing in parallel → Faster writes.
// ✅ More partitions → More consumers reading in parallel → Faster processing.
// ✅ Partitions are spread across multiple brokers → Load balancing → High availability.
// ✅ If demand increases, you can add more partitions & brokers to scale easily.

// 🚀 Partitioning = More Parallelism = High Throughput = Kafka Scales! 🔥

