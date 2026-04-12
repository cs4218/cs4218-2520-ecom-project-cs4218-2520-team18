Sherwyn Ng, A0255132N

# Semgrep SAST Setup Guide

## What is Semgrep?

Semgrep is a static analysis security testing (SAST) tool that scans your code for security vulnerabilities, bugs, and code quality issues without running the code.

## Installation

### Option 1: Docker (Recommended - No Install Required)

```bash
# Run Semgrep in Docker
docker run -v /path/to/your/repo:/src returntocorp/semgrep semgrep --config=.semgrep.yml /src
```

### Option 2: Direct Install (macOS with Homebrew)

```bash
brew install semgrep
```

### Option 3: Using pip

```bash
pip install semgrep
```

### Option 4: Using npm (Node.js)

```bash
npm install -g semgrep
```

## Running Semgrep Locally

Once installed, run from the project root:

```bash
# Quick scan with human-readable output
npm run sast:report

# Or if Semgrep is installed globally
semgrep --config=.semgrep.yml .

# Generate JSON report for parsing
npm run sast
```

## What It Checks

The `.semgrep.yml` configuration includes rules for:

1. **Hardcoded Secrets** (HIGH) - API keys, passwords, tokens in code
2. **SQL Injection** (HIGH) - Unsafe database queries
3. **Command Injection** (HIGH) - Unsafe shell command execution
4. **Weak Cryptography** (HIGH) - Use of MD5/SHA1 instead of SHA-256+
5. **Missing Authentication** (MEDIUM) - Routes without auth checks
6. **Console Logging** (MEDIUM) - Sensitive data leaking to logs

## Understanding Output

Example output:

```
controllers/userController.js
  Line 45: console.log("User password:", password)
  Rule: console-credentials
  Severity: MEDIUM
  Message: Avoid logging sensitive data to console
```

### Severity Levels:

- **HIGH**: Security vulnerability - fix immediately
- **MEDIUM**: Code quality/security concern - should fix
- **LOW**: Best practice suggestion

## CI/CD Integration

Add to your GitHub Actions (`.github/workflows/sast.yml`):

```yaml
name: SAST with Semgrep

on: [push, pull_request]

jobs:
  semgrep:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Run Semgrep
        uses: returntocorp/semgrep-action@v1
        with:
          config: >-
            p/security-audit
            p/owasp-top-ten
            p/cwe-top-25
```

## Customizing Rules

Edit `.semgrep.yml` to:

- Add more rules from [Semgrep Registry](https://semgrep.dev/r)
- Exclude specific files: `--exclude-dir=node_modules`
- Run specific rules only: `semgrep -r hardcoded-secrets .`

## Next Steps

1. Run `npm run sast:report` to see initial findings
2. Review and fix HIGH severity issues first
3. Plan DAST testing with OWASP ZAP next
4. Add to CI/CD pipeline for continuous checking

## Resources

- [Semgrep Docs](https://semgrep.dev/docs)
- [Rule Registry](https://semgrep.dev/r)
- [Playground](https://semgrep.dev/playground)
