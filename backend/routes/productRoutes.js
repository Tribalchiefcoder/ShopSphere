import express from "express";
import multer from "multer";

import {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
} from "../controllers/productController.js";

import { uploadProductImages } from "../controllers/uploadController.js";

import { protect, adminOnly } from "../middleware/authMiddleware.js";
import upload from "../middleware/uploadMiddleware.js";

const router = express.Router();

// Image upload middleware with error handling
const handleImageUpload = (req, res, next) => {
  upload.array("images", 5)(req, res, (error) => {
    if (error instanceof multer.MulterError) {
      let message = error.message;

      if (error.code === "LIMIT_FILE_SIZE") {
        message = "Each image must be 5 MB or smaller.";
      } else if (
        error.code === "LIMIT_FILE_COUNT" ||
        error.code === "LIMIT_UNEXPECTED_FILE"
      ) {
        message = "You can upload up to 5 images using the images field.";
      }

      return res.status(400).json({
        success: false,
        message,
      });
    }

    if (error) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    next();
  });
};

// Protected image upload route
router.post(
  "/upload",
  protect,
  adminOnly,
  handleImageUpload,
  uploadProductImages,
);

// Public routes
router.get("/", getProducts);
router.get("/:id", getProductById);

// Protected admin routes
router.post("/", protect, adminOnly, createProduct);
router.put("/:id", protect, adminOnly, updateProduct);
router.delete("/:id", protect, adminOnly, deleteProduct);

export default router;
