import { Kafka, logLevel } from "kafkajs"
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const kafka = new Kafka({
    brokers: [process.env.KAFKA_BROKER],
    // ssl: true,
    ssl: {
        ca: [fs.readFileSync(path.resolve(__dirname, "../../certs/ca.pem"), "utf-8")], // Load CA certificate
        key: fs.readFileSync(path.resolve(__dirname, "../../certs/access.key"), "utf-8"), // Access key
        cert: fs.readFileSync(path.resolve(__dirname, "../../certs/access.cert"), "utf-8"), // Access certificate
    },

    sasl: {
        mechanism: 'scram-sha-256',
        username: process.env.KAFKA_USERNAME,
        password: process.env.KAFKA_PASSWORD
    },
    logLevel: logLevel.ERROR
});

export const producer = kafka.producer()
export const consumer = kafka.consumer({ groupId: "chats" })

export const connectKafkaProducer = async () => {
    await producer.connect();
    console.log("Kafka Producer Connected...");
}