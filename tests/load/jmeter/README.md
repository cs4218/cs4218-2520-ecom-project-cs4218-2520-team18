# JMeter Layout

This directory is intentionally simple for current needs: one expected-load profile for roughly 5000 DAU simulation.

## Structure

- common/: reusable defaults and helper assets.
- data/: CSV inputs shared across scenarios.
- scenarios/: scenario-level JMX plans (A/B/C/D, mixed, etc.).
- profiles/: per-run profile property files.
  - expected-dau-5000/
- ../../results/jmeter/: raw JTL result files.
- ../../reports/jmeter/: generated HTML reports.

## Extension pattern

1. Add or update a JMX file under plans/.
2. Run using scripts/load/runJMeter.mjs expected-dau-5000 mixed-api.

If needed later, add more profile folders under profiles/ without changing the runner.
