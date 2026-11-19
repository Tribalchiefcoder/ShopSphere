import express from "express";

import {
  registerUser,
  loginUser,
  getCustomerStats,
  getAllCustomers,
} from "../controllers/authController.js";

import { protect, adminOnly } from "../middleware/authMiddleware.js";

const router = express.Router();

// Public authentication routes
router.post("/register", registerUser);
router.post("/login", loginUser);

// Protected admin statistics route
router.get("/admin/customers/stats", protect, adminOnly, getCustomerStats);

// Protected admin customers route
router.get("/admin/customers", protect, adminOnly, getAllCustomers);

export default router;
