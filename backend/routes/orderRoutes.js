import express from "express";

import {
  createOrder,
  getMyOrders,
  getAllOrders,
  updateOrderStatus,
} from "../controllers/orderController.js";

import { protect, adminOnly } from "../middleware/authMiddleware.js";

const router = express.Router();

// Allow only customer accounts
const customerOnly = (req, res, next) => {
  if (req.user?.role !== "user") {
    return res.status(403).json({
      success: false,
      message: "Only customers can perform this action.",
    });
  }

  return next();
};

// Customer: Place a new order
router.post("/", protect, customerOnly, createOrder);

// Customer: Get their own orders
router.get("/my-orders", protect, customerOnly, getMyOrders);

// Admin: Get all customer orders
router.get("/admin/all", protect, adminOnly, getAllOrders);

// Admin: Update an order's status
router.put("/admin/:orderId/status", protect, adminOnly, updateOrderStatus);

export default router;
