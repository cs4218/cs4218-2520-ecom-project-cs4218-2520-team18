// Aw Jean Leng Adrian, A0277537N
/**
 * Local Stress Test - Reduced load for development machines
 *
 * A lighter version of the full stress test designed to run on local
 * development machines without overwhelming system resources.
 *
 * Load Profile:
 *     - Ramp up: 0 to 20 VUs over 30 seconds
 *     - Sustain: 20 VUs for 2 minutes
 *     - Ramp down: 20 to 0 VUs over 30 seconds
 */

import http from "k6/http";
import { check, group, sleep } from "k6";
import { Rate, Trend } from "k6/metrics";

const searchLatency = new Trend("search_latency", true);
const filterLatency = new Trend("filter_latency", true);
const errorRate = new Rate("errors");
const searchErrors = new Rate("search_errors");
const filterErrors = new Rate("filter_errors");

const BASE_URL = __ENV.BASE_URL || "http://localhost:6060";
const API_BASE = `${BASE_URL}/api/v1/product`;

export const options = {
    stages: [
        { duration: "30s", target: 20 },
        { duration: "2m", target: 20 },
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
            searchErrors.add(!success);
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
            filterErrors.add(!success);
        });
    }

    sleep(Math.random() * 0.5 + 0.3);
}

function evaluateThresholds(data) {
    if (data.thresholds) {
        return Object.values(data.thresholds).every(t => t.ok);
    }

    const m = data.metrics;
    const p95 = m.http_req_duration?.values["p(95)"] || 0;
    const failRate = m.http_req_failed?.values.rate || 0;
    const errRate = m.errors?.values.rate || 0;

    return p95 < 2000 && failRate < 0.05 && errRate < 0.05;
}

export function handleSummary(data) {
    const now = new Date().toISOString().replace(/[:.]/g, "-");

    const thresholdsPassed = evaluateThresholds(data);

    const summary = {
        timestamp: new Date().toISOString(),
        status: thresholdsPassed ? "PASSED" : "FAILED",
        loadProfile: {
            stages: [
                { duration: "30s", target: 20, description: "Ramp up to 20 VUs" },
                { duration: "2m", target: 20, description: "Sustain 20 VUs" },
                { duration: "30s", target: 0, description: "Ramp down to 0 VUs" },
            ],
            peakVUs: 20,
            totalDuration: "3m",
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
        },
    };

    return {
        "stdout": textSummary(data),
        [`stress-tests/results/local-stress-${now}.json`]: JSON.stringify(summary, null, 4),
    };
}

function textSummary(data) {
    const lines = [];

    lines.push("\n" + "=".repeat(70));
    lines.push("LOCAL STRESS TEST RESULTS SUMMARY");
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
            { name: "errors rate<0.05", ok: (m.errors?.values.rate || 0) < 0.05 },
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

    if (data.metrics.search_latency) {
        const sl = data.metrics.search_latency.values;
        lines.push(`    Search Latency (avg): ${sl.avg?.toFixed(2)}ms`);
        lines.push(`    Search Latency (p95): ${sl["p(95)"]?.toFixed(2)}ms`);
    }

    if (data.metrics.filter_latency) {
        const fl = data.metrics.filter_latency.values;
        lines.push(`    Filter Latency (avg): ${fl.avg?.toFixed(2)}ms`);
        lines.push(`    Filter Latency (p95): ${fl["p(95)"]?.toFixed(2)}ms`);
    }

    if (data.metrics.search_errors) {
        const rate = (data.metrics.search_errors.values.rate * 100).toFixed(2);
        lines.push(`    Search Error Rate: ${rate}%`);
    }

    if (data.metrics.filter_errors) {
        const rate = (data.metrics.filter_errors.values.rate * 100).toFixed(2);
        lines.push(`    Filter Error Rate: ${rate}%`);
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
