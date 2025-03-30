import { Server } from "socket.io";
import { Socket } from "socket.io";
import prisma from "./config/db.config.js";
import { produceMessage } from "./helper.js";

interface CustomSocket extends Socket {
    room?: string;
    user?: {
        id: string;
        name: string;
    };
}

export function setupSocket(io: Server) {
    const activeUsers: { [roomId: string]: { id: string; name: string; }[] } = {};
    const typingUsers: { [roomId: string]: { [userId: string]: string } } = {};
    io.use((socket: CustomSocket, next) => {
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
                name: user.name || "Guest-" + socket.id.slice(0, 5)
            };
        }
        next();
    })


    io.on("connection", (socket: CustomSocket) => {
        // join the room
        socket.join(socket.room)


        console.log("The socket connected..", socket.id);
        if (!activeUsers[socket.room]) {
            activeUsers[socket.room] = [];
        }
        activeUsers[socket.room].push(socket.user);
        socket.on("message", async (data) => {
            console.log("on message data", data)
            console.log("on message socket", socket)
            // -------------
            await prisma.chats.create({
                data: data
            })
            // --------------
            // await produceMessage(process.env.KAFKA_TOPIC, data)
            socket.to(socket.room).emit("message", data)
        })
        socket.on("getUsers", () => {
            console.log(activeUsers)
            socket.emit("activeUsers", activeUsers[socket.room]);
        });

        socket.on("typing", (user) => {
            console.log("is typing user", user)
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


        socket.on("disconnect", () => {
            console.log("A user disconnected...", socket.id)
            if (activeUsers[socket.room]) {
                activeUsers[socket.room] = activeUsers[socket.room].filter(
                    (user) => user.id !== socket.user.id
                );
                io.to(socket.room).emit("userLeft", socket.user.id);
                io.to(socket.room).emit("activeUsers", activeUsers[socket.room]);
            }
        })
    })
}