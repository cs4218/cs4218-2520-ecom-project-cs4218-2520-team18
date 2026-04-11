// Volume Testing (Flood Testing) — k6 Test Script
//
// Tests system performance and stability under a large and growing volume of data.
// Identifies thresholds at which the system degrades or becomes unstable, and how
// increasing data-insertion frequency affects those thresholds.
//
// Two parallel scenarios:
//   Thread Group 1 — data_loader   : Admin continuously creates new products via API,
//                                     simulating MongoDB data growth over time.
//   Thread Group 2 — user_actions  : Regular users browse, search, and filter products
//                                     while the database volume is growing.
//
// Pre-requisites:
//   1. Run seed-volume-data.js to pre-populate the database with a large baseline dataset.
//   2. Ensure an admin user exists (default: admin.e2e@example.com / Password123,
//      override via BASE_URL / ADMIN_EMAIL / ADMIN_PASSWORD env vars).
//
// Run command:
//   k6 run --out csv=volume-results.csv volume-test.js
//
// With HTML dashboard:
//   $env:K6_WEB_DASHBOARD="true"; $env:K6_WEB_DASHBOARD_EXPORT="volume-report.html"; \
//   k6 run --out csv=volume-results.csv volume-test.js

import http from "k6/http";
import { check, sleep } from "k6";
import { Counter, Rate, Trend } from "k6/metrics";
import { textSummary } from "https://jslib.k6.io/k6-summary/0.1.0/index.js";

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const BASE_URL = __ENV.BASE_URL || "http://localhost:6060";
const API_AUTH = `${BASE_URL}/api/v1/auth`;
const API_PRODUCT = `${BASE_URL}/api/v1/product`;
const API_CATEGORY = `${BASE_URL}/api/v1/category`;

// Admin credentials — must match the seeded admin user
const ADMIN_EMAIL = __ENV.ADMIN_EMAIL || "admin.e2e@example.com";
const ADMIN_PASSWORD = __ENV.ADMIN_PASSWORD || "Password123";

// Volume-test user credentials — must match seed-volume-data.js
const VT_USER_COUNT = 500;
const VT_USER_PASSWORD = "VolumeTest@123";

// ---------------------------------------------------------------------------
// Custom Metrics
// ---------------------------------------------------------------------------

// Thread Group 2 — user action durations
const listProductsDuration = new Trend("list_products_duration", true);
const searchDuration = new Trend("search_duration", true);
const filterDuration = new Trend("filter_duration", true);
const paginationDuration = new Trend("pagination_duration", true);
const singleProductDuration = new Trend("single_product_duration", true);
const categoryListDuration = new Trend("category_list_duration", true);
const ordersDuration = new Trend("orders_duration", true);
const loginDuration = new Trend("login_duration", true);

// Thread Group 1 — data loader metrics
const dataLoaderDuration = new Trend("data_loader_product_create_duration", true);
const dataLoaderErrors = new Rate("data_loader_errors");
const productsInserted = new Counter("products_inserted");

// Overall error rates per scenario
const userActionErrors = new Rate("user_action_errors");

// ---------------------------------------------------------------------------
// Load Profile
//
// The test is divided into phases:
//   Phase 1 (warm-up)    : small user load, data loader starts slowly
//   Phase 2 (ramp-up)    : user load grows, data loader accelerates
//   Phase 3 (sustained)  : maximum load held steady — measures stability
//   Phase 4 (ramp-down)  : both scenarios wind down
// ---------------------------------------------------------------------------

// Data loader: fewer VUs (simulates background DB writes)
const DATA_LOADER_STAGES = [
  { duration: "1m", target: 2 },   // Warm-up: trickle of inserts
  { duration: "2m", target: 10 },  // Ramp-up: moderate insertion rate
  { duration: "5m", target: 20 },  // Sustained: high insertion rate
  { duration: "1m", target: 5 },   // Ramp-down
  { duration: "30s", target: 0 },
];

// User actions: more VUs (simulates concurrent shoppers under growing data)
const USER_ACTION_STAGES = [
  { duration: "1m", target: 50 },   // Warm-up
  { duration: "2m", target: 200 },  // Ramp-up
  { duration: "5m", target: 200 },  // Sustained
  { duration: "1m", target: 50 },   // Ramp-down
  { duration: "30s", target: 0 },
];

export const options = {
  summaryTrendStats: ["avg", "min", "med", "max", "p(25)", "p(75)", "p(95)", "p(99)"],

  scenarios: {
    // Thread Group 1: MongoDB Data Loader
    data_loader: {
      executor: "ramping-vus",
      stages: DATA_LOADER_STAGES,
      exec: "dataLoader",
      gracefulRampDown: "30s",
      tags: { scenario: "data_loader" },
    },

    // Thread Group 2: Simulated User Actions
    user_actions: {
      executor: "ramping-vus",
      stages: USER_ACTION_STAGES,
      exec: "userActions",
      gracefulRampDown: "30s",
      tags: { scenario: "user_actions" },
    },
  },

  thresholds: {
    // Overall HTTP health
    http_req_duration: ["p(95)<3000", "max<10000"],
    http_req_failed: ["rate<0.05"],

    // User-facing read operations — must remain responsive as data grows
    list_products_duration: ["p(95)<2000", "p(99)<5000"],
    search_duration: ["p(95)<2000", "p(99)<5000"],
    filter_duration: ["p(95)<2000", "p(99)<5000"],
    pagination_duration: ["p(95)<2000"],
    single_product_duration: ["p(95)<1500"],
    category_list_duration: ["p(95)<1000"],

    // Error rates
    user_action_errors: ["rate<0.05"],
    data_loader_errors: ["rate<0.10"],
  },

  discardResponseBodies: false,
};

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomSleep(minSec, maxSec) {
  sleep(minSec + Math.random() * (maxSec - minSec));
}

function jsonHeaders(token) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = token;
  return { headers };
}

// Search keywords sampled during user actions
const SEARCH_KEYWORDS = [
  "volumetest",
  "product",
  "laptop",
  "phone",
  "book",
  "shirt",
  "keyboard",
  "camera",
  "monitor",
  "headphones",
];

// Pre-built test-user list — matches seed-volume-data.js (same pattern as spike-testing)
const VT_TEST_USERS = [];
for (let i = 0; i < VT_USER_COUNT; i++) {
  const idx = String(i).padStart(4, "0");
  VT_TEST_USERS.push({
    email: `vt_user_${idx}@volumetest.com`,
    password: VT_USER_PASSWORD,
  });
}

// ---------------------------------------------------------------------------
// Thread Group 1: data_loader
//
// Each VU logs in as admin once, then continuously creates new products.
// This simulates MongoDB data growth over the course of the test.
// ---------------------------------------------------------------------------

export function dataLoader() {
  // --- Admin login (once per VU iteration set-up) ---
  const loginRes = http.post(
    `${API_AUTH}/login`,
    JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
    jsonHeaders()
  );

  const loginOk = check(loginRes, {
    "data_loader login: status 200": (r) => r.status === 200,
    "data_loader login: has token": (r) => {
      try { return !!JSON.parse(r.body).token; } catch (_) { return false; }
    },
  });

  dataLoaderErrors.add(!loginOk);
  if (!loginOk) {
    sleep(2);
    return;
  }

  let adminToken = "";
  try { adminToken = JSON.parse(loginRes.body).token || ""; } catch (_) {}

  // --- Fetch a category ID to attach to the product ---
  const catRes = http.get(`${API_CATEGORY}/get-category`, jsonHeaders(adminToken));
  const catOk = check(catRes, {
    "data_loader get-category: status 200": (r) => r.status === 200,
  });
  dataLoaderErrors.add(!catOk);

  let categoryId = null;
  try {
    const categories = JSON.parse(catRes.body).category || [];
    if (categories.length > 0) {
      categoryId = randomItem(categories)._id;
    }
  } catch (_) {}

  if (!categoryId) {
    sleep(1);
    return;
  }

  // --- Create a new product (multipart/form-data) ---
  // Use VU ID and iteration counter for a deterministic, unique slug
  // so these data-loader products are also cleaned up by teardown-volume-data.js
  const uniqueSuffix = `${__VU}-${__ITER}`;
  const formData = {
    name: `VolumeTest DL Product ${uniqueSuffix}`,
    slug: `vt_dl_${uniqueSuffix}`,
    description: `Volume-test data-loader product created by VU ${__VU} iteration ${__ITER}.`,
    price: String(randomInt(1, 9999)),
    quantity: String(randomInt(1, 100)),
    category: categoryId,
    shipping: "true",
  };

  const createRes = http.post(
    `${API_PRODUCT}/create-product`,
    formData,
    { headers: { Authorization: adminToken }, tags: { scenario: "data_loader" } }
  );

  const createOk = check(createRes, {
    "data_loader create product: status 201": (r) => r.status === 201,
  });

  dataLoaderDuration.add(createRes.timings.duration);
  dataLoaderErrors.add(!createOk);

  if (createOk) {
    productsInserted.add(1);
  }

  // Think time between inserts — shorter = more aggressive data growth
  randomSleep(1, 3);
}

// ---------------------------------------------------------------------------
// Thread Group 2: user_actions
//
// Each VU simulates a shopper browsing the catalogue.
// Operations test the read-heavy paths that are most sensitive to data volume:
//   list, paginate, search, filter, single product, orders.
// ---------------------------------------------------------------------------

export function userActions() {
  // --- Login as a volume-test user ---
  // Use __VU (virtual user ID) to deterministically distribute users across VUs,
  // avoiding random selection of authentication credentials (CodeQL js/insecure-randomness)
  const user = VT_TEST_USERS[(__VU - 1) % VT_USER_COUNT];

  const loginRes = http.post(
    `${API_AUTH}/login`,
    JSON.stringify({ email: user.email, password: user.password }),
    jsonHeaders()
  );

  const loginOk = check(loginRes, {
    "user_actions login: status 200": (r) => r.status === 200,
  });
  loginDuration.add(loginRes.timings.duration);
  userActionErrors.add(!loginOk);

  let token = "";
  try { token = JSON.parse(loginRes.body).token || ""; } catch (_) {}

  randomSleep(1, 2);

  // --- 1. List all categories ---
  const catRes = http.get(`${API_CATEGORY}/get-category`, jsonHeaders(token));
  const catOk = check(catRes, {
    "user_actions get-category: status 200": (r) => r.status === 200,
  });
  categoryListDuration.add(catRes.timings.duration);
  userActionErrors.add(!catOk);

  let categoryId = null;
  try {
    const cats = JSON.parse(catRes.body).category || [];
    if (cats.length > 0) categoryId = randomItem(cats)._id;
  } catch (_) {}

  randomSleep(1, 2);

  // --- 2. List products (first page) ---
  const listRes = http.get(`${API_PRODUCT}/product-list/1`, jsonHeaders(token));
  const listOk = check(listRes, {
    "user_actions product-list: status 200": (r) => r.status === 200,
  });
  listProductsDuration.add(listRes.timings.duration);
  userActionErrors.add(!listOk);

  randomSleep(1, 2);

  // --- 3. Product count (used by pagination UI) ---
  const countRes = http.get(`${API_PRODUCT}/product-count`, jsonHeaders(token));
  check(countRes, { "user_actions product-count: status 200": (r) => r.status === 200 });

  let totalProducts = 0;
  try { totalProducts = JSON.parse(countRes.body).total || 0; } catch (_) {}

  // --- 4. Paginate to a random page ---
  const perPage = 6;
  const maxPage = Math.max(1, Math.floor(totalProducts / perPage));
  const randomPage = randomInt(1, Math.min(maxPage, 50)); // cap at 50 to avoid deep offsets

  const pageRes = http.get(`${API_PRODUCT}/product-list/${randomPage}`, jsonHeaders(token));
  const pageOk = check(pageRes, {
    "user_actions pagination: status 200": (r) => r.status === 200,
  });
  paginationDuration.add(pageRes.timings.duration);
  userActionErrors.add(!pageOk);

  randomSleep(1, 2);

  // --- 5. Search by keyword ---
  const keyword = randomItem(SEARCH_KEYWORDS);
  const searchRes = http.get(
    `${API_PRODUCT}/search/${keyword}`,
    { ...jsonHeaders(token), tags: { endpoint: "search" } }
  );
  const searchOk = check(searchRes, {
    "user_actions search: status 200": (r) => r.status === 200,
  });
  searchDuration.add(searchRes.timings.duration);
  userActionErrors.add(!searchOk);

  randomSleep(1, 2);

  // --- 6. Filter by category and price range ---
  const filterPayload = JSON.stringify({
    checked: categoryId ? [categoryId] : [],
    radio: [0, randomInt(100, 5000)],
  });
  const filterRes = http.post(`${API_PRODUCT}/product-filters`, filterPayload, jsonHeaders(token));
  const filterOk = check(filterRes, {
    "user_actions product-filters: status 200": (r) => r.status === 200,
  });
  filterDuration.add(filterRes.timings.duration);
  userActionErrors.add(!filterOk);

  // Extract a product ID from filter results for the next step
  let productSlug = null;
  try {
    const products = JSON.parse(filterRes.body).products || [];
    if (products.length > 0) productSlug = randomItem(products).slug;
  } catch (_) {}

  randomSleep(1, 2);

  // --- 7. View a single product (slug-based) ---
  if (productSlug) {
    const singleRes = http.get(`${API_PRODUCT}/get-product/${productSlug}`, jsonHeaders(token));
    const singleOk = check(singleRes, {
      "user_actions single-product: status 200": (r) => r.status === 200,
    });
    singleProductDuration.add(singleRes.timings.duration);
    userActionErrors.add(!singleOk);
  }

  randomSleep(1, 2);

  // --- 8. View own orders ---
  if (token) {
    const ordersRes = http.get(`${API_AUTH}/orders`, jsonHeaders(token));
    const ordersOk = check(ordersRes, {
      "user_actions orders: status 200": (r) => r.status === 200,
    });
    ordersDuration.add(ordersRes.timings.duration);
    userActionErrors.add(!ordersOk);
  }

  randomSleep(1, 2);
}

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------

export function handleSummary(data) {
  const now = new Date();
  const ts = now.toISOString().replace(/[:.]/g, "-");

  return {
    stdout: textSummary(data, { indent: "  ", enableColors: true }),
    [`./volume-report-${ts}.json`]: JSON.stringify(data, null, 2),
    [`./volume-report-${ts}.txt`]: textSummary(data, {
      indent: "  ",
      enableColors: false,
    }),
  };
}
