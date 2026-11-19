import mongoose from "mongoose";
import Product from "../models/Product.js";
import Review from "../models/Review.js";

// Fields administrators are allowed to modify
const ALLOWED_FIELDS = [
  "name",
  "description",
  "price",
  "category",
  "brand",
  "stock",
  "images",
];

// Extract and validate allowed product fields
const validateProductData = (body) => {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { error: "Invalid product data" };
  }

  const data = {};

  for (const field of Object.keys(body)) {
    if (!ALLOWED_FIELDS.includes(field)) {
      return {
        error: `Field '${field}' cannot be modified`,
      };
    }
  }

  for (const field of ALLOWED_FIELDS) {
    if (!Object.hasOwn(body, field)) continue;

    const value = body[field];

    if (["name", "description", "category", "brand"].includes(field)) {
      if (typeof value !== "string" || !value.trim()) {
        return { error: `Invalid ${field}` };
      }

      data[field] = value.trim();
    }

    if (field === "price" || field === "stock") {
      if (typeof value !== "number" && typeof value !== "string") {
        return { error: `Invalid ${field}` };
      }

      if (typeof value === "string" && !value.trim()) {
        return { error: `Invalid ${field}` };
      }

      const number = Number(value);

      if (!Number.isFinite(number) || number < 0) {
        return {
          error: `${field} must be a non-negative number`,
        };
      }

      if (field === "stock" && !Number.isSafeInteger(number)) {
        return {
          error: "Stock must be a whole number",
        };
      }

      data[field] = number;
    }

    if (field === "images") {
      if (
        !Array.isArray(value) ||
        value.length > 5 ||
        value.some(
          (image) =>
            typeof image !== "string" || !image.trim() || image.length > 2048,
        )
      ) {
        return {
          error: "Provide a maximum of 5 valid product images",
        };
      }

      const images = value.map((image) => image.trim());

      // Support local product images and Cloudinary images
      const validImages = images.every((image) => {
        if (
          /^\/images\/products\/[a-zA-Z0-9_.-]+\.(jpg|jpeg|png|webp)$/i.test(
            image,
          )
        ) {
          return true;
        }

        try {
          const url = new URL(image);

          return (
            url.protocol === "https:" &&
            url.hostname === "res.cloudinary.com" &&
            !url.username &&
            !url.password &&
            !url.port
          );
        } catch {
          return false;
        }
      });

      if (!validImages) {
        return {
          error: "Invalid product image URL",
        };
      }

      data[field] = images;
    }
  }

  if (Object.keys(data).length === 0) {
    return { error: "No valid product fields provided" };
  }

  return { data };
};

// Calculate actual customer ratings
const attachReviewStats = async (products) => {
  if (products.length === 0) {
    return [];
  }

  const productIds = products.map((product) => product._id);

  const reviewStats = await Review.aggregate([
    {
      $match: {
        product: { $in: productIds },
      },
    },
    {
      $group: {
        _id: "$product",
        averageRating: { $avg: "$rating" },
        totalReviews: { $sum: 1 },
      },
    },
  ]);

  const statsMap = new Map(
    reviewStats.map((stat) => [
      stat._id.toString(),
      {
        averageRating: Number(stat.averageRating.toFixed(1)),
        totalReviews: stat.totalReviews,
      },
    ]),
  );

  return products.map((product) => {
    const stats = statsMap.get(product._id.toString());

    const productData =
      typeof product.toObject === "function" ? product.toObject() : product;

    return {
      ...productData,
      rating: stats?.averageRating ?? 0,
      averageRating: stats?.averageRating ?? 0,
      totalReviews: stats?.totalReviews ?? 0,
    };
  });
};

// Safe product error responses
const handleProductError = (res, error, message) => {
  if (error.name === "CastError") {
    return res.status(400).json({
      success: false,
      message: "Invalid product data or ID",
    });
  }

  if (error.name === "ValidationError") {
    return res.status(400).json({
      success: false,
      message: "Product validation failed",
    });
  }

  console.error("Product error:", error.name);

  return res.status(500).json({
    success: false,
    message,
  });
};

// GET /api/products
export const getProducts = async (req, res) => {
  try {
    const {
      search,
      category,
      minPrice,
      maxPrice,
      sort = "newest",
      page = "1",
      limit = "10",
    } = req.query;

    // Reject arrays and objects in query parameters
    const parameters = [
      search,
      category,
      minPrice,
      maxPrice,
      sort,
      page,
      limit,
    ];

    if (
      parameters.some(
        (value) => value !== undefined && typeof value !== "string",
      )
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid query parameters",
      });
    }

    const filter = {};

    // Validate search
    if (search && search.trim()) {
      if (search.trim().length > 200) {
        return res.status(400).json({
          success: false,
          message: "Search query is too long",
        });
      }

      filter.$text = {
        $search: search.trim(),
      };
    }

    // Category filter
    if (category && category.trim()) {
      if (category.trim().length > 100) {
        return res.status(400).json({
          success: false,
          message: "Invalid category",
        });
      }

      filter.category = category.trim();
    }

    // Price filter validation
    const minimum =
      minPrice !== undefined && minPrice.trim() !== ""
        ? Number(minPrice)
        : undefined;

    const maximum =
      maxPrice !== undefined && maxPrice.trim() !== ""
        ? Number(maxPrice)
        : undefined;

    if (
      [minimum, maximum].some(
        (value) =>
          value !== undefined && (!Number.isFinite(value) || value < 0),
      )
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid price range",
      });
    }

    if (minimum !== undefined && maximum !== undefined && minimum > maximum) {
      return res.status(400).json({
        success: false,
        message: "Minimum price cannot exceed maximum price",
      });
    }

    if (minimum !== undefined || maximum !== undefined) {
      filter.price = {};

      if (minimum !== undefined) {
        filter.price.$gte = minimum;
      }

      if (maximum !== undefined) {
        filter.price.$lte = maximum;
      }
    }

    // Allowed sorting options
    const sortOptions = {
      newest: { createdAt: -1, _id: -1 },
      oldest: { createdAt: 1, _id: 1 },
      "price-low": { price: 1, _id: 1 },
      "price-high": { price: -1, _id: 1 },
      "name-asc": { name: 1, _id: 1 },
      "name-desc": { name: -1, _id: 1 },
    };

    if (!Object.hasOwn(sortOptions, sort)) {
      return res.status(400).json({
        success: false,
        message: "Invalid sort option",
      });
    }

    // Pagination validation
    const currentPage = Number(page);
    const pageSize = Number(limit);

    if (
      !Number.isSafeInteger(currentPage) ||
      !Number.isSafeInteger(pageSize) ||
      currentPage < 1 ||
      currentPage > 10000 ||
      pageSize < 1 ||
      pageSize > 100
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid page or limit",
      });
    }

    const totalProducts = await Product.countDocuments(filter);

    const totalPages = Math.ceil(totalProducts / pageSize);

    const products = await Product.find(filter)
      .sort(sortOptions[sort])
      .skip((currentPage - 1) * pageSize)
      .limit(pageSize)
      .lean();

    const productsWithRatings = await attachReviewStats(products);

    return res.status(200).json({
      success: true,
      count: productsWithRatings.length,
      totalProducts,
      currentPage,
      totalPages,
      products: productsWithRatings,
    });
  } catch (error) {
    return handleProductError(res, error, "Failed to fetch products");
  }
};

// GET /api/products/:id
export const getProductById = async (req, res) => {
  try {
    if (!mongoose.isObjectIdOrHexString(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid product ID",
      });
    }

    const product = await Product.findById(req.params.id).lean();

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    const [productWithRatings] = await attachReviewStats([product]);

    return res.status(200).json({
      success: true,
      product: productWithRatings,
    });
  } catch (error) {
    return handleProductError(res, error, "Failed to fetch product");
  }
};

// POST /api/products
export const createProduct = async (req, res) => {
  try {
    const { data, error } = validateProductData(req.body);

    if (error) {
      return res.status(400).json({
        success: false,
        message: error,
      });
    }

    const product = await Product.create(data);

    return res.status(201).json({
      success: true,
      message: "Product created successfully",
      product: {
        ...product.toObject(),
        rating: 0,
        averageRating: 0,
        totalReviews: 0,
      },
    });
  } catch (error) {
    return handleProductError(res, error, "Failed to create product");
  }
};

// PUT /api/products/:id
export const updateProduct = async (req, res) => {
  try {
    if (!mongoose.isObjectIdOrHexString(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid product ID",
      });
    }

    const { data, error } = validateProductData(req.body);

    if (error) {
      return res.status(400).json({
        success: false,
        message: error,
      });
    }

    const product = await Product.findByIdAndUpdate(
      req.params.id,
      { $set: data },
      {
        new: true,
        runValidators: true,
      },
    );

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    // Do not report a failed update if only rating retrieval fails
    let productWithRatings = product.toObject();

    try {
      [productWithRatings] = await attachReviewStats([product]);
    } catch (ratingError) {
      console.error("Rating lookup error:", ratingError.name);

      delete productWithRatings.rating;
    }

    return res.status(200).json({
      success: true,
      message: "Product updated successfully",
      product: productWithRatings,
    });
  } catch (error) {
    return handleProductError(res, error, "Failed to update product");
  }
};

// DELETE /api/products/:id
export const deleteProduct = async (req, res) => {
  try {
    if (!mongoose.isObjectIdOrHexString(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid product ID",
      });
    }

    const product = await Product.findByIdAndDelete(req.params.id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Product deleted successfully",
      product,
    });
  } catch (error) {
    return handleProductError(res, error, "Failed to delete product");
  }
};
