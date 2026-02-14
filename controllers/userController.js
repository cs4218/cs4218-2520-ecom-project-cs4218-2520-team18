import userModel from "../models/userModel.js";
import { hashPassword } from "../helpers/authHelper.js";
import { validatePhoneE164, validatePassword, validateDOB, validateDOBNotFuture } from "../helpers/validationHelper.js";

// Update profile
export const updateProfileController = async (req, res) => {
  try {
    if (Object.keys(req.body).length === 0) {
      return res.status(400).send({ success: false, message: "Request body is empty" });
    }

    let { name, password, address, phone, DOB } = req.body;

    // Check null
    const fields = ["name", "password", "address", "phone", "DOB"];
    for (const field of fields) {
      if (req.body[field] !== undefined && req.body[field] === null) {
        return res.status(400).send({ success: false, message: `Invalid input. ${field} cannot be null.` });
      }
    }

    // Trim inputs
    if (name) name = name.trim();
    if (address) address = address.trim();
    if (phone) phone = phone.trim();
    if (DOB) DOB = DOB.trim();

    if (name !== undefined && (!name)) {
      return res.status(400).send({ success: false, message: "Name cannot be empty" });
    }
    if (password !== undefined && !password) {
      return res.status(400).send({ success: false, message: "Password cannot be empty" });
    }
    if (address !== undefined && !address) {
      return res.status(400).send({ success: false, message: "Address cannot be empty" });
    }
    if (phone !== undefined && !phone) {
      return res.status(400).send({ success: false, message: "Phone cannot be empty" });
    }
    if (DOB !== undefined && !DOB) {
      return res.status(400).send({ success: false, message: "DOB cannot be empty" });
    }

    if (password !== undefined && !validatePassword(password)) {
      return res.status(400).send({ success: false, message: "Password must be at least 6 characters long" });
    }
    if (phone !== undefined && !validatePhoneE164(phone)) {
      return res.status(400).send({ success: false, message: "Invalid Phone Number" });
    }
    if (DOB !== undefined && !validateDOB(DOB)) {
      return res.status(400).send({ success: false, message: "Invalid DOB format. Please use YYYY-MM-DD" });
    }
    if (DOB !== undefined && !validateDOBNotFuture(DOB)) {
      return res.status(400).send({ success: false, message: "Invalid or future DOB" });
    }

    const user = await userModel.findById(req.user._id);

    if (!user) {
      return res.status(404).send({ success: false, message: "User not found" });
    }

    const hashedPassword = password ? await hashPassword(password) : undefined;
    const updatedUser = await userModel.findByIdAndUpdate(
      req.user._id,
      {
        name: name || user.name,
        password: hashedPassword || user.password,
        phone: phone || user.phone,
        address: address || user.address,
        DOB: DOB || user.DOB,
      },
      { new: true }
    );
    const { password: _password, ...updatedUserSensitive } = updatedUser;
    return res.status(200).send({
      success: true,
      message: "Profile Updated Successfully",
      updatedUser: updatedUserSensitive,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).send({
      success: false,
      message: "Error while updating profile",
      error,
    });
  }
};