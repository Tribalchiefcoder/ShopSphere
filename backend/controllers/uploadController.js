import cloudinary from "../config/cloudinary.js";

// Detect actual image format using file signatures
const detectImageFormat = (file) => {
  const buffer = file.buffer;

  if (!buffer || buffer.length < 12) {
    return null;
  }

  // JPEG / JPG
  const isJPEG = buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;

  if (isJPEG) return "jpeg";

  // PNG
  const isPNG = buffer.subarray(0, 8).toString("hex") === "89504e470d0a1a0a";

  if (isPNG) return "png";

  // WebP
  const isWebP =
    buffer.subarray(0, 4).toString("ascii") === "RIFF" &&
    buffer.subarray(8, 12).toString("ascii") === "WEBP";

  if (isWebP) return "webp";

  return null;
};

// Upload a single image to Cloudinary
const uploadToCloudinary = (file) => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: "shopsphere/products",
        resource_type: "image",
        allowed_formats: ["jpg", "jpeg", "png", "webp"],
        timeout: 120000,
      },
      (error, result) => {
        if (error) {
          reject(error);
        } else {
          resolve(result);
        }
      },
    );

    uploadStream.on("error", reject);
    uploadStream.end(file.buffer);
  });
};

// Upload product images
export const uploadProductImages = async (req, res) => {
  const uploadedImages = [];

  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Please select at least one image.",
      });
    }

    if (req.files.length > 5) {
      return res.status(400).json({
        success: false,
        message: "You can upload a maximum of 5 images.",
      });
    }

    // Validate actual image formats before uploading
    for (const file of req.files) {
      const detectedFormat = detectImageFormat(file);

      // Log image information for troubleshooting
      console.log("Image validation:", {
        filename: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
        detectedFormat,
      });

      if (!detectedFormat) {
        return res.status(400).json({
          success: false,
          message: `${file.originalname}: Invalid or unsupported image format. Only JPG, JPEG, PNG and WebP are allowed.`,
        });
      }
    }

    // Upload validated images to Cloudinary
    for (const file of req.files) {
      const result = await uploadToCloudinary(file);

      uploadedImages.push({
        url: result.secure_url,
        publicId: result.public_id,
      });

      console.log("Image uploaded successfully:", {
        filename: file.originalname,
        format: result.format,
      });
    }

    return res.status(200).json({
      success: true,
      message: "Images uploaded successfully.",
      count: uploadedImages.length,
      images: uploadedImages.map((image) => image.url),
    });
  } catch (error) {
    console.error("Image upload error:", error.message);

    // Remove partially uploaded images if an upload fails
    await Promise.allSettled(
      uploadedImages.map((image) =>
        cloudinary.uploader.destroy(image.publicId),
      ),
    );

    return res.status(500).json({
      success: false,
      message: "Failed to upload images. Please try again.",
    });
  }
};
