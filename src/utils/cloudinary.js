import { v2 as cloudinary } from "cloudinary"
import fs from "fs"


cloudinary.config({
    // cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    // api_key: process.env.CLOUDINARY_API_KEY,
    // api_secret: process.env.CLOUDINARY_API_SECRET
    cloud_name: "dzgxnbprd",
    api_key: "651765628821955",
    api_secret: "xACUKNsKDeAbVC3GMF3Zp5CLOls"
});

const uploadCloudinary = async (localFilePath) => {
    try {
        if (!localFilePath) return null
        //upload the file on cloudinary
        const response = await cloudinary.uploader.upload(localFilePath, {
            resource_type: "auto"
        })
        // file has been uploaded successfull
        console.log("file is uploaded on cloudinary ", response);
        fs.unlinkSync(localFilePath)
        return response;

    } catch (error) {
        if (fs.existsSync(localFilePath)) {
            fs.unlinkSync(localFilePath); // Ensure the file exists before trying to delete
        }// remove the locally saved temporary file as the upload operation got failed
        return null;
    }
}



export { uploadCloudinary }