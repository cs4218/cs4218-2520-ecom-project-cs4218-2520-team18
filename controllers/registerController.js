// Loh Ze Qing Norbert, A0277473R

import userModel from "../models/userModel.js";


import { hashPassword } from "../helpers/authHelper.js";
import { validateEmail, validatePhoneE164, validatePassword, validateDOB, validateDOBNotFuture, validateName } from "../helpers/validationHelper.js";

export const registerController = async (req, res) => {
  try {
    let { name, email, password, phone, address, DOB, answer } = req.body;

    // trim inputs
    name = name?.trim();
    email = email?.trim();
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
    if (!validateEmail(email)) {
      return res.status(400).send({ success: false, message: "Invalid Email Format" });
    }

    if (!validatePhoneE164(phone)) {
      return res.status(400).send({ success: false, message: "Invalid Phone Number" });
    }

    if (!validatePassword(password)) {
      return res.status(400).send({
        success: false,
        message: "Password must be at least 6 characters long",
      });
    }

    if (!validateName(name)) {
      return res.status(400).send({
        success: false,
        message: "Name must be between 1 and 100 characters",
      });
    }

    // DOB format validation (YYYY-MM-DD)
    if (!validateDOB(DOB)) {
      return res.status(400).send({ success: false, message: "Invalid DOB or format. Please use YYYY-MM-DD" });
    }
    // Check if DOB is a valid date and not in the future
    if (!validateDOBNotFuture(DOB)) {
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


