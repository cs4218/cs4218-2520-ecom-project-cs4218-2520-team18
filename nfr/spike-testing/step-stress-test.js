// Loh Ze Qing Norbert, A0277473R

/**
 * k6 Step-Stress Test
 * 
 * Load Profile:
 * - 300 VUs (Baseline)
 * - 3000 VUs (Peak)
 * - 300 VUs (Recovery)
 *
 * Traffic Split:
 * - 70% Transactional
 * - 30% Price Refresher
 *
 * Command:
 * $env:K6_WEB_DASHBOARD="true"; $env:K6_WEB_DASHBOARD_EXPORT="final_report.html"; k6 run --out csv=results.csv --system-tags "proto,subproto,status,method,url,name,group,check,error,error_code,tls_version,scenario,service,vus" step-stress-test.js
 */

import http from "k6/http";
import { check, sleep } from "k6";
import { Rate, Trend } from "k6/metrics";
import { textSummary } from "https://jslib.k6.io/k6-summary/0.1.0/index.js";

// --- Configuration ---

const BASE_URL = __ENV.BASE_URL || "http://localhost:6060";
const API_AUTH = `${BASE_URL}/api/v1/auth`;
const API_PRODUCT = `${BASE_URL}/api/v1/product`;
const API_CATEGORY = `${BASE_URL}/api/v1/category`;


// --- Custom Metrics ---

const indexPageDuration = new Trend("index_page_duration", true);
const loginDuration = new Trend("login_duration", true);
const searchDuration = new Trend("search_duration", true);
const productViewDuration = new Trend("product_view_duration", true);
const checkoutDuration = new Trend("checkout_duration", true);
const priceRefreshDuration = new Trend("price_refresh_duration", true);
const categoryDuration = new Trend("category_duration", true);
const filterDuration = new Trend("filter_duration", true);
const photoDuration = new Trend("photo_duration", true);
const tokenDuration = new Trend("token_duration", true);
const ordersDuration = new Trend("orders_duration", true);
const flowAErrors = new Rate("flow_a_errors");
const flowBErrors = new Rate("flow_b_errors");
const flowADuration = new Trend("flow_a_total_duration", true);
const flowBDuration = new Trend("flow_b_total_duration", true);


// --- Shared Load Profile ---

const STAGES = [
  { duration: "2m", target: 300 },   // Baseline
  { duration: "10s", target: 3000 },  // Peak
  { duration: "1m", target: 3000 },   // Hold
  { duration: "10s", target: 300 },   // Drop
  { duration: "2m", target: 300 },   // Recovery
];

export const options = {
  summaryTrendStats: ['avg', 'min', 'med', 'max', 'p(25)', 'p(75)', 'p(95)', 'p(99)'],
  scenarios: {
    transactional_shopper: {
      executor: "ramping-vus",
      stages: STAGES.map((s) => ({
        duration: s.duration,
        target: Math.round(s.target * 0.7),
      })),
      exec: "transactionalShopper",
      gracefulRampDown: "30s",
      tags: { flow: "transactional_shopper" },
    },

    price_refresher: {
      executor: "ramping-vus",
      stages: STAGES.map((s) => ({
        duration: s.duration,
        target: Math.round(s.target * 0.3),
      })),
      exec: "priceRefresher",
      gracefulRampDown: "30s",
      tags: { flow: "price_refresher" },
    },
  },

  thresholds: {
    http_req_duration: ["p(95)<800", "max<5000"],
    http_req_failed: ["rate<0.01"],

    "index_page_duration": ["p(95)<500"],
    "http_req_failed{flow:transactional_shopper}": ["rate<0.01"],

    "login_duration": ["p(95)<1000"],
    "checkout_duration": ["p(95)<1500"],
    "http_req_failed{endpoint:payment}": ["rate<0.01"],

    "search_duration": ["p(95)<1000", "p(99)<2500"],
    "http_req_failed{endpoint:search}": ["rate<0.02"],

    "price_refresh_duration": ["p(95)<500"],
    "flow_b_errors": ["rate<0.10"],
  },
  discardResponseBodies: false,
};

// --- Test Data ---

// Match seed script
const TOTAL_LT_USERS = 5000;
const SHARED_PASSWORD = "LoadTest@123";

const TEST_USERS = [];
for (let i = 0; i < TOTAL_LT_USERS; i++) {
  const padded = String(i).padStart(5, "0");
  TEST_USERS.push({
    email: `lt_user_${padded}@loadtest.com`,
    password: SHARED_PASSWORD,
  });
}

const PRODUCT_SLUGS = [
  "novel",
  "the-law-of-contract-in-singapore",
  "nus-tshirt",
  "smartphone",
  "laptop",
  "textbook"
];

const SEARCH_KEYWORDS = [
  "laptop",
  "phone",
  "tablet",
  "keyboard",
  "mouse",
  "headphones",
  "monitor",
  "speaker",
  "camera",
  "charger",
];

// --- Helpers ---

function randomItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomSleep(minSec, maxSec) {
  sleep(minSec + Math.random() * (maxSec - minSec));
}

function jsonHeaders(token) {
  const headers = { "Content-Type": "application/json" };
  if (token) {
    headers["Authorization"] = token;
  }
  return { headers };
}

// --- Flow A: Transactional Shopper (70%) ---
export function transactionalShopper() {
  const startTime = Date.now();
  const user = randomItem(TEST_USERS);
  const slug = randomItem(PRODUCT_SLUGS);

  // 1. Login
  const loginPayload = JSON.stringify({
    email: user.email,
    password: user.password,
  });

  const loginRes = http.post(`${API_AUTH}/login`, loginPayload, jsonHeaders());

  const loginOk = check(loginRes, {
    "login: status 200": (r) => r.status === 200,
    "login: has token": (r) => {
      try { return !!JSON.parse(r.body).token; } catch (_) { return false; }
    },
  });

  loginDuration.add(loginRes.timings.duration);
  flowAErrors.add(!loginOk);

  let token = "";
  try {
    token = JSON.parse(loginRes.body).token || "";
  } catch (_) {}

  randomSleep(2, 4);

  // 2. Index Page
  const indexRes = http.get(`${BASE_URL}`, jsonHeaders(token));
  const indexOk = check(indexRes, {
    "index: status 200": (r) => r.status === 200,
  });
  indexPageDuration.add(indexRes.timings.duration);
  flowAErrors.add(!indexOk);

  randomSleep(2, 4);

  // 3. Search
  const keyword = randomItem(SEARCH_KEYWORDS);
  const searchRes = http.get(`${API_PRODUCT}/search/${keyword}`, {
    ...jsonHeaders(token),
    tags: { endpoint: 'search' }
  });
  const searchOk = check(searchRes, {
    "search: status 200": (r) => r.status === 200,
  });
  searchDuration.add(searchRes.timings.duration);
  flowAErrors.add(!searchOk);

  randomSleep(2, 4);

  // 4. Categories
  const categoryRes = http.get(`${API_CATEGORY}/get-category`, jsonHeaders(token));
  const categoryOk = check(categoryRes, {
    "get categories: status 200": (r) => r.status === 200,
  });

  categoryDuration.add(categoryRes.timings.duration);
  flowAErrors.add(!categoryOk);

  let categoryId = null;
  try {
    const categories = JSON.parse(categoryRes.body).category;
    if (categories && categories.length > 0) {
      categoryId = randomItem(categories)._id;
    }
  } catch (_) {}

  randomSleep(2, 4);

  // 5. Filters
  const filterPayload = JSON.stringify({
    checked: categoryId ? [categoryId] : [],
    radio: [0, 1000], // Simulating a $0-$1000 filter
  });

  const filterRes = http.post(`${API_PRODUCT}/product-filters`, filterPayload, jsonHeaders(token));
  const filterOk = check(filterRes, {
    "product filter: status 200": (r) => r.status === 200,
  });

  filterDuration.add(filterRes.timings.duration);
  flowAErrors.add(!filterOk);

  randomSleep(2, 4);

  // 6. Single Product
  const productRes = http.get(`${API_PRODUCT}/get-product/${slug}`, jsonHeaders(token));
  const productOk = check(productRes, {
    "product view: status 200": (r) => r.status === 200,
  });

  productViewDuration.add(productRes.timings.duration);
  flowAErrors.add(!productOk);

  let productId = null;
  let productPrice = 99.99;
  try {
    const body = JSON.parse(productRes.body);
    productId = body.product?._id || null;
    productPrice = body.product?.price || 99.99;
  } catch (_) {}

  randomSleep(2, 4);

  // 7. Product Photo
  if (productId) {
    const photoRes = http.get(`${API_PRODUCT}/product-photo/${productId}`, jsonHeaders(token));
    const photoOk = check(photoRes, {
      "product photo: status 200": (r) => r.status === 200,
    });
    photoDuration.add(photoRes.timings.duration);
    flowAErrors.add(!photoOk);
  }

  randomSleep(2, 4);

  // 8. Braintree Token
  if (token) {
    const tokenRes = http.get(`${API_PRODUCT}/braintree/token`, jsonHeaders(token));
    const tokenOk = check(tokenRes, {
      "braintree token: status 200": (r) => r.status === 200,
    });
    tokenDuration.add(tokenRes.timings.duration);
    flowAErrors.add(!tokenOk);
  }

  randomSleep(2, 4);

  // 9. Checkout
  if (productId && token) {
    const checkoutPayload = JSON.stringify({
      nonce: "fake-valid-nonce",
      cart: [{ _id: productId, name: "Load Test Product", price: productPrice }],
    });

    const checkoutParams = {
      headers: { "Content-Type": "application/json", Authorization: token },
      responseCallback: http.expectedStatuses(200, 201, 400),
      tags: { endpoint: 'payment' }
    };

    const checkoutRes = http.post(`${API_PRODUCT}/braintree/payment`, checkoutPayload, checkoutParams);
    const checkoutOk = check(checkoutRes, {
      "checkout: reached payment endpoint": (r) => [200, 201, 400].includes(r.status),
    });

    checkoutDuration.add(checkoutRes.timings.duration);
    flowAErrors.add(!checkoutOk);
  }

  randomSleep(2, 4);

  // 10. Orders
  if (token) {
    const ordersRes = http.get(`${API_AUTH}/orders`, jsonHeaders(token));
    const ordersOk = check(ordersRes, {
      "view orders: status 200": (r) => r.status === 200,
    });
    ordersDuration.add(ordersRes.timings.duration);
    flowAErrors.add(!ordersOk);
  }

  randomSleep(2, 4);
  flowADuration.add(Date.now() - startTime);
}


// --- Flow B: Price Refresher (30%) ---
export function priceRefresher() {
  const startTime = Date.now();
  const slug = randomItem(PRODUCT_SLUGS);

  const res = http.get(`${API_PRODUCT}/get-product/${slug}`, jsonHeaders());

  const ok = check(res, {
    "price refresh: status 200": (r) => r.status === 200,
  });

  priceRefreshDuration.add(res.timings.duration);
  flowBErrors.add(!ok);

  // Think time
  randomSleep(0.5, 1);
  flowBDuration.add(Date.now() - startTime);
}

// --- Summary ---

export function handleSummary(data) {
  const now = new Date();
  const ts = now.toISOString().replace(/[:.]/g, "-");

  return {
    stdout: textSummary(data, { indent: "  ", enableColors: true }),
    [`./step-stress-report-${ts}.json`]: JSON.stringify(data, null, 2),
    [`./step-stress-report-${ts}.txt`]: textSummary(data, {
      indent: "  ",
      enableColors: false,
    }),
  };
}
