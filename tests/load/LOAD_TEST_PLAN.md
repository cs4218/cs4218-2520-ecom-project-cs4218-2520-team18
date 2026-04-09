# Load Testing Implementation Plan

## 1) Objectives

- Validate backend API performance under realistic e-commerce traffic.
- Identify bottlenecks in Express handlers, MongoDB queries, and auth-protected routes.
- Define and enforce measurable performance targets in CI for regression detection.

## 2) Success Criteria (Initial Targets)

- Public read APIs (browse/search):
  - p95 latency <= 500 ms
  - error rate < 1%
- Authenticated user APIs (profile/orders):
  - p95 latency <= 700 ms
  - error rate < 1%
- Admin APIs (orders/users/category management):
  - p95 latency <= 1000 ms
  - error rate < 2%
- System-level:
  - no sustained CPU saturation above 85%
  - no memory growth trend over a 30-minute endurance run

These are starting thresholds and should be tightened after baseline runs.

## 3) Scope

In scope:

- API load testing against the backend server on port 6060.
- Route groups:
  - Auth: register, login, forgot-password, profile.
  - Catalog: get-product, product-list, search, category list.
  - Orders: user orders, admin all-orders, order-status.
  - Category admin CRUD where relevant.
- Baseline, stress, and endurance runs.

Out of scope (phase 1):

- Browser-level UI load tests.
- Braintree external payment gateway load (mock this flow first).

## 4) Recommended Tooling

Primary choice: Apache JMeter

Reason:

- The project README already calls for JMeter.
- Good support for mixed scenarios, CSV parameterization, and HTML reports.

Optional future addition:

- k6 for simpler script-based CI gating if the team later wants JS-based tests.

## 5) Test Environment Strategy

Phase 1 local/dev:

- Run backend only with isolated test data.
- Use a dedicated MongoDB instance, not shared developer data.
- Prefer seeded data with realistic volume (see section 6).

Phase 2 CI/staging:

- Run against an environment that matches deployment shape (same Node version, similar DB size/indexes).
- Ensure no other heavy jobs run concurrently during load tests.

Important:

- Do not use USE_IN_MEMORY_MONGO=true for performance characterization.
- In-memory DB is excellent for correctness tests but not representative for load behavior.

## 6) Data Setup Plan

Target dataset for first meaningful run:

- Categories: 20-50
- Products: 5,000-20,000
- Users: 1,000-5,000
- Orders: 10,000+

Actions:

- Add a load seeding script under scripts/load/seedLoadData.js.
- Create deterministic test users for auth flows.
- Create a token bootstrap step for authenticated JMeter threads.

Data quality requirements:

- Product names and descriptions must vary to make search realistic.
- Price and category distributions should be non-uniform.

## 7) Workload Model

### 7.1 Traffic Mix (starting profile)

- 60% product browsing and listing
- 20% search
- 10% login/profile
- 8% order reads
- 2% admin operations

### 7.2 User Ramps

- Expected DAU simulation profile (~5000 DAU equivalent behavior):
  - ramp-up: 300s
  - steady duration: 1800s
  - threads split by scenario:
    - Scenario A (browse/search): 48
    - Scenario B (user auth/profile/orders): 16
    - Scenario C/D (admin/category): 8

### 7.3 Think Time

- Add realistic think time of 1-3 seconds between requests for journey-style scenarios.

## 8) Scenario Design

Scenario A: Anonymous browsing

- GET /api/v1/product/get-product
- GET /api/v1/product/product-list/1
- GET /api/v1/product/search/{keyword}

Scenario B: Authenticated customer journey

- POST /api/v1/auth/login
- GET /api/v1/auth/user-auth
- PUT /api/v1/auth/profile
- GET /api/v1/auth/orders

Scenario C: Admin operations

- POST /api/v1/auth/login (admin)
- GET /api/v1/auth/all-orders
- PUT /api/v1/auth/order-status/{orderId}
- GET /api/v1/auth/all-users

Scenario D: Category read/write mix

- GET /api/v1/category/get-category
- POST /api/v1/category/create-category
- PUT /api/v1/category/update-category/{id}

## 9) Observability and Diagnostics

Capture during every run:

- Throughput (requests/sec)
- Latency percentiles (p50, p90, p95, p99)
- Error rate by endpoint and status code
- Node process CPU and memory
- MongoDB CPU, memory, and slow query metrics

Implementation suggestions:

- Enable Mongo slow query logging for staging runs.
- Export JMeter HTML report artifact per run.
- Keep raw JTL files for failed or regressed runs.

## 10) Execution Workflow

1. Seed load dataset.
2. Start backend in load-test mode with a dedicated DB URL.
3. Run smoke profile. Fix immediate errors if any.
4. Run baseline profile and store as reference metrics.
5. Run stress and endurance profiles.
6. Produce summary report with SLO pass/fail and top bottlenecks.

## 11) CI Integration Plan

Phase 1 (non-blocking):

- Add npm script for expected-load test.
- Run expected-load on pull requests as informational (optional).

Phase 2 (blocking on main/nightly):

- Run expected-load nightly on staging.
- Fail pipeline when p95 or error-rate thresholds are breached by agreed margin.

## 12) Implementation Tasks (Suggested Breakdown)

Task 1: Foundation

- Add tests/load/jmeter/ with test plan files and CSV data.
- Add scripts/load/seedLoadData.js.
- Add scripts/load/generateTokens.js or token bootstrap logic in JMeter.

Task 2: First runnable suite

- Implement Scenario A and B with smoke profile.
- Generate and verify report outputs.

Task 3: CI and governance

- Add npm scripts and CI job.
- Add threshold checks and regression policy.

## 13) Risks and Mitigations

Risk: flaky results due to shared environment noise.
Mitigation: run in dedicated window/environment and repeat each profile at least 3 times.

Risk: unrealistic DB performance from tiny datasets.
Mitigation: enforce minimum dataset sizes before baseline/stress.

Risk: auth token expiry during long runs.
Mitigation: include periodic re-login or token refresh logic.

Risk: external dependency instability (payment provider).
Mitigation: exclude or mock external payment calls in phase 1.

## 14) Definition of Done

- JMeter suite executes all target scenarios without manual edits.
- Expected-load reports are generated and archived.
- Team-agreed SLO thresholds are documented and enforced in CI for at least smoke tests.
- A short runbook exists for local and CI execution.

## 15) Additional Notes
- Include parameters so that test runs can be easily adjusted (e.g., number of users, duration) without changing the JMeter test plan.
