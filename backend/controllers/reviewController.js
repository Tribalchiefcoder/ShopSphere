import mongoose from "mongoose";
import Review from "../models/Review.js";
import Product from "../models/Product.js";
import Order from "../models/Order.js";

// ======================================
// HELPER: Validate review input
// ======================================

const validateReview = (rating, title, comment) => {
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return "Rating must be a whole number between 1 and 5.";
  }

  if (
    typeof title !== "string" ||
    title.trim().length < 3 ||
    title.trim().length > 100
  ) {
    return "Review title must contain 3 to 100 characters.";
  }

  if (
    typeof comment !== "string" ||
    comment.trim().length < 10 ||
    comment.trim().length > 1000
  ) {
    return "Review must contain 10 to 1000 characters.";
  }

  return null;
};

// ======================================
// HELPER: Check verified purchase
// ======================================

const hasPurchasedProduct = async (userId, productId) => {
  const order = await Order.exists({
    user: userId,
    orderStatus: "Delivered",
    "items.product": productId,
  });

  return Boolean(order);
};

// ======================================
// GET PRODUCT REVIEWS
// GET /api/reviews/product/:productId
// ======================================

export const getProductReviews = async (req, res) => {
  try {
    const { productId } = req.params;

    if (!mongoose.isValidObjectId(productId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid product ID.",
      });
    }

    const product = await Product.exists({
      _id: productId,
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found.",
      });
    }

    const reviews = await Review.find({
      product: productId,
    })
      .populate("user", "name")
      .sort({ createdAt: -1 });

    const totalReviews = reviews.length;

    const ratingDistribution = {
      5: 0,
      4: 0,
      3: 0,
      2: 0,
      1: 0,
    };

    let totalRating = 0;

    for (const review of reviews) {
      totalRating += review.rating;
      ratingDistribution[review.rating] += 1;
    }

    const averageRating =
      totalReviews > 0 ? Number((totalRating / totalReviews).toFixed(1)) : 0;

    return res.status(200).json({
      success: true,
      totalReviews,
      averageRating,
      ratingDistribution,
      reviews,
    });
  } catch (error) {
    console.error("Get reviews error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch product reviews.",
    });
  }
};

// ======================================
// CHECK CUSTOMER REVIEW ELIGIBILITY
// GET /api/reviews/eligibility/:productId
// ======================================

export const checkReviewEligibility = async (req, res) => {
  try {
    const { productId } = req.params;
    const userId = req.user._id;

    if (!mongoose.isValidObjectId(productId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid product ID.",
      });
    }

    const product = await Product.exists({
      _id: productId,
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found.",
      });
    }

    const existingReview = await Review.findOne({
      product: productId,
      user: userId,
    });

    const verifiedPurchase = await hasPurchasedProduct(userId, productId);

    return res.status(200).json({
      success: true,
      canReview: verifiedPurchase && !existingReview,
      verifiedPurchase,
      hasReviewed: Boolean(existingReview),
      existingReview,
    });
  } catch (error) {
    console.error("Review eligibility error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to check review eligibility.",
    });
  }
};

// ======================================
// CREATE REVIEW
// POST /api/reviews/product/:productId
// ======================================

export const createReview = async (req, res) => {
  try {
    const { productId } = req.params;
    const userId = req.user._id;

    const { rating, title, comment } = req.body;

    if (!mongoose.isValidObjectId(productId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid product ID.",
      });
    }

    const validationError = validateReview(rating, title, comment);

    if (validationError) {
      return res.status(400).json({
        success: false,
        message: validationError,
      });
    }

    const product = await Product.exists({
      _id: productId,
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found.",
      });
    }

    const existingReview = await Review.exists({
      product: productId,
      user: userId,
    });

    if (existingReview) {
      return res.status(409).json({
        success: false,
        message: "You have already reviewed this product.",
      });
    }

    // Only customers with delivered orders can review
    const verifiedPurchase = await hasPurchasedProduct(userId, productId);

    if (!verifiedPurchase) {
      return res.status(403).json({
        success: false,
        message:
          "You can review this product after your order has been delivered.",
      });
    }

    const review = await Review.create({
      product: productId,
      user: userId,
      rating,
      title: title.trim(),
      comment: comment.trim(),
      verifiedPurchase: true,
    });

    await review.populate("user", "name");

    return res.status(201).json({
      success: true,
      message: "Your review has been submitted successfully.",
      review,
    });
  } catch (error) {
    console.error("Create review error:", error.message);

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "You have already reviewed this product.",
      });
    }

    if (error.name === "ValidationError") {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    return res.status(500).json({
      success: false,
      message: "Unable to submit your review.",
    });
  }
};

// ======================================
// UPDATE OWN REVIEW
// PUT /api/reviews/:reviewId
// ======================================

export const updateReview = async (req, res) => {
  try {
    const { reviewId } = req.params;
    const userId = req.user._id;

    const { rating, title, comment } = req.body;

    if (!mongoose.isValidObjectId(reviewId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid review ID.",
      });
    }

    const validationError = validateReview(rating, title, comment);

    if (validationError) {
      return res.status(400).json({
        success: false,
        message: validationError,
      });
    }

    const review = await Review.findOneAndUpdate(
      {
        _id: reviewId,
        user: userId,
      },
      {
        $set: {
          rating,
          title: title.trim(),
          comment: comment.trim(),
        },
      },
      {
        returnDocument: "after",
        runValidators: true,
      },
    ).populate("user", "name");

    if (!review) {
      return res.status(404).json({
        success: false,
        message: "Review not found or access denied.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Review updated successfully.",
      review,
    });
  } catch (error) {
    console.error("Update review error:", error.message);

    if (error.name === "ValidationError") {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    return res.status(500).json({
      success: false,
      message: "Unable to update your review.",
    });
  }
};

// ======================================
// DELETE OWN REVIEW
// DELETE /api/reviews/:reviewId
// ======================================

export const deleteReview = async (req, res) => {
  try {
    const { reviewId } = req.params;
    const userId = req.user._id;

    if (!mongoose.isValidObjectId(reviewId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid review ID.",
      });
    }

    const review = await Review.findOneAndDelete({
      _id: reviewId,
      user: userId,
    });

    if (!review) {
      return res.status(404).json({
        success: false,
        message: "Review not found or access denied.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Review deleted successfully.",
    });
  } catch (error) {
    console.error("Delete review error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to delete your review.",
    });
  }
};
