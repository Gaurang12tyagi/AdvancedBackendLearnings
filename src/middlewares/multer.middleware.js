import multer from "multer";

//WE WILL KEEP THIS FILE IN OUR LOCALSTORAGE FOR SHORTER TIME THEN USOING CLOUDINARY WE WILL UPLOAD IT
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, "./public/temp")
    },
    filename: function (req, file, cb) {

        cb(null, file.originalname)
    }
})

export const upload = multer({
    storage
})