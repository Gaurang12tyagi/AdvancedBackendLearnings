import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiErrors.js";
import { User } from "../models/user.model.js"
import { uploadCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from 'jsonwebtoken';
import { upload } from "../middlewares/multer.middleware.js";

const generateAccessAndRefreshTokens = async (userId) => {
    try {
        const user = await User.findById(userId);

        if (!user) {
            throw new ApiError(404, "User not found.");
        }

        const accessToken = user.generateAccessToken();
        const refreshToken = user.generateRefreshToken();


        user.refreshToken = refreshToken;
        await user.save({ validateBeforeSave: false });
        console.log("accessToken and refreshToken are", accessToken, refreshToken);
        return { accessToken, refreshToken }
    } catch (error) {
        throw new ApiError(500, "Something went wrong while generating refresh and access token.");
    }
}


// get user details from frontend
// validation - not empty
// check if user already exists: username, email
// check for images, check for avatar
// upload them to cloudinary, avatar
// create user object - create entry in db
// remove password and refresh token field from response
// check for user creation
// return res

export const registerUser = asyncHandler(async (req, res) => {
    // get user details from frontend
    // validation - not empty
    // check if user already exists: username, email
    // check for images, check for avatar
    // upload them to cloudinary, avatar
    // create user object - create entry in db
    // remove password and refresh token field from response
    // check for user creation
    // return res


    const { fullName, email, username, password } = req.body
    //console.log("email: ", email);

    if (
        [fullName, email, username, password].some((field) => field?.trim() === "")
    ) {
        throw new ApiError(400, "All fields are required")
    }

    const existedUser = await User.findOne({
        $or: [{ username }, { email }]
    })

    if (existedUser) {
        throw new ApiError(409, "User with email or username already exists")
    }
    //console.log(req.files);

    const avatarLocalPath = req?.files?.avatar[0]?.path;
    //const coverImageLocalPath = req.files?.coverImage[0]?.path;

    let coverImageLocalPath;
    if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
        coverImageLocalPath = req.files.coverImage[0].path
    }


    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar file is required")
    }

    const avatar = await uploadCloudinary(avatarLocalPath)
    const coverImage = await uploadCloudinary(coverImageLocalPath)

    if (!avatar) {
        throw new ApiError(400, "Avatar file is required")
    }


    const user = await User.create({
        fullName,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
        email,
        password,
        username: username.toLowerCase()
    })

    const createdUser = await User.findById(user._id).select(
        { password: 0, refreshToken: 0 }
    )

    if (!createdUser) {
        throw new ApiError(500, "Something went wrong while registering the user")
    }

    return res.status(201).json(
        new ApiResponse(200, createdUser, "User registered Successfully")
    )

});


// req body -> data
// username or email
//find the user
//password check
//access and referesh token
//send cookie

export const loginUser = asyncHandler(async (req, res) => {
    const { email, username, password } = req.body;

    // Check if password is provided
    if (!password) {
        throw new ApiError(403, "Please provide a password.");
    }

    // Check if either email or username is provided
    if (!email && !username) {
        throw new ApiError(403, "Please provide either email or username.");
    }

    // Find user by email or username
    const user = await User.findOne({
        $or: [{ email }, { username }]
    });

    if (!user) {
        throw new ApiError(404, "User does not exist.");
    }

    const isPasswordValid = await user.isPasswordCorrect(password);
    if (!isPasswordValid) {
        throw new ApiError(401, "Invalid User Credentials.");
    }

    const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(user?._id);
    console.log("Tokens are", accessToken, refreshToken);
    const loggedInUser = await User.findById(user._id).select({ password: 0, refreshToken: 0 });

    const options = {
        httpOnly: true,
        secure: true
    };

    return res.status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", refreshToken, options)
        .json(new ApiResponse(200, {
            user: loggedInUser,
            accessToken,
            refreshToken
        }, "User Logged In successfully."));
});


export const logoutUser = asyncHandler(async (req, res) => {
    await User.findByIdAndUpdate(req.user._id, {
        $unset: {
            refreshToken: 1 //this will remove the token from document
        }
    }, {
        new: true
    })
    const options = {
        httpOnly: true,
        secure: true
    }

    return res.status(200).clearCookie("refreshToken", options).json(new ApiResponse(200, {}, "User Logged Out"))
});


export const refreshAccessToken = asyncHandler(async (req, res) => {
    const incomingRefreshToken = req.cookies?.refreshToken || req.body.refreshToken || req.header("Authorization");
    if (!incomingRefreshToken) {
        throw new ApiError(401, "Unauthorized request");
    }
    console.log("REFRESH_TOKEN_EXPIRY", process.env.REFRESH_TOKEN_SECRET);

    try {
        const decodedToken = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET);
        console.log("Decoded token", decodedToken);

        const user = await User.findById(decodedToken?._id)
        if (!user) {
            throw new ApiError(401, "Invalid refresh token user not found");
        }

        if (incomingRefreshToken !== user?.refreshToken) {
            throw new ApiError(401, "Refresh token is expired or used");
        }
        const options = {
            httpOnly: true,
            secure: true
        }
        const { accessToken, newRefreshToken } = await generateAccessAndRefreshTokens(user._id);

        return res
            .cookie("accessToken", accessToken, options)
            .cookie("refreshToken", newRefreshToken, options)
            .status(200)
            .json(new ApiResponse(200, { accessToken, refreshToken: newRefreshToken }, "Access token refreshed successfully"));


    } catch (error) {
        throw new ApiError(401, error?.message || "invalid refrsh token")

    }
})

export const changeCurrentPassword = asyncHandler(async (req, res) => {
    const { oldPassword, newPassword, confirmPassword } = req.body;
    if (!(newPassword == confirmPassword)) {
        throw new ApiError(401, "New password do not matches with confirm password")
    }
    const user = await User.findById(req.user?._id);
    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword);
    if (!isPasswordCorrect) {
        throw new ApiError(401, "Invalid Old Password");

    }
    user.password = newPassword;
    await user.save({ validateBeforeSave: false });
    return res.status(200).json(new ApiResponse(200, {}, "Password changed successfully"))
})

export const getCurrentUser = asyncHandler(async (req, res) => {
    return req.status(200).json(200, req.user);
})

export const updateAccountDetails = asyncHandler(async (req, res) => {
    const { fullName, email } = req.body;

    if (!fullName || !email) {
        throw new ApiError(401, "Mandatory fields are required.")
    }
    const user = await User.findByIdAndUpdate(req?.user?._id, {
        $set: { fullName: fullName, email: email }
    }, {
        new: true
    }).select({ password: 0 })

    return res.status(200).json(new ApiResponse(201, { user }, "User edited successfully"));


});
export const updateUserAvatar = asyncHandler(async (req, res) => {
    const avatarLocalPath = req.file?.path;
    if (!avatarLocalPath) {
        throw new ApiError(401, "Avatar is missing.")
    }
    const avatar = await uploadCloudinary(avatarLocalPath)
    const avatarUrl = avatar.url;
    if (!avatarUrl) {
        throw new ApiError(401, "Error while uploading avatar on cloudinary.")
    }

    const user = await User.findByIdAndUpdate(req.user._id, {
        $set: { avatar: avatarUrl },
    }, { new: true }

    ).select({ password: 0 });
    return res.status(200).json(new ApiResponse(201, user, "avatarImage updated successfully."))
})

export const updateUserCoverImage = asyncHandler(async (req, res) => {
    const coverImageLocalPath = req.file?.path;
    if (!coverImageLocalPath) {
        throw new ApiError(401, "coverImage is missing.")
    }
    const coverImage = await uploadCloudinary(coverImageLocalPath)
    const coverImageUrl = coverImage.url;
    if (!coverImageUrl) {
        throw new ApiError(401, "Error while uploading coverImage on cloudinary.")
    }

    const user = await User.findByIdAndUpdate(req.user._id, {
        $set: { coverImage: coverImageUrl },
    }, { new: true }

    ).select({ password: 0 });
    return res.status(200).json(new ApiResponse(201, user, "coverImage updated successfully."))
});

export const getUserChannelProfile = asyncHandler(async (req, res) => {
    const { username } = req?.params;
    if (!username.trim()) {
        throw new ApiError(401, "Username is missing");
    }
    const channel = await User.aggregate([{
        //yeh ek document ban gya hai pehle wale pipeline se
        $match: {
            username: username?.toLowerCase()
        }
    }, {

        //yha ham sunscribers lekar aa rhe hai
        $lookup: {
            from: "Subscriptions",
            localField: "_id",
            foreignField: "channel",
            as: "subscribers"

        }
    }, {
        //yha ham apne wale subscribed channels lekar aa rhe hai
        $lookup: {
            from: "Subscriptions",
            localField: "_id",
            foreignField: "subscriber",
            as: "subscribedTo"
        }
    }, {
        //additional fields apne purane fields to rahega hi sath me nye fields bhi add karwa dega
        $addFields: {
            subscribersCount: {
                $size: "$subscribers"
            },
            channelsSubscribedToCount: {
                $size: "$subscribedTo"
            },
            isSubscribed: {
                $cond: {
                    //isme teen params hote hai IF THEN ELSE
                    //yeh in array or object sabke andar jaakr dekh leta hai
                    if: { $in: [req.user?._id, "$subscribers.subscriber"] }, then: true, else: false
                }
            }
        }
    }, {
        //yeh selected cheeze dene ke kaam aayega
        $project: {
            fullname: 1,
            subscribersCount: 1,
            channelsSubscribedToCount: 1,
            username: 1,
            isSubscribed: 1,
            avatar: 1,
            coverImage: 1,
            email: 1,

        }
    }
    ])
    console.log("Aggregate", channel);
    if (channel.length < 1) {
        throw new ApiError(404, "Channel does not exist");
    }

    return res.status(200).json(new ApiResponse(201, channel[0], "User Channel Fetched Successfully"))

})

export const getWatchHistory = asyncHandler(async (req, res) => {
    const user = await User.aggregate([{
        $match: {
            _id: new moongoose.Types.ObjectId(req.user._id)
        }
    },
    {
        $lookup: {
            from: "Videos",
            localField: "watchHistory",
            foreignField: "id",
            as: "watchHistory",
            pipeline: [{
                $lookup: {
                    from: "Users",
                    localField: "owner",
                    foreignField: "_id",
                    as: "owner", pipeline: [
                        {
                            $project: {
                                fullName: 1,
                                username: 1,
                                avatar: 1,
                            }
                        }
                    ]
                }
            }, {
                $addFields: {
                    owner: {
                        $first: "$owner"
                    }
                }
            }]


        }
    }
    ])
    return res.status(200).json(new ApiResponse(201, user[0].watchHistory, "Watch History found successfully"))
})