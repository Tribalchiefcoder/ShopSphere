import User from "../models/User.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

// Validate email format
const isValidEmail = (email) => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

// Generate JWT token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    algorithm: "HS256",
    expiresIn: "7d",
  });
};

// Register user
export const registerUser = async (req, res) => {
  try {
    const { name, email, password } = req.body || {};

    // Validate input types
    if (
      typeof name !== "string" ||
      typeof email !== "string" ||
      typeof password !== "string"
    ) {
      return res.status(400).json({
        success: false,
        message: "Please provide valid name, email and password",
      });
    }

    const normalizedName = name.trim();
    const normalizedEmail = email.toLowerCase().trim();

    // Validate name
    if (normalizedName.length < 2 || normalizedName.length > 100) {
      return res.status(400).json({
        success: false,
        message: "Name must contain between 2 and 100 characters",
      });
    }

    // Validate email
    if (normalizedEmail.length > 254 || !isValidEmail(normalizedEmail)) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid email address",
      });
    }

    // Validate password
    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message: "Password must contain at least 8 characters",
      });
    }

    // bcrypt supports a maximum of 72 password bytes
    if (Buffer.byteLength(password, "utf8") > 72) {
      return res.status(400).json({
        success: false,
        message: "Password is too long",
      });
    }

    // Check whether user already exists
    const existingUser = await User.findOne({
      email: normalizedEmail,
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "User already exists",
      });
    }

    // Securely hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Public registration is restricted to customers
    const user = await User.create({
      name: normalizedName,
      email: normalizedEmail,
      password: hashedPassword,
      role: "user",
    });

    return res.status(201).json({
      success: true,
      message: "User registered successfully",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      token: generateToken(user._id),
    });
  } catch (error) {
    // Handle duplicate email race conditions
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "User already exists",
      });
    }

    if (error.name === "ValidationError") {
      return res.status(400).json({
        success: false,
        message: "Invalid registration information",
      });
    }

    console.error("Registration error:", error.name);

    return res.status(500).json({
      success: false,
      message: "Registration failed. Please try again later.",
    });
  }
};

// Login user
export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body || {};

    // Validate input types
    if (
      typeof email !== "string" ||
      typeof password !== "string" ||
      !email.trim() ||
      !password
    ) {
      return res.status(400).json({
        success: false,
        message: "Please provide valid email and password",
      });
    }

    const normalizedEmail = email.toLowerCase().trim();

    if (
      normalizedEmail.length > 254 ||
      !isValidEmail(normalizedEmail) ||
      Buffer.byteLength(password, "utf8") > 72
    ) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    // Retrieve user including password hash
    const user = await User.findOne({
      email: normalizedEmail,
    }).select("+password");

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    // Verify password
    const isPasswordCorrect = await bcrypt.compare(password, user.password);

    if (!isPasswordCorrect) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Login successful",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      token: generateToken(user._id),
    });
  } catch (error) {
    console.error("Login error:", error.name);

    return res.status(500).json({
      success: false,
      message: "Login failed. Please try again later.",
    });
  }
};

// Get total registered customers (admin only)
export const getCustomerStats = async (req, res) => {
  try {
    const totalCustomers = await User.countDocuments({
      role: "user",
    });

    return res.status(200).json({
      success: true,
      totalCustomers,
    });
  } catch (error) {
    console.error("Customer statistics error:", error.name);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch customer statistics",
    });
  }
};

// Get all registered customers (admin only)
export const getAllCustomers = async (req, res) => {
  try {
    const customers = await User.find({
      role: "user",
    })
      .select("_id name email role createdAt")
      .sort({ createdAt: -1 });

    // Beginning of the current month
    const now = new Date();

    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const newCustomersThisMonth = customers.filter(
      (customer) => new Date(customer.createdAt) >= startOfMonth,
    ).length;

    return res.status(200).json({
      success: true,
      totalCustomers: customers.length,
      newCustomersThisMonth,
      customers,
    });
  } catch (error) {
    console.error("Failed to fetch customers:", error.name);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch customers",
    });
  }
};
