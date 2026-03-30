// Aw Jean Leng Adrian, A0277537N
/**
 * Smoke Test Script - Quick validation before full stress test
 *
 * This is a lightweight version of the stress test that runs for just 1 minute
 * with 10 concurrent users. Use this to validate the test setup before running
 * the full stress test.
 *
 * Usage:
 *     k6 run stress-tests/smokeTest.js
 */

import http from "k6/http";
import { check, sleep } from "k6";
import { Rate } from "k6/metrics";

const errorRate = new Rate("errors");

const BASE_URL = __ENV.BASE_URL || "http://localhost:6060";
const API_BASE = `${BASE_URL}/api/v1/product`;

export const options = {
    vus: 10,
    duration: "1m",
    thresholds: {
        http_req_duration: ["p(95)<3000"],
        errors: ["rate<0.1"],
    },
};

const SEARCH_KEYWORDS = ["laptop", "phone", "camera", "premium", "wireless"];

export function setup() {
    const response = http.get(BASE_URL);
    console.log(`Server connectivity: ${response.status === 200 ? "OK" : "FAILED"}`);

    const catResponse = http.get(`${BASE_URL}/api/v1/category/get-category`);
    let categoryIds = [];

    if (catResponse.status === 200) {
        try {
            const data = JSON.parse(catResponse.body);
            categoryIds = data.category?.map(c => c._id) || [];
            console.log(`Found ${categoryIds.length} categories`);
        } catch (e) {
            console.error("Failed to parse categories");
        }
    }

    return { categoryIds };
}

export default function (data) {
    const keyword = SEARCH_KEYWORDS[Math.floor(Math.random() * SEARCH_KEYWORDS.length)];
    const searchResponse = http.get(`${API_BASE}/search/${keyword}`);

    const searchOk = check(searchResponse, {
        "search: status 200": (r) => r.status === 200,
        "search: valid JSON": (r) => {
            try {
                JSON.parse(r.body);
                return true;
            } catch (e) {
                return false;
            }
        },
    });

    errorRate.add(!searchOk);

    const payload = JSON.stringify({
        checked: data.categoryIds.slice(0, 2),
        radio: [0, 500],
    });

    const filterResponse = http.post(`${API_BASE}/product-filters`, payload, {
        headers: { "Content-Type": "application/json" },
    });

    const filterOk = check(filterResponse, {
        "filter: status 200": (r) => r.status === 200,
        "filter: has success field": (r) => {
            try {
                return JSON.parse(r.body).success !== undefined;
            } catch (e) {
                return false;
            }
        },
    });

    errorRate.add(!filterOk);

    sleep(0.5);
}
