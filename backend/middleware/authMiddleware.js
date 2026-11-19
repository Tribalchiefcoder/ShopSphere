import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import User from "../models/User.js";

// Verify authenticated users
export const protect = async (req, res, next) => {
  try {
    const authorization = req.headers.authorization;

    const match = authorization?.match(/^Bearer\s+(\S+)$/i);
    const token = match?.[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Not authorized. Please log in.",
      });
    }

    // Verify JWT signature and allowed algorithm
    const decoded = jwt.verify(token, process.env.JWT_SECRET, {
      algorithms: ["HS256"],
    });

    // Validate user ID
    if (!decoded.id || !mongoose.isValidObjectId(decoded.id)) {
      return res.status(401).json({
        success: false,
        message: "Invalid authentication token.",
      });
    }

    // Retrieve user without sensitive password information
    const user = await User.findById(decoded.id).select("-password");

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User no longer exists.",
      });
    }

    req.user = user;

    return next();
  } catch (error) {
    if (
      error.name === "JsonWebTokenError" ||
      error.name === "TokenExpiredError" ||
      error.name === "NotBeforeError"
    ) {
      return res.status(401).json({
        success: false,
        message: "Invalid or expired token.",
      });
    }

    console.error("Authentication error:", error.name);

    return res.status(500).json({
      success: false,
      message: "Authentication service unavailable.",
    });
  }
};

// Restrict access to administrators
export const adminOnly = (req, res, next) => {
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({
      success: false,
      message: "Access denied. Admin privileges required.",
    });
  }

  return next();
};
