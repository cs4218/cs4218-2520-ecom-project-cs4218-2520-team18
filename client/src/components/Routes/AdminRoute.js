import { useState, useEffect } from "react";
import { useAuth } from "../../context/auth";
import { Outlet } from "react-router-dom";
import axios from "axios";
import Spinner from "../Spinner";

export default function AdminRoute() {
    const [ok, setOk] = useState(false);
    const [auth] = useAuth();

    useEffect(() => {
        const authCheck = async () => {
            if (!auth?.token) {
                setOk(false);
                return;
            }

            try {
                const res = await axios.get("/api/v1/auth/admin-auth", {
                    headers: { Authorization: auth.token },
                });
                setOk(!!res?.data?.ok);
            } catch (error) {
                setOk(false);
            }
        };

        authCheck();
    }, [auth?.token]);

    return ok ? <Outlet /> : <Spinner />;
}
