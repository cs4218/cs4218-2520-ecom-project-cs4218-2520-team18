import React, { useState } from "react";
import Layout from "./../../components/Layout";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import {
  isEmpty,
  isValidEmail,
  isValidPhone,
  isValidDOBFormat,
  isValidDOBStrict,
  isDOBNotFuture,
  isPasswordLongEnough,
} from "../../helpers/validation";
import "../../styles/AuthStyles.css";
const Register = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [DOB, setDOB] = useState("");
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // form function
  const handleSubmit = async (e) => {
    e.preventDefault();
    // prepare payload and validate
    const payload = {
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password,
      phone: phone.trim(),
      address: address.trim(),
      DOB: DOB.trim(),
      answer: answer.toLowerCase().trim(),
    };

    // Basic client-side validation (keeps tests predictable) form
    if (!payload.name) {
      toast.error('Name is required');
      return;
    }

    if (!isValidEmail(payload.email)) {
      toast.error('Invalid Email');
      return;
    }

    if (!isPasswordLongEnough(payload.password, 6)) {
      toast.error('Password must be at least 6 characters long');
      return;
    }

    if (!isValidPhone(payload.phone)) {
      toast.error('Phone number must be in E.164 format');
      return;
    }

    if (!isValidDOBFormat(payload.DOB) || !isValidDOBStrict(payload.DOB)) {
      toast.error('Date of Birth must be a valid date');
      return;
    }

    if (!isDOBNotFuture(payload.DOB)) {
      toast.error('Date of Birth cannot be a future date');
      return;
    }

    if (!payload.answer) {
      toast.error('Answer is required');
      return;
    }

    try {
      setLoading(true);
      const res = await axios.post("/api/v1/auth/register", payload);
      if (res && res.data.success) {
        toast.success("Register Successfully, please login");
        navigate("/login");
      } else {
        toast.error(res.data.message);
      }
    } catch (error) {
      console.error(error);
      const message = error?.response?.data?.message || error?.message || "Something went wrong";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout title="Register - Ecommerce App">
      <div className="form-container" style={{ minHeight: "90vh" }}>
        <form onSubmit={handleSubmit} noValidate={process.env.NODE_ENV === 'test'}>
          <h4 className="title">REGISTER FORM</h4>
          <div className="mb-3">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="form-control"
              id="exampleInputName1"
              placeholder="Enter Your Name"
              required
              autoFocus
            />
          </div>
          <div className="mb-3">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="form-control"
              id="exampleInputEmail1"
              placeholder="Enter Your Email"
              required
            />
          </div>
          <div className="mb-3">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="form-control"
              id="exampleInputPassword1"
              placeholder="Enter Your Password"
              required
            />
          </div>
          <div className="mb-3">
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="form-control"
              id="exampleInputPhone1"
              placeholder="Enter Your Phone"
              required
            />
          </div>
          <div className="mb-3">
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="form-control"
              id="exampleInputaddress1"
              placeholder="Enter Your Address"
              required
            />
          </div>
          <div className="mb-3">
            <input
              type="date"
              value={DOB}
              onChange={(e) => setDOB(e.target.value)}
              className="form-control"
              id="exampleInputDOB1"
              placeholder="Enter Your DOB"
              required
            />
          </div>
          <div className="mb-3">
            <input
              type="text"
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              className="form-control"
              id="exampleInputanswer1"
              placeholder="What is Your Favorite sports"
              required
            />
          </div>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            REGISTER
          </button>
        </form>
      </div>
    </Layout>
  );
};

export default Register;