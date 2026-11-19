import mongoose from "mongoose";

const reviewSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },

    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    rating: {
      type: Number,
      required: [true, "Please provide a rating."],
      min: [1, "Rating must be at least 1."],
      max: [5, "Rating cannot exceed 5."],
      validate: {
        validator: Number.isInteger,
        message: "Rating must be a whole number.",
      },
    },

    title: {
      type: String,
      required: [true, "Please provide a review title."],
      trim: true,
      minlength: 3,
      maxlength: 100,
    },

    comment: {
      type: String,
      required: [true, "Please provide your review."],
      trim: true,
      minlength: 10,
      maxlength: 1000,
    },

    verifiedPurchase: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  },
);

// Prevent duplicate reviews by the same customer
// for the same product
reviewSchema.index({ product: 1, user: 1 }, { unique: true });

// Optimize fetching recent product reviews
reviewSchema.index({
  product: 1,
  createdAt: -1,
});

const Review = mongoose.model("Review", reviewSchema);

export default Review;
