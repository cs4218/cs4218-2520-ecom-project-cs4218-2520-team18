import { useState, useEffect } from "react";
import { useAuth } from "../../context/auth";
import { Outlet } from "react-router-dom";
import axios from "axios";
import Spinner from "../Spinner";

export default function AdminRoute() {
    const [ok, setOk] = useState(false);
    const [auth] = useAuth();

    useEffect(()=> {
        if (!auth?.token) {
            setOk(false);
            return;
        }

        const authCheck = async() => {
            try {
                const res = await axios.get("/api/v1/auth/admin-auth", {
                    headers: {
                        Authorization: auth?.token,
                    },
                });
                if(res.data.ok){
                    setOk(true);
                } else {
                    setOk(false);
                }
            } catch (error) {
                setOk(false);
            }
        };

        authCheck();
    }, [auth?.token]);

    return ok ? <Outlet /> : <Spinner />;
}
