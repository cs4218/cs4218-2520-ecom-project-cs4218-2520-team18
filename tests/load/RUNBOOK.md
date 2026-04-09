# Load Test Runbook

## Goal

Run one realistic expected-load simulation representing roughly 5000 daily active users.

## Prerequisites

- Apache JMeter installed and available on PATH as jmeter.
- Backend reachable at http://127.0.0.1:6060.
- Use a dedicated MongoDB for load tests.

## One-time setup

1. Seed synthetic load data:

```bash
npm run seed:load
```

2. (Optional) Pre-generate auth tokens:

```bash
npm run tokens:load
```

## Execute expected-load test

```bash
npm run test:load
```

This runs:

- Profile: expected-dau-5000
- Plan: mixed-api

## Outputs

- Raw JTL: tests/load/results/jmeter/expected-dau-5000/
- HTML report: tests/load/reports/jmeter/

## Tuning

Adjust expected load in:

- tests/load/jmeter/profiles/expected-dau-5000/profile.properties
- tests/load/jmeter/common/defaults.properties

Primary knobs:

- scenarioAThreads
- scenarioBThreads
- scenarioCDThreads
- rampUp
- duration
- thinkTimeMinMs
- thinkTimeMaxMs
