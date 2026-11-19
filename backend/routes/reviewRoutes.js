import express from "express";

import {
  getProductReviews,
  checkReviewEligibility,
  createReview,
  updateReview,
  deleteReview,
} from "../controllers/reviewController.js";

import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

// Allow only customer accounts
const customerOnly = (req, res, next) => {
  if (req.user?.role !== "user") {
    return res.status(403).json({
      success: false,
      message: "Only customers can perform this action.",
    });
  }

  next();
};

// ======================================
// PUBLIC ROUTES
// ======================================

// Get all reviews and rating statistics
router.get("/product/:productId", getProductReviews);

// ======================================
// PROTECTED CUSTOMER ROUTES
// ======================================

// Check review eligibility
router.get(
  "/eligibility/:productId",
  protect,
  customerOnly,
  checkReviewEligibility,
);

// Submit a new review
router.post("/product/:productId", protect, customerOnly, createReview);

// Update own review
router.put("/:reviewId", protect, customerOnly, updateReview);

// Delete own review
router.delete("/:reviewId", protect, customerOnly, deleteReview);

export default router;
