import userModel from "../models/userModel.js";


import { comparePassword, hashPassword } from "./../helpers/authHelper.js";
import JWT from "jsonwebtoken";

export const registerController = async (req, res) => {
  try {
    let { name, email, password, phone, address, DOB, answer } = req.body;

    // trim inputs
    name = name?.trim();
    email = email?.trim();
    password = password?.trim();
    phone = phone?.trim();
    address = address?.trim();
    DOB = DOB?.trim();
    answer = answer?.trim();

    //validations
    if (!name) {
      return res.status(400).send({ success: false, message: "Name is Required" });
    }
    if (!email) {
      return res.status(400).send({ success: false, message: "Email is Required" });
    }
    if (!password) {
      return res.status(400).send({ success: false, message: "Password is Required" });
    }
    if (!phone) {
      return res.status(400).send({ success: false, message: "Phone no. is Required" });
    }
    if (!address) {
      return res.status(400).send({ success: false, message: "Address is Required" });
    }
    if (!DOB) {
      return res.status(400).send({ success: false, message: "DOB is Required" });
    }
    if (!answer) {
      return res.status(400).send({ success: false, message: "Answer is Required" });
    }

    // normalise inputs
    email = email.toLowerCase();
    answer = answer.toLowerCase();

    // Email format validation
    // RFC 5322 Official Standard Email Regex
    const emailRegex = /^((?:[A-Za-z0-9!#$%&'*+\-\/=?^_`{|}~]|(?<=^|\.)"|"(?=$|\.|@)|(?<=".*)[ .](?=.*")|(?<!\.)\.){1,64})(@)((?:[A-Za-z0-9.\-])*(?:[A-Za-z0-9])\.(?:[A-Za-z0-9]){2,})$/gm;
    if (!emailRegex.test(email)) {
      return res.status(400).send({ success: false, message: "Invalid Email Format" });
    }

    const phoneRegex = /^\+?[1-9]\d{1,14}$/; // E.164 format
    if (!phoneRegex.test(phone)) {
      return res.status(400).send({ success: false, message: "Invalid Phone Number" });
    }

    if (password.length < 6) {
      return res.status(400).send({
        success: false,
        message: "Password must be at least 6 characters long",
      });
    }

    // DOB format validation (YYYY-MM-DD)
    const dobRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dobRegex.test(DOB)) {
      return res.status(400).send({ success: false, message: "Invalid DOB format. Please use YYYY-MM-DD" });
    }
    // Check if DOB is a valid date and not in the future
    const dobDate = new Date(DOB);
    const now = new Date();
    if (isNaN(dobDate.getTime()) || dobDate > now) {
      return res.status(400).send({ success: false, message: "Invalid or future DOB" });
    }



    //check user
    const exisitingUser = await userModel.findOne({ email });
    //exisiting user
    if (exisitingUser) {
      return res.status(200).send({
        success: false,
        message: "Already registered, please login",
      });
    }
    //register user
    const hashedPassword = await hashPassword(password);
    //save
    const user = await new userModel({
      name,
      email,
      phone,
      address,
      password: hashedPassword,
      DOB,
      answer,
    }).save();

    // Exclude password and answer from the response
    const { password: pwd, answer: ans, ...userWithoutSensitive } = user._doc;
    return res.status(201).send({
      success: true,
      message: "User Registered Successfully",
      user: userWithoutSensitive,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).send({
      success: false,
      message: "Error in Registration",
      error,
    });
  }
};

//POST LOGIN
export const loginController = async (req, res) => {
  try {
    let { email, password } = req.body;

    // trim inputs
    email = email?.trim();
    password = password?.trim();

    const invalidError = "Invalid Email or Password";
    //validation
    if (!email || !password) {
      return res.status(400).send({
        success: false,
        message: invalidError,
      });
    }

    // normalise inputs AFTER validation
    email = email.toLowerCase();
    //check user
    const user = await userModel.findOne({ email });
    if (!user) {
      return res.status(400).send({
        success: false,
        message: invalidError,
      });
    }
    const match = await comparePassword(password, user.password);
    if (!match) {
      return res.status(400).send({
        success: false,
        message: invalidError,
      });
    }

    const emailRegex = /^((?:[A-Za-z0-9!#$%&'*+\-\/=?^_`{|}~]|(?<=^|\.)"|"(?=$|\.|@)|(?<=".*)[ .](?=.*")|(?<!\.)\.){1,64})(@)((?:[A-Za-z0-9.\-])*(?:[A-Za-z0-9])\.(?:[A-Za-z0-9]){2,})$/gm;
    if (!emailRegex.test(email)) {
      return res.status(400).send({ success: false, message: invalidError });
    }

    //token
    const token = await JWT.sign({ _id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });
    return res.status(200).send({
      success: true,
      message: "Login Successful",
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        address: user.address,
        DOB: user.DOB,
        role: user.role,
      },
      token,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).send({
      success: false,
      message: "Error in Login",
      error,
    });
  }
};

//forgotPasswordController

export const forgotPasswordController = async (req, res) => {
  try {
    let { email, answer, newPassword } = req.body;

    // trim inputs
    email = email?.trim();
    answer = answer?.trim();
    newPassword = newPassword?.trim();

    // validation
    if (!email) {
      return res.status(400).send({ success: false, message: "Email is required" });
    }
    if (!answer) {
      return res.status(400).send({ success: false, message: "Answer is required" });
    }
    if (!newPassword) {
      return res.status(400).send({ success: false, message: "New password is required" });
    }

    // normalise inputs AFTER validation
    email = email.toLowerCase();
    answer = answer.toLowerCase();

    const emailRegex = /^((?:[A-Za-z0-9!#$%&'*+\-\/=?^_`{|}~]|(?<=^|\.)"|"(?=$|\.|@)|(?<=".*)[ .](?=.*")|(?<!\.)\.){1,64})(@)((?:[A-Za-z0-9.\-])*(?:[A-Za-z0-9])\.(?:[A-Za-z0-9]){2,})$/gm;
    if (!emailRegex.test(email)) {
      return res.status(400).send({ success: false, message: "Invalid Email or Answer" });
    }

    if (newPassword.length < 6) {
      return res.status(400).send({
        success: false,
        message: "New password must be at least 6 characters long",
      });
    }

    //check
    const user = await userModel.findOne({ email, answer });
    //validation
    if (!user) {
      return res.status(400).send({
        success: false,
        message: "Invalid Email or Answer",
      });
    }
    const hashed = await hashPassword(newPassword);
    await userModel.findByIdAndUpdate(user._id, { password: hashed });
    return res.status(200).send({
      success: true,
      message: "Password Reset Successfully",
    });
  } catch (error) {
    console.error(error);
    return res.status(500).send({
      success: false,
      message: "Error in Forgot Password",
      error,
    });
  }
};

//test controller
export const testController = (req, res) => {
  try {
    return res.status(200).send({
      success: true,
      message: "Protected route accessed successfully",
    });
  } catch (error) {
    console.error(error);
    return res.status(500).send({
      success: false,
      message: "Error in Test",
      error,
    });
  }
};

//update prfole
export const updateProfileController = async (req, res) => {
  try {
    const { name, email, password, address, phone } = req.body;
    const user = await userModel.findById(req.user._id);
    //password
    if (password && password.length < 6) {
      return res.json({ error: "Passsword is required and 6 character long" });
    }
    const hashedPassword = password ? await hashPassword(password) : undefined;
    const updatedUser = await userModel.findByIdAndUpdate(
      req.user._id,
      {
        name: name || user.name,
        password: hashedPassword || user.password,
        phone: phone || user.phone,
        address: address || user.address,
      },
      { new: true }
    );
    res.status(200).send({
      success: true,
      message: "Profile Updated SUccessfully",
      updatedUser,
    });
  } catch (error) {
    console.log(error);
    res.status(400).send({
      success: false,
      message: "Error WHile Update profile",
      error,
    });
  }
};

