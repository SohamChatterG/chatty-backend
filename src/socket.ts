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
            // -------------------
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

