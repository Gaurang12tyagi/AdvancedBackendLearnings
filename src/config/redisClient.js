import Redis from "ioredis";

const redisClient = new Redis({
    host: "127.0.0.1", // Replace with your Redis server if needed
    port: 6379
});

// Handle Redis errors
redisClient.on("error", (err) => {
    console.error("Redis error:", err);
});

export default redisClient;
