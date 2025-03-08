import { Server } from "socket.io";
import { Socket } from "socket.io";
import prisma from "./config/db.config.js";
interface CustomSocket extends Socket {
    room?: string
}
export function setupSocket(io: Server) {

    io.use((socket: CustomSocket, next) => {
        const room = socket.handshake.auth.room || socket.handshake.headers.room;
        if (!room) {
            return next(new Error("Invalid room. Please pass correct room id!"))
        }
        socket.room = room;
        next();
    })


    io.on("connection", (socket: CustomSocket) => {
        // join the room
        socket.join(socket.room)


        console.log("The socket connected..", socket.id);
        socket.on("message", async (data) => {
            console.log(data)
            await prisma.chats.create({
                data: data
            })
            // socket.broadcast.emit("message", data);
            socket.to(socket.room).emit("message", data)
        })
        socket.on("disconnect", () => {
            console.log("A user disconnected...", socket.id)
        })
    })
}