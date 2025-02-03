import connectDB from "./db/index.js";
import { configDotenv } from "dotenv";
import { app } from "./app.js";



configDotenv({
    path: './.env'
});


//this will return promise
connectDB().then(() => app.listen(process.env.PORT || 8000, () => {
    console.log("Server is running on port", process.env.PORT);
})).catch(() => console.log("Mongo DB error"));


