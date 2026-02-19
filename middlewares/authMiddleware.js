// Loh Ze Qing Norbert, A0277473R

import JWT from "jsonwebtoken";
import userModel from "../models/userModel.js";

// Protected routes token base
export const requireSignIn = async (req, res, next) => {
    try {
        // Check if authorization header is present
        const authHeader = req.headers.authorization;
        if (!authHeader || authHeader.toLowerCase() === "bearer") {
            return res.status(401).send({
                success: false,
                message: "Authorization header is invalid",
            });
        }

        // Extract token, handles "Bearer <token>" and just "<token>" (case-insensitive)
        const token = authHeader.toLowerCase().startsWith("bearer ") ? authHeader.split(" ")[1] : authHeader;
        const decode = JWT.verify(token, process.env.JWT_SECRET);
        req.user = decode;
        next();
    } catch (error) {
        console.error(error);
        return res.status(401).send({
            success: false,
            error,
            message: "Unauthorized Access",
        });
    }
};

//admin access
export const isAdmin = async (req, res, next) => {
    try {
        if (!req.user) {
            return res.status(401).send({
                success: false,
                message: "Authentication required",
            });
        }
        const user = await userModel.findById(req.user._id);
        if (!user || user.role !== 1) {
            return res.status(403).send({
                success: false,
                message: "Unauthorized Access",
            });
        } else {
            next();
        }
    } catch (error) {
        console.error(error);
        return res.status(500).send({
            success: false,
            error,
            message: "Error in Auth Middleware",
        });
    }
};