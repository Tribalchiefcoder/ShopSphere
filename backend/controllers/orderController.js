import mongoose from "mongoose";
import Order from "../models/Order.js";
import Product from "../models/Product.js";

// Place a new order
export const createOrder = async (req, res) => {
  const { items, shippingAddress } = req.body;

  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({
      success: false,
      message: "Your cart is empty.",
    });
  }

  const requiredAddressFields = [
    "fullName",
    "phone",
    "address",
    "city",
    "state",
    "postalCode",
  ];

  if (
    !shippingAddress ||
    requiredAddressFields.some(
      (field) => !shippingAddress[field]?.toString().trim(),
    )
  ) {
    return res.status(400).json({
      success: false,
      message: "Please provide complete shipping information.",
    });
  }

  for (const item of items) {
    if (
      !mongoose.isValidObjectId(item.productId) ||
      !Number.isInteger(item.quantity) ||
      item.quantity < 1
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid product or quantity.",
      });
    }
  }

  const session = await mongoose.startSession();

  try {
    let createdOrder;

    await session.withTransaction(async () => {
      const orderItems = [];
      let totalAmount = 0;

      for (const item of items) {
        const product = await Product.findById(item.productId).session(session);

        if (!product) {
          throw new Error("A product in your cart no longer exists.");
        }

        if (product.stock < item.quantity) {
          throw new Error(
            `Insufficient stock for ${product.name}. Available: ${product.stock}`,
          );
        }

        const stockUpdate = await Product.updateOne(
          {
            _id: product._id,
            stock: { $gte: item.quantity },
          },
          {
            $inc: { stock: -item.quantity },
          },
          { session },
        );

        if (stockUpdate.modifiedCount !== 1) {
          throw new Error(
            `Stock changed while ordering ${product.name}. Please try again.`,
          );
        }

        const itemTotal = product.price * item.quantity;
        totalAmount += itemTotal;

        orderItems.push({
          product: product._id,
          name: product.name,
          price: product.price,
          quantity: item.quantity,
          image: product.images?.[0] || "",
        });
      }

      const orders = await Order.create(
        [
          {
            user: req.user._id,
            items: orderItems,
            totalAmount,
            shippingAddress,
            paymentMethod: "COD",
            paymentStatus: "Pending",
            orderStatus: "Processing",
          },
        ],
        { session },
      );

      createdOrder = orders[0];
    });

    res.status(201).json({
      success: true,
      message: "Order placed successfully!",
      order: createdOrder,
    });
  } catch (error) {
    console.error("Order creation error:", error.message);

    res.status(400).json({
      success: false,
      message: error.message || "Failed to place order.",
    });
  } finally {
    await session.endSession();
  }
};

// Get orders belonging to the logged-in customer
export const getMyOrders = async (req, res) => {
  try {
    const orders = await Order.find({
      user: req.user._id,
    })
      .populate("items.product", "name images")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: orders.length,
      orders,
    });
  } catch (error) {
    console.error("Fetch orders error:", error.message);

    res.status(500).json({
      success: false,
      message: "Failed to fetch your orders.",
    });
  }
};

// Get all customer orders (admin only)
export const getAllOrders = async (req, res) => {
  try {
    const orders = await Order.find()
      .populate("user", "name email")
      .populate("items.product", "name images")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: orders.length,
      orders,
    });
  } catch (error) {
    console.error("Fetch all orders error:", error.message);

    res.status(500).json({
      success: false,
      message: "Failed to fetch orders.",
    });
  }
};

// Update order status (admin only)
export const updateOrderStatus = async (req, res) => {
  const { status } = req.body;
  const { orderId } = req.params;

  const allowedStatuses = ["Processing", "Shipped", "Delivered", "Cancelled"];

  if (!mongoose.isValidObjectId(orderId)) {
    return res.status(400).json({
      success: false,
      message: "Invalid order ID.",
    });
  }

  if (!allowedStatuses.includes(status)) {
    return res.status(400).json({
      success: false,
      message: "Invalid order status.",
    });
  }

  const session = await mongoose.startSession();

  try {
    let updatedOrder;

    await session.withTransaction(async () => {
      const order = await Order.findById(orderId).session(session);

      if (!order) {
        throw new Error("Order not found.");
      }

      if (order.orderStatus === "Cancelled") {
        throw new Error("This order has already been cancelled.");
      }

      if (order.orderStatus === "Delivered" && status !== "Delivered") {
        throw new Error("A delivered order cannot be changed.");
      }

      // Restore product stock when an order is cancelled
      if (status === "Cancelled") {
        for (const item of order.items) {
          await Product.updateOne(
            { _id: item.product },
            { $inc: { stock: item.quantity } },
            { session },
          );
        }
      }

      // Update order delivery status
      order.orderStatus = status;

      // Mark COD payment as Paid when delivered
      if (status === "Delivered" && order.paymentMethod === "COD") {
        order.paymentStatus = "Paid";
      }

      // Save both changes in the same transaction
      updatedOrder = await order.save({ session });
    });

    res.status(200).json({
      success: true,
      message: "Order status updated successfully.",
      order: updatedOrder,
    });
  } catch (error) {
    console.error("Update order status error:", error.message);

    const statusCode = error.message === "Order not found." ? 404 : 400;

    res.status(statusCode).json({
      success: false,
      message: error.message || "Failed to update order status.",
    });
  } finally {
    await session.endSession();
  }
};
