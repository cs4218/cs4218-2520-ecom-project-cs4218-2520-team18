import { useState, useEffect } from "react";
import axios from "axios";

export default function useCategory() {
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    let isMounted = true; // Prevent state update if unmounted
    
    const getCategories = async () => {
      try {
        const { data } = await axios.get("/api/v1/category/get-category");
        if (isMounted) {
          setCategories(data?.category || []);
        }
      } catch (error) {
        console.log(error);
        if (isMounted) {
          setCategories([]); // Ensure it's always an array
        }
      }
    };

    getCategories();

    return () => {
      isMounted = false;
    };
  }, []);

  return categories;
}