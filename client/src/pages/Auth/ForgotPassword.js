import React from "react";
import { useState } from "react";
import Layout from "./../../components/Layout";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { isValidEmail, isPasswordLongEnough } from "../../helpers/validation";
import "../../styles/AuthStyles.css";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [answer, setAnswer] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // form function
  const handleSubmit = async (e) => {
    e.preventDefault();
    // normalize inputs
    const payload = {
      email: email.toLowerCase().trim(),
      answer: answer.toLowerCase().trim(),
      newPassword,
    };

    // client-side validation
    if (!payload.email) {
      toast.error("Email is required");
      return;
    }

    if (!isValidEmail(payload.email)) {
      toast.error("Invalid email format");
      return;
    }

    if (!payload.answer) {
      toast.error("Security answer is required");
      return;
    }

    if (!payload.newPassword) {
      toast.error("New password is required");
      return;
    }

    if (!isPasswordLongEnough(payload.newPassword)) {
      toast.error("New password must be at least 6 characters long");
      return;
    }

    setLoading(true);
    try {
      const res = await axios.post("/api/v1/auth/forgot-password", {
        email: payload.email,
        answer: payload.answer,
        newPassword: payload.newPassword,
      });
      if (res && res.data.success) {
        toast.success(res.data.message);
        navigate("/login");
      } else {
        toast.error(res.data.message);
      }
    } catch (error) {
      console.error(error);
      const message = error?.response?.data?.message || error?.message || "An unexpected error occurred";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };
  return (
    <Layout title="Forgot Password - Ecommerce App">
      <div className="form-container " style={{ minHeight: "90vh" }}>
        <form onSubmit={handleSubmit} noValidate={process.env.NODE_ENV === 'test'}>
          <h4 className="title">Forgot Password</h4>

          <div className="mb-3">
            <input
              type="email"
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="form-control"
              id="exampleInputEmail1"
              placeholder="Enter Your Email "
              required
            />
          </div>
          <div className="mb-3">
            <input
              type="text"
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              className="form-control"
              placeholder="Enter Your Security Answer"
              required
            />
          </div>
          <div className="mb-3">
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="form-control"
              placeholder="Enter Your New Password"
              required
            />
          </div>
          <div className="mb-3">
            <button type="submit" className="btn btn-primary" disabled={loading}>
              RESET PASSWORD
            </button>
          </div>
        </form>
      </div>
    </Layout>
  );
};

export default ForgotPassword;