import React, { useState } from "react";
import Layout from "./../../components/Layout";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
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
      name: typeof name === 'string' ? name.trim() : name,
      email: typeof email === 'string' ? email.toLowerCase().trim() : email,
      password,
      phone: typeof phone === 'string' ? phone.trim() : phone,
      address: typeof address === 'string' ? address.trim() : address,
      DOB: typeof DOB === 'string' ? DOB.trim() : DOB,
      answer: typeof answer === 'string' ? answer.toLowerCase().trim() : answer,
    };

    // Basic client-side validation (keeps tests predictable) form
    if (!payload.name) {
      toast.error('Name is required');
      return;
    }

    const emailRegex = /^((?:[A-Za-z0-9!#$%&'*+\-\/=?^_`{|}~]|(?<=^|\.)"|"(?=$|\.|@)|(?<=".*)[ .](?=.*")|(?<!\.)\.){1,64})(@)((?:[A-Za-z0-9.\-])*(?:[A-Za-z0-9])\.(?:[A-Za-z0-9]){2,})$/gm;;
    if (!emailRegex.test(payload.email)) {
      toast.error('Invalid Email');
      return;
    }

    if (!payload.password || payload.password.length < 6) {
      toast.error('Password must be at least 6 characters long');
      return;
    }

    const phoneRegex = /^\+?[1-9]\d{1,14}$/;
    if (!phoneRegex.test(payload.phone)) {
      toast.error('Phone number must be in E.164 format');
      return;
    }

    const dobRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dobRegex.test(payload.DOB)) {
      toast.error('Date of Birth must be a valid date');
      return;
    }
    const dobDate = new Date(payload.DOB);
    const today = new Date();
    if (isNaN(dobDate.getTime())) {
      toast.error('Date of Birth must be a valid date');
      return;
    }
    if (dobDate >= new Date(today.toDateString())) {
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