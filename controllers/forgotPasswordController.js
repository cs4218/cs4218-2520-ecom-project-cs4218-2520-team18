import { hashPassword } from "../helpers/authHelper.js";
import { validateEmail, validatePassword } from "../helpers/validationHelper.js";
import userModel from "../models/userModel.js";

//forgotPasswordController

export const forgotPasswordController = async (req, res) => {
    try {
        let { email, answer, newPassword } = req.body;

        // trim inputs
        email = email?.trim();
        answer = answer?.trim();

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

        if (!validateEmail(email)) {
            return res.status(400).send({ success: false, message: "Invalid Email or Answer" });
        }

        if (!validatePassword(newPassword)) {
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
