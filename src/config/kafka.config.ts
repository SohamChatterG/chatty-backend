// import { Kafka, logLevel } from "kafkajs"
// import fs from "fs";
// import path from "path";
// import { fileURLToPath } from "url";


// const __filename = fileURLToPath(import.meta.url);
// const __dirname = path.dirname(__filename);

// export const kafka = new Kafka({
//     brokers: [process.env.KAFKA_BROKER],
//     // ssl: true,
//     ssl: {
//         ca: [fs.readFileSync(path.resolve(__dirname, "../../certs/ca.pem"), "utf-8")], // Load CA certificate
//         key: fs.readFileSync(path.resolve(__dirname, "../../certs/access.key"), "utf-8"), // Access key
//         cert: fs.readFileSync(path.resolve(__dirname, "../../certs/access.cert"), "utf-8"), // Access certificate
//     },

//     sasl: {
//         mechanism: 'scram-sha-256',
//         username: process.env.KAFKA_USERNAME,
//         password: process.env.KAFKA_PASSWORD
//     },
//     logLevel: logLevel.ERROR
// });

// export const producer = kafka.producer()
// export const consumer = kafka.consumer({ groupId: "chats" })

// export const connectKafkaProducer = async () => {
//     await producer.connect();
//     console.log("Kafka Producer Connected...");
// }

// src/config/kafka.config.ts

import { Kafka, logLevel } from "kafkajs";

// We no longer need 'fs', 'path', or 'url' because we are not reading files.

// Best practice: Check that all necessary environment variables are present before starting.
// if (
//     !process.env.KAFKA_BROKER ||
//     !process.env.KAFKA_CA_CERT ||
//     !process.env.KAFKA_ACCESS_KEY ||
//     !process.env.KAFKA_ACCESS_CERT ||
//     !process.env.KAFKA_USERNAME ||
//     !process.env.KAFKA_PASSWORD
// ) {
//     throw new Error("One or more Kafka environment variables are not set.");
// }

export const kafka = new Kafka({
    brokers: [process.env.KAFKA_BROKER],

    // This 'ssl' block is the only part we've changed.
    // It now reads the certificate data from the environment variables.
    ssl: {
        ca: [process.env.KAFKA_CA_CERT], // The CA cert must be in an array
        key: process.env.KAFKA_ACCESS_KEY,
        cert: process.env.KAFKA_ACCESS_CERT,
    },

    sasl: {
        mechanism: 'scram-sha-256',
        username: process.env.KAFKA_USERNAME,
        password: process.env.KAFKA_PASSWORD
    },
    logLevel: logLevel.ERROR
});

export const producer = kafka.producer();
export const consumer = kafka.consumer({ groupId: "chats" });

export const connectKafkaProducer = async () => {
    await producer.connect();
    console.log("Kafka Producer Connected...");
};