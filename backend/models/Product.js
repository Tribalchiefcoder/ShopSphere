import mongoose from "mongoose";

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },

    description: {
      type: String,
      required: true,
      trim: true,
      maxlength: 5000,
    },

    price: {
      type: Number,
      required: true,
      min: 0,
      validate: {
        validator: Number.isFinite,
        message: "Price must be a valid number",
      },
    },

    category: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },

    brand: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },

    stock: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
      validate: {
        validator: Number.isSafeInteger,
        message: "Stock must be a whole number",
      },
    },

    images: {
      type: [String],
      default: [],
      validate: {
        validator: (images) => images.length <= 5,
        message: "A maximum of 5 product images is allowed",
      },
    },

    // Retained for backward compatibility.
    // Actual ratings are calculated from customer reviews.
    rating: {
      type: Number,
      min: 0,
      max: 5,
      default: 0,
    },
  },
  {
    timestamps: true,
  },
);

// Database indexes
productSchema.index({ category: 1 });
productSchema.index({ price: 1 });
productSchema.index({ createdAt: -1 });

// Text index for product search
productSchema.index({
  name: "text",
  description: "text",
  brand: "text",
});

const Product = mongoose.model("Product", productSchema);

export default Product;
