import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiErrors.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import jwt from 'jsonwebtoken'


export const verifyJWT = asyncHandler(async (req, res, next) => {

  try {

    const token = req.cookies?.accessToken || req.header("Authorization");
    if (!token) {
      throw new ApiError("401", "Unauthorized request")
    }

    const decodedTokenInfo = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    const user = await User.findById(decodedTokenInfo?._id).select({ password: 0, refreshToken: 0 });
    if (!user) {
      throw new ApiError(401, "Invalid Access Token");
    }
    req.user = user;
    next();
  } catch (error) {
    throw new ApiError(401, error.message || "Invalid Access Token")

  }
})