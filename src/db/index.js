import mongoose from "mongoose";
import { DB_NAME } from "../constants.js";


const connectDB = async () => {
    try {
        // YEH OBJECT RETURN KREGA
        const conenctionInstance = await mongoose.connect(`${process.env.MONGODB_URI}${DB_NAME}`);
        // console.log("Mongo Db connected Successfully !!", conenctionInstance);
   }
    catch (error) {
        console.log("Mongo DB Connection Error", error);
        process.exit(1);
    }
}

export default connectDB;