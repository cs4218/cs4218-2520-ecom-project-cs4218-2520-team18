// Aw Jean Leng Adrian, A0277537N
/**
 * Stress Test Script for searchProductController and productFiltersController
 *
 * This k6 script tests the product search and filter endpoints under heavy load.
 *
 * Load Profile:
 *     - Ramp up: 0 to 500 VUs over 2 minutes
 *     - Sustain: 500 VUs for 5 minutes
 *     - Ramp down: 500 to 0 VUs over 1 minute
 *
 * Thresholds:
 *     - p(95) response time < 2000ms
 *     - HTTP 500 error rate < 1%
 *     - Overall request failure rate < 5%
 */

import http from "k6/http";
import { check, group, sleep } from "k6";
import { Rate, Trend, Counter } from "k6/metrics";

const searchLatency = new Trend("search_latency", true);
const filterLatency = new Trend("filter_latency", true);
const searchErrors = new Rate("search_errors");
const filterErrors = new Rate("filter_errors");
const http500Errors = new Counter("http_500_errors");
const http500Rate = new Rate("http_500_rate");

const BASE_URL = __ENV.BASE_URL || "http://localhost:6060";
const API_BASE = `${BASE_URL}/api/v1/product`;

export const options = {
    stages: [
        { duration: "2m", target: 500 },
        { duration: "5m", target: 500 },
        { duration: "1m", target: 0 },
    ],

    thresholds: {
        http_req_duration: ["p(95)<2000"],
        search_latency: ["p(95)<2000", "avg<1000"],
        filter_latency: ["p(95)<2000", "avg<1000"],
        http_500_rate: ["rate<0.01"],
        http_req_failed: ["rate<0.05"],
        search_errors: ["rate<0.05"],
        filter_errors: ["rate<0.05"],
    },

    summaryTrendStats: ["avg", "min", "med", "max", "p(90)", "p(95)", "p(99)"],
    discardResponseBodies: false,
    httpDebug: "full",
};

const SEARCH_KEYWORDS = [
    "laptop", "phone", "camera", "speaker", "headphones", "monitor", "keyboard",
    "mouse", "tablet", "watch", "shoes", "jacket", "chair", "desk", "lamp",
    "techpro", "gadgetmax", "smartlife", "promaster", "ultragear",
    "premium", "professional", "wireless", "portable", "smart", "digital",
    "lap", "pho", "cam", "speak", "head",
    "premium%20laptop", "wireless%20speaker", "smart%20watch",
    "professional%20camera", "portable%20charger",
    "xyz", "abc", "123",
];

let categoryIds = [];

const PRICE_RANGES = [
    [0, 50],
    [50, 100],
    [100, 250],
    [250, 500],
    [500, 1000],
    [1000, null],
    [0, 100],
    [0, 500],
    [500, 5000],
];

function randomPick(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

function randomSubset(arr, maxSize) {
    const size = Math.floor(Math.random() * Math.min(maxSize, arr.length)) + 1;
    const shuffled = [...arr].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, size);
}

export function setup() {
    console.log(`\n${"=".repeat(60)}`);
    console.log("Stress Test Setup");
    console.log(`${"=".repeat(60)}`);
    console.log(`Base URL: ${BASE_URL}`);
    console.log(`API Base: ${API_BASE}`);

    const categoriesResponse = http.get(`${BASE_URL}/api/v1/category/get-category`);

    if (categoriesResponse.status !== 200) {
        console.error(`Failed to fetch categories: ${categoriesResponse.status}`);
        console.error(`Response: ${categoriesResponse.body}`);
        return { categoryIds: [] };
    }

    try {
        const data = JSON.parse(categoriesResponse.body);
        if (data.success && data.category) {
            categoryIds = data.category.map(c => c._id);
            console.log(`Loaded ${categoryIds.length} categories for testing`);
        }
    } catch (e) {
        console.error(`Error parsing categories: ${e}`);
    }

    const warmupResponse = http.get(`${API_BASE}/search/test`);
    console.log(`Warm-up request status: ${warmupResponse.status}`);

    console.log(`${"=".repeat(60)}\n`);

    return { categoryIds };
}

export default function (data) {
    const { categoryIds } = data;
    const scenario = Math.random();

    if (scenario < 0.4) {
        group("Search - Single Keyword", function () {
            const keyword = randomPick(SEARCH_KEYWORDS.slice(0, 15));
            searchProduct(keyword);
        });
    } else if (scenario < 0.6) {
        group("Search - Partial Match", function () {
            const keyword = randomPick(SEARCH_KEYWORDS.slice(20, 25));
            searchProduct(keyword);
        });
    } else if (scenario < 0.8) {
        group("Search - Multi-word", function () {
            const keyword = randomPick(SEARCH_KEYWORDS.slice(25, 30));
            searchProduct(keyword);
        });
    } else if (scenario < 0.9) {
        group("Filter - Category Only", function () {
            if (categoryIds.length > 0) {
                const selectedCategories = randomSubset(categoryIds, 3);
                filterProducts(selectedCategories, []);
            }
        });
    } else if (scenario < 0.95) {
        group("Filter - Price Only", function () {
            const priceRange = randomPick(PRICE_RANGES);
            filterProducts([], priceRange);
        });
    } else {
        group("Filter - Category + Price", function () {
            if (categoryIds.length > 0) {
                const selectedCategories = randomSubset(categoryIds, 3);
                const priceRange = randomPick(PRICE_RANGES);
                filterProducts(selectedCategories, priceRange);
            }
        });
    }

    sleep(Math.random() * 0.4 + 0.1);
}

function searchProduct(keyword) {
    const url = `${API_BASE}/search/${keyword}`;
    const startTime = Date.now();

    const response = http.get(url, {
        tags: { endpoint: "search" },
        timeout: "30s",
    });

    const duration = Date.now() - startTime;
    searchLatency.add(duration);

    if (response.status === 500) {
        http500Errors.add(1);
        http500Rate.add(1);
    } else {
        http500Rate.add(0);
    }

    const success = check(response, {
        "search: status is 200": (r) => r.status === 200,
        "search: response is valid JSON": (r) => {
            try {
                JSON.parse(r.body);
                return true;
            } catch (e) {
                return false;
            }
        },
        "search: response time < 2000ms": (r) => r.timings.duration < 2000,
    });

    searchErrors.add(!success);

    return response;
}

function filterProducts(checked, radio) {
    const url = `${API_BASE}/product-filters`;
    const payload = JSON.stringify({ checked, radio });
    const params = {
        headers: { "Content-Type": "application/json" },
        tags: { endpoint: "filter" },
        timeout: "30s",
    };

    const startTime = Date.now();
    const response = http.post(url, payload, params);
    const duration = Date.now() - startTime;

    filterLatency.add(duration);

    if (response.status === 500) {
        http500Errors.add(1);
        http500Rate.add(1);
    } else {
        http500Rate.add(0);
    }

    const success = check(response, {
        "filter: status is 200": (r) => r.status === 200,
        "filter: response has success field": (r) => {
            try {
                const body = JSON.parse(r.body);
                return body.success !== undefined;
            } catch (e) {
                return false;
            }
        },
        "filter: response time < 2000ms": (r) => r.timings.duration < 2000,
    });

    filterErrors.add(!success);

    return response;
}

export function teardown(data) {
    console.log(`\n${"=".repeat(60)}`);
    console.log("Stress Test Complete");
    console.log(`${"=".repeat(60)}`);
    console.log(`Total categories tested: ${data.categoryIds.length}`);
    console.log(`${"=".repeat(60)}\n`);
}

// Manually evaluate thresholds from metrics as a fallback,
// since data.thresholds can be undefined in some k6 versions
function evaluateThresholds(data) {
    if (data.thresholds) {
        return Object.values(data.thresholds).every(t => t.ok);
    }

    const m = data.metrics;
    const p95 = m.http_req_duration?.values["p(95)"] || 0;
    const failRate = m.http_req_failed?.values.rate || 0;
    const http500 = m.http_500_rate?.values.rate || 0;
    const searchP95 = m.search_latency?.values["p(95)"] || 0;
    const searchAvg = m.search_latency?.values.avg || 0;
    const filterP95 = m.filter_latency?.values["p(95)"] || 0;
    const filterAvg = m.filter_latency?.values.avg || 0;
    const searchErrRate = m.search_errors?.values.rate || 0;
    const filterErrRate = m.filter_errors?.values.rate || 0;

    return p95 < 2000
        && failRate < 0.05
        && http500 < 0.01
        && searchP95 < 2000
        && searchAvg < 1000
        && filterP95 < 2000
        && filterAvg < 1000
        && searchErrRate < 0.05
        && filterErrRate < 0.05;
}

export function handleSummary(data) {
    const now = new Date().toISOString().replace(/[:.]/g, "-");

    const thresholdsPassed = evaluateThresholds(data);

    const summary = {
        timestamp: new Date().toISOString(),
        status: thresholdsPassed ? "PASSED" : "FAILED",
        loadProfile: {
            stages: [
                { duration: "2m", target: 500, description: "Ramp up to 500 VUs" },
                { duration: "5m", target: 500, description: "Sustain 500 VUs" },
                { duration: "1m", target: 0, description: "Ramp down to 0 VUs" },
            ],
            peakVUs: 500,
            totalDuration: "8m",
        },
        thresholds: data.thresholds,
        metrics: {
            vus: data.metrics.vus?.values,
            vus_max: data.metrics.vus_max?.values,
            iterations: data.metrics.iterations?.values,
            http_reqs: data.metrics.http_reqs?.values,
            http_req_duration: data.metrics.http_req_duration?.values,
            http_req_failed: data.metrics.http_req_failed?.values,
            search_latency: data.metrics.search_latency?.values,
            filter_latency: data.metrics.filter_latency?.values,
            search_errors: data.metrics.search_errors?.values,
            filter_errors: data.metrics.filter_errors?.values,
            http_500_rate: data.metrics.http_500_rate?.values,
        },
    };

    return {
        "stdout": textSummary(data),
        [`stress-tests/results/search-stress-${now}.json`]: JSON.stringify(summary, null, 4),
    };
}

function textSummary(data) {
    const lines = [];

    lines.push("\n" + "=".repeat(70));
    lines.push("STRESS TEST RESULTS SUMMARY");
    lines.push("=".repeat(70));

    lines.push("\nTHRESHOLD RESULTS:");
    lines.push("-".repeat(40));

    if (data.thresholds) {
        for (const [name, result] of Object.entries(data.thresholds)) {
            const icon = result.ok ? "[OK]" : "[FAIL]";
            lines.push(`    ${icon} ${name}`);
        }
    } else {
        const m = data.metrics;
        const checks = [
            { name: "http_req_duration p(95)<2000", ok: (m.http_req_duration?.values["p(95)"] || 0) < 2000 },
            { name: "http_req_failed rate<0.05", ok: (m.http_req_failed?.values.rate || 0) < 0.05 },
            { name: "http_500_rate rate<0.01", ok: (m.http_500_rate?.values.rate || 0) < 0.01 },
            { name: "search_latency p(95)<2000", ok: (m.search_latency?.values["p(95)"] || 0) < 2000 },
            { name: "filter_latency p(95)<2000", ok: (m.filter_latency?.values["p(95)"] || 0) < 2000 },
            { name: "search_errors rate<0.05", ok: (m.search_errors?.values.rate || 0) < 0.05 },
            { name: "filter_errors rate<0.05", ok: (m.filter_errors?.values.rate || 0) < 0.05 },
        ];
        for (const c of checks) {
            const icon = c.ok ? "[OK]" : "[FAIL]";
            lines.push(`    ${icon} ${c.name}`);
        }
    }

    lines.push("\nKEY METRICS:");
    lines.push("-".repeat(40));

    if (data.metrics.http_reqs) {
        lines.push(`    Total Requests: ${data.metrics.http_reqs.values.count}`);
        lines.push(`    Request Rate: ${data.metrics.http_reqs.values.rate?.toFixed(2)}/s`);
    }

    if (data.metrics.http_req_duration) {
        const dur = data.metrics.http_req_duration.values;
        lines.push(`    Response Time (avg): ${dur.avg?.toFixed(2)}ms`);
        lines.push(`    Response Time (p95): ${dur["p(95)"]?.toFixed(2)}ms`);
        lines.push(`    Response Time (p99): ${dur["p(99)"]?.toFixed(2)}ms`);
    }

    if (data.metrics.http_req_failed) {
        const rate = (data.metrics.http_req_failed.values.rate * 100).toFixed(2);
        lines.push(`    Failure Rate: ${rate}%`);
    }

    if (data.metrics.http_500_rate) {
        const rate = (data.metrics.http_500_rate.values.rate * 100).toFixed(4);
        lines.push(`    HTTP 500 Rate: ${rate}%`);
    }

    lines.push("\n" + "=".repeat(70));

    const passed = evaluateThresholds(data);

    if (passed) {
        lines.push("OVERALL RESULT: PASSED - All thresholds met!");
    } else {
        lines.push("OVERALL RESULT: FAILED - Some thresholds not met!");
    }

    lines.push("=".repeat(70) + "\n");

    return lines.join("\n");
}
