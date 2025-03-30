# Group Chat Application Backend

## Overview
This is the backend for a real-time chat application built using **Node.js**, **Express**, **Socket.io**, **Redis**, and **Kafka** (optional). The backend handles user authentication, real-time messaging, and event-driven communication using Kafka and Redis.

## Features
- **Real-time Communication** with Socket.io
- **Redis Streams Adapter** for handling WebSocket events
- **Kafka Integration (Optional)** for event-driven architecture
- **JWT-based Authentication**
- **Database Connection** using an environment variable
- **Configurable Kafka Producer & Consumer** (can be enabled or disabled as needed)

---

## Tech Stack
- **Node.js** - JavaScript runtime
- **Express.js** - Web framework for API development
- **Socket.io** - Real-time communication
- **Redis** - For message brokering and pub/sub
- **Kafka** - Event streaming platform (optional)
- **PostgreSQL / MongoDB** - Database support (configurable via `DATABASE_URL` in `.env` file)

---

## Getting Started

### Prerequisites
Make sure you have the following installed:
- **Node.js** (v16+ recommended)
- **Redis** (if using Socket.io Redis Streams Adapter)
- **Kafka** (if enabling Kafka integration)

### Installation
1. Clone the repository:
   ```sh
   git clone https://github.com/SohamChatterG/chat-backend.git
   cd chat-backend
   ```

2. Install dependencies:
   ```sh
   npm install
   ```

3. Set up Redis:
   - Install and run Redis on your system.
   - Alternatively, use a managed Redis service like **Aiven**.

4. Set up Kafka (Optional):
   - Use **Aiven Kafka** or another Kafka provider.
   - Obtain your credentials and place them in `server/certs/`.

5. Configure environment variables:
   Create a `.env` file and add the following:
   ```env
   DATABASE_URL="your-database-url"
   JWT_SECRET="your-secret-key"

   KAFKA_BROKER="your-kafka-broker"
   KAFKA_USER="your-kafka-username"
   KAFKA_PASSWORD="your-kafka-password"
   KAFKA_TOPIC="your-kafka-topic"
   KAFKA_ACCESS_KEY_PATH="server/certs/access.key"
   KAFKA_ACCESS_CERT_PATH="server/certs/access.cert"
   KAFKA_CA_CERT_PATH="server/certs/ca.cert"
   ```

---

## Running the Server
To start the server in development mode, run:
```sh
npm run dev
```

The server will be available at `http://localhost:PORT` (default `PORT` is `8000`).

---

## Redis & Kafka Integration

### Redis Streams Adapter for Socket.io
This project integrates **Redis** to enhance WebSocket event handling using the **Redis Streams Adapter**:
```js
import { createAdapter } from "@socket.io/redis-streams-adapter";
import redis from "./config/redis.config.js";
```

Redis is required if multiple instances of the backend are running for synchronized messaging.

### Kafka for Event Streaming (Optional)
Kafka is used to handle large-scale message processing asynchronously.

- **Kafka Producer & Consumer Setup** (Commented Out by Default)
```js
import { connectKafkaProducer } from "./config/kafka.config.js";
import { consumeMessages } from "./helper.js";

// Uncomment below lines to enable Kafka at index.ts
// connectKafkaProducer().catch((err) => {
//   console.log('Something went wrong while connecting Kafka', err);
// });

// consumeMessages(process.env.KAFKA_TOPIC).catch(err => {
//   console.log("Kafka consumer error:", err);
// });
```

- **Producing Messages to Kafka**
```js
at socket.ts
import { produceMessage } from "./helper.js";

// Example Usage:
// await produceMessage(process.env.KAFKA_TOPIC, data);
```

---

## Deployment
For production deployment:
1. Build the project:
   ```sh
   npm run build
   ```
2. Start the server:
   ```sh
   npm start
   ```

