// Loh Ze Qing Norbert, A0277473R

import JWT from "jsonwebtoken";
import { comparePassword } from "../helpers/authHelper.js";
import { validateEmail } from "../helpers/validationHelper.js";
import userModel from "../models/userModel.js";

//POST LOGIN

export const loginController = async (req, res) => {
    try {
        let { email, password } = req.body;

        // trim inputs
        email = email?.trim();

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

        if (!validateEmail(email)) {
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
