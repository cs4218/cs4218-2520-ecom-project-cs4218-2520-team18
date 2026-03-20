// Aw Jean Leng Adrian, A0277537N

import orderModel from "../models/orderModel.js";

//orders
export const getOrdersController = async (req, res) => {
  try {
    const orders = await orderModel
      .find({ buyer: req.user._id })
      .populate("products", "-photo")
      .populate("buyer", "name");
    res.json(orders);
  } catch (error) {
    console.log(error);
    res.status(500).send({
      success: false,
      message: "Error while getting orders",
      error,
    });
  }
};
//orders
export const getAllOrdersController = async (req, res) => {
  try {
    const orders = await orderModel
      .find({})
      .populate("products", "-photo")
      .populate("buyer", "name")
      .sort({ createdAt: -1 });
    res.json(orders);
  } catch (error) {
    console.log(error);
    res.status(500).send({
      success: false,
      message: "Error while getting all orders",
      error,
    });
  }
};

//order status
export const orderStatusController = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status } = req.body;

    // Validate status value
    const validStatuses = ["Not Processed", "Processing", "Shipped", "Delivered", "Cancelled"];
    if (!validStatuses.includes(status)) {
      return res.status(400).send({
        success: false,
        message: "Invalid status value",
      });
    }

    const orders = await orderModel.findByIdAndUpdate(
      orderId,
      { status },
      { new: true }
    );

    if (!orders) {
      return res.status(404).send({
        success: false,
        message: "Order not found",
      });
    }

    res.json(orders);
  } catch (error) {
    console.log(error);
    res.status(500).send({
      success: false,
      message: "Error while updating order",
      error,
    });
  }
};