import mongoose from "mongoose";
import { validateDOB, validateEmail, validatePassword, validatePhoneE164, validateDOBNotFuture } from "../helpers/validationHelper.js";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      validate: {
        validator: validateEmail,
        message: "Invalid email format",
      },
    },
    password: {
      type: String,
      required: true,
      validate: {
        validator: validatePassword,
        message: "Password must be at least 6 characters long",
      },
    },
    phone: {
      type: String,
      required: true,
      trim: true,
        validate: {
        validator: validatePhoneE164,
        message: "Phone number must be in E.164 format",
      },
    },
    address: {
      type: String,
      required: true,
      trim: true,
    },
    answer: {
      type: String,
      required: true,
      trim: true,
    },
    DOB: {
      type: String,
      required: true,
      trim: true,
        validate: {
        validator: (DOB) => {
          return validateDOB(DOB) && validateDOBNotFuture(DOB);
        },
        message: "DOB must be in YYYY-MM-DD format and not a future date",
      },
    },
    role: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

export default mongoose.model("users", userSchema);