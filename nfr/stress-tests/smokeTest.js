// Aw Jean Leng Adrian, A0277537N
/**
 * Smoke Test Script - Quick validation before full stress test
 *
 * This is a lightweight version of the stress test that runs for just 1 minute
 * with 10 concurrent users. Use this to validate the test setup before running
 * the full stress test.
 */

import http from "k6/http";
import { check, sleep } from "k6";
import { Rate, Trend } from "k6/metrics";

const errorRate = new Rate("errors");
const searchLatency = new Trend("search_latency", true);
const filterLatency = new Trend("filter_latency", true);
const searchErrors = new Rate("search_errors");
const filterErrors = new Rate("filter_errors");

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

    searchLatency.add(searchResponse.timings.duration);

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
    searchErrors.add(!searchOk);

    const payload = JSON.stringify({
        checked: data.categoryIds.slice(0, 2),
        radio: [0, 500],
    });

    const filterResponse = http.post(`${API_BASE}/product-filters`, payload, {
        headers: { "Content-Type": "application/json" },
    });

    filterLatency.add(filterResponse.timings.duration);

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
    filterErrors.add(!filterOk);

    sleep(0.5);
}

function evaluateThresholds(data) {
    if (data.thresholds) {
        return Object.values(data.thresholds).every(t => t.ok);
    }

    const m = data.metrics;
    const p95 = m.http_req_duration?.values["p(95)"] || 0;
    const errRate = m.errors?.values.rate || 0;

    return p95 < 3000 && errRate < 0.1;
}

export function handleSummary(data) {
    const now = new Date().toISOString().replace(/[:.]/g, "-");

    const thresholdsPassed = evaluateThresholds(data);

    const summary = {
        timestamp: new Date().toISOString(),
        status: thresholdsPassed ? "PASSED" : "FAILED",
        loadProfile: {
            vus: 10,
            duration: "1m",
            peakVUs: 10,
            totalDuration: "1m",
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
        [`stress-tests/results/smoke-test-${now}.json`]: JSON.stringify(summary, null, 4),
    };
}

function textSummary(data) {
    const lines = [];

    lines.push("\n" + "=".repeat(70));
    lines.push("SMOKE TEST RESULTS SUMMARY");
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
            { name: "http_req_duration p(95)<3000", ok: (m.http_req_duration?.values["p(95)"] || 0) < 3000 },
            { name: "errors rate<0.1", ok: (m.errors?.values.rate || 0) < 0.1 },
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
