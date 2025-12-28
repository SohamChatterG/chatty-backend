import express, { Application, Request, Response } from "express";
import "dotenv/config";
import cors from "cors";
const app: Application = express();
const PORT = process.env.PORT || 8080;
import Routes from "./routes/index.js"
import { Server } from "socket.io"
import { createServer } from "http"
import { setupSocket } from "./socket.js";
import { createAdapter } from "@socket.io/redis-streams-adapter";
import redis from "./config/redis.config.js";
import { instrument } from "@socket.io/admin-ui";
import { connectKafkaProducer } from "./config/kafka.config.js";
import { consumeMessages } from "./helper.js";

const server = createServer(app);

const allowedOrigins = [
  "http://localhost:3000",
  "https://admin.socket.io",
  process.env.FRONTEND_URL,
  "https://chatty-frontend-ymzc-emh9qp0fd-sohams-projects-dab0f95b.vercel.app",
  "https://chatty-frontend-ymzc.vercel.app"
].filter(Boolean);

const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    credentials: true
  },
  adapter: createAdapter(redis) // **** Read the note at the bottom
});

instrument(io, {
  auth: false,
  mode: process.env.NODE_ENV === "production" ? "production" : "development"
})

// * Middleware

app.use(cors({
  origin: allowedOrigins,
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: false })); // Express sees the Content - Type: application / x - www - form - urlencoded. It runs express.urlencoded() middleware. The form body is parsed into req.body.
app.use("/uploads", express.static("uploads")); // Serve uploaded files



app.get("/", (req: Request, res: Response) => {
  return res.send("It's working 🙌");
});

// connectKafkaProducer().catch((err) => {
//   console.log('Something went wrong while connecting kafka ', err)
// });

// consumeMessages(process.env.KAFKA_TOPIC).catch(err => {
//   console.log("the kafka consumer error is", err)
// });

app.use("/api", Routes);


server.listen(PORT, () => console.log(`Server is running on PORT ${PORT}`));
setupSocket(io)
export { io }

// ****
// Redis Stream and Redis Streams Adapter are two completely different things:

// ✅ Redis Stream is a Redis data structure (like List, Set, Hash, etc.)
// - It's designed for high-throughput, append-only log storage.
// - Producers can rapidly add data to the stream.
// - Consumers (or consumer groups) can read, analyze, and process this data asynchronously.
// - Common use cases: logging, analytics, job queues, event sourcing.

// ✅ Redis Streams Adapter is a Socket.IO adapter for horizontal scaling.
// - In a horizontally scaled system, different users may be connected to different server instances.
// - By default, socket.broadcast.emit only emits to sockets connected to the **same** instance.
// - The Redis Streams Adapter allows instances to **communicate with each other** through Redis Streams under the hood.
// - It ensures events are broadcast across all connected clients — no matter which instance they’re on.

// 💡 TL;DR:
// - Redis Stream = a **data structure** used for **event/message queues**.
// - Redis Streams Adapter = a **Socket.IO scaling solution** that **uses Redis Streams internally**.


// Redis Streams (used by the Socket.IO adapter) is focused on fast, real-time message broadcasting and pub/sub specifically between Socket.IO server instances. It's about efficiently notifying all parts of the real-time system to deliver messages to users. They complement each other by handling different aspects of the message lifecycle.


