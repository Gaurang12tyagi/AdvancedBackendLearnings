import connectDB from "./db/index.js";
import { app } from "./app.js";
import dotenv from "dotenv"; 
import path from "path";
import { fileURLToPath } from "url";

// Resolve the directory path correctly
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, ".env") });

// Connect to the database and start the server
connectDB()
  .then(() => {
    const PORT = process.env.PORT || 8000;
    app.listen(PORT, () => {
      console.log("Server is running on port", PORT);
    });
  })
  .catch((err) => {
    console.error("MongoDB connection error:", err);
  });
