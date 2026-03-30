/**
 * Local Stress Test - Reduced load for development machines
 *
 * A lighter version of the full stress test designed to run on local
 * development machines without overwhelming system resources.
 *
 * Load Profile:
 *     - Ramp up: 0 to 50 VUs over 30 seconds
 *     - Sustain: 50 VUs for 2 minutes
 *     - Ramp down: 50 to 0 VUs over 30 seconds
 *
 * Usage:
 *     k6 run stress-tests/localStressTest.js
 */

import http from "k6/http";
import { check, group, sleep } from "k6";
import { Rate, Trend } from "k6/metrics";

const searchLatency = new Trend("search_latency", true);
const filterLatency = new Trend("filter_latency", true);
const errorRate = new Rate("errors");

const BASE_URL = __ENV.BASE_URL || "http://localhost:6060";
const API_BASE = `${BASE_URL}/api/v1/product`;

export const options = {
    stages: [
        { duration: "30s", target: 50 },
        { duration: "2m", target: 50 },
        { duration: "30s", target: 0 },
    ],

    thresholds: {
        http_req_duration: ["p(95)<2000"],
        http_req_failed: ["rate<0.05"],
        errors: ["rate<0.05"],
    },
};

const SEARCH_KEYWORDS = [
    "laptop", "phone", "camera", "speaker", "headphones", "monitor",
    "premium", "wireless", "smart", "professional",
    "lap", "pho", "cam",
];

const PRICE_RANGES = [
    [0, 50],
    [50, 500],
    [500, 1000],
    [0, 500],
    [100, null],
];

let categoryIds = [];

export function setup() {
    console.log(`Base URL: ${BASE_URL}`);

    const response = http.get(`${BASE_URL}/api/v1/category/get-category`);
    if (response.status === 200) {
        try {
            const data = JSON.parse(response.body);
            categoryIds = data.category?.map(c => c._id) || [];
            console.log(`Loaded ${categoryIds.length} categories`);
        } catch (e) {
            console.error("Failed to parse categories");
        }
    }

    return { categoryIds };
}

export default function (data) {
    const { categoryIds } = data;
    const scenario = Math.random();

    if (scenario < 0.6) {
        group("Search", function () {
            const keyword = SEARCH_KEYWORDS[Math.floor(Math.random() * SEARCH_KEYWORDS.length)];
            const response = http.get(`${API_BASE}/search/${keyword}`);

            searchLatency.add(response.timings.duration);

            const success = check(response, {
                "status is 200": (r) => r.status === 200,
            });
            errorRate.add(!success);
        });
    } else {
        group("Filter", function () {
            const selectedCategories = categoryIds.length > 0
                ? categoryIds.slice(0, Math.floor(Math.random() * 3) + 1)
                : [];
            const priceRange = PRICE_RANGES[Math.floor(Math.random() * PRICE_RANGES.length)];

            const response = http.post(
                `${API_BASE}/product-filters`,
                JSON.stringify({ checked: selectedCategories, radio: priceRange }),
                { headers: { "Content-Type": "application/json" } }
            );

            filterLatency.add(response.timings.duration);

            const success = check(response, {
                "status is 200": (r) => r.status === 200,
            });
            errorRate.add(!success);
        });
    }

    sleep(Math.random() * 0.3 + 0.1);
}
