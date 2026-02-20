// Loh Ze Qing Norbert, A0277473R

import React, { useState, useEffect } from "react";
import UserMenu from "../../components/UserMenu";
import Layout from "./../../components/Layout";
import { useAuth } from "../../context/auth";
import toast from "react-hot-toast";
import {
  isValidPhone,
  isValidDOBFormat,
  isValidDOBStrict,
  isDOBNotFuture,
  isPasswordLongEnough,
} from "../../helpers/validation";
import axios from "axios";
const Profile = () => {
  //context
  const [auth, setAuth] = useAuth();
  //state
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [DOB, setDOB] = useState("");
  const [loading, setLoading] = useState(false);

  //get user data
  useEffect(() => {
    const { email, name, phone, address, DOB } = auth?.user || {};
    setName(name || "");
    setPhone(phone || "");
    setEmail(email || "");
    setAddress(address || "");
    setDOB(DOB || "");
  }, [auth?.user]);

  // form function
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // trim name and address (but do NOT trim password), email is not editable
      const payload = {
        name: name.trim(),
        email: email,
        password,
        phone: phone.trim(),
        address: address.trim(),
      };

      // client-side validation
      if (!payload.name || payload.name.length > 100) {
        toast.error('Name should be 1 to 100 characters');
        return;
      }

      if (!payload.phone) {
        toast.error("Phone number is required");
        return;
      }



      if (!isValidPhone(payload.phone)) {
        toast.error("Phone number must be in E.164 format");
        return;
      }

      if (!DOB) {
        toast.error("Date of Birth is required");
        return;
      }

      if (!isValidDOBFormat(DOB)) {
        toast.error("Date of Birth must be in YYYY-MM-DD format");
        return;
      }
      if (!isValidDOBStrict(DOB)) {
        toast.error("Date of Birth must be in YYYY-MM-DD format");
        return;
      }
      if (!isDOBNotFuture(DOB)) {
        toast.error("Date of Birth cannot be in the future");
        return;
      }

      if (!payload.address) {
        toast.error("Address is required");
        return;
      }

      if (password && !isPasswordLongEnough(password, 6)) {
        toast.error("Password must be at least 6 characters");
        return;
      }

      setLoading(true);
      const { data } = await axios.put("/api/v1/auth/profile", payload);
      // If the API indicates failure { success: false, message }
      // or includes an `error` field show the message and stop.
      if (data?.success === false || data?.error) {
        const msg = data?.error || data?.message || "Profile Update Failed";
        toast.error(msg);
        setLoading(false);
        return;
      }
      setAuth({ ...auth, user: data?.updatedUser });
      let ls = localStorage.getItem("auth");
      ls = JSON.parse(ls);
      ls.user = data.updatedUser;
      localStorage.setItem("auth", JSON.stringify(ls));
      toast.success("Profile Updated Successfully");
      setLoading(false);
    } catch (error) {
      console.error(error);
      toast.error("Profile Update Failed");
      setLoading(false);
    }
  };
  return (
    <Layout title={"Your Profile"}>
      <div className="container-fluid m-3 p-3">
        <div className="row">
          <div className="col-md-3">
            <UserMenu />
          </div>
          <div className="col-md-9">
            <div className="form-container ">
              <form onSubmit={handleSubmit}>
                <h4 className="title">USER PROFILE</h4>
                <div className="mb-3">
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="form-control"
                    id="exampleInputEmail1"
                    placeholder="Enter Your Name"
                    autoFocus
                  />
                </div>
                <div className="mb-3">
                  <input
                    type="email"
                    value={email}
                    className="form-control"
                    id="exampleInputEmail1"
                    placeholder="Enter Your Email"
                    disabled
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
                  />
                </div>
                <div className="mb-3">
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="form-control"
                    id="exampleInputEmail1"
                    placeholder="Enter Your Phone Number"
                  />
                </div>
                <div className="mb-3">
                  <input
                    type="date"
                    value={DOB}
                    onChange={(e) => setDOB(e.target.value)}
                    className="form-control"
                    id="exampleInputDOB"
                    placeholder="Enter Your DOB"
                  />
                </div>
                <div className="mb-3">
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="form-control"
                    id="exampleInputEmail1"
                    placeholder="Enter Your Address"
                  />
                </div>

                <button type="submit" className="btn btn-primary" disabled={loading}>
                  UPDATE
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Profile;
