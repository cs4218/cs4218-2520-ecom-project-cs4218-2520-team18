import orderModel from "../../models/orderModel.js";
import productModel from "../../models/productModel.js";

// E2E Test helper - Create order for testing (only available in test mode)
export const createTestOrderController = async (req, res) => {
  try {
    // Only allow in test mode
    if (process.env.DEV_MODE !== "test") {
      return res.status(403).send({
        success: false,
        message: "This endpoint is only available in test mode",
      });
    }

    const { products, payment, status, createdAt } = req.body;

    // Validate required fields
    if (!products || !Array.isArray(products) || products.length === 0) {
      return res.status(400).send({
        success: false,
        message: "Products array is required",
      });
    }

    // Fetch actual product IDs if product slugs are provided
    let productIds = [];
    for (const product of products) {
      if (product.slug) {
        const productDoc = await productModel.findOne({ slug: product.slug });
        if (productDoc) {
          productIds.push(productDoc._id);
        }
      } else if (product._id) {
        productIds.push(product._id);
      }
    }

    if (productIds.length === 0) {
      return res.status(400).send({
        success: false,
        message: "No valid products found",
      });
    }

    const orderData = {
      products: productIds,
      payment: payment || { success: true },
      buyer: req.user._id,
      status: status || "Not Processed",
    };

    const order = new orderModel(orderData);

    // Allow setting createdAt for testing date formatting
    if (createdAt) {
      order.createdAt = new Date(createdAt);
    }

    await order.save();

    const populatedOrder = await orderModel
      .findById(order._id)
      .populate("products", "-photo")
      .populate("buyer", "name");

    res.status(201).json({
      success: true,
      message: "Test order created successfully",
      order: populatedOrder,
    });
  } catch (error) {
    console.log(error);
    res.status(500).send({
      success: false,
      message: "Error creating test order",
      error: error.message,
    });
  }
};

// E2E Test helper - Delete all orders for a user (only available in test mode)
export const deleteTestOrdersController = async (req, res) => {
  try {
    // Only allow in test mode
    if (process.env.DEV_MODE !== "test") {
      return res.status(403).send({
        success: false,
        message: "This endpoint is only available in test mode",
      });
    }

    await orderModel.deleteMany({ buyer: req.user._id });

    res.status(200).json({
      success: true,
      message: "All test orders deleted successfully",
    });
  } catch (error) {
    console.log(error);
    res.status(500).send({
      success: false,
      message: "Error deleting test orders",
      error: error.message,
    });
  }
};
