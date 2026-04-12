Sherwyn Ng, A0255132N

# DAST Testing with OWASP ZAP

## What is DAST?

**DAST = Dynamic Application Security Testing**

- Tests the **running application** from outside (like a hacker would)
- Finds **runtime vulnerabilities** that SAST can't detect:
  - Authentication bypass
  - Session management flaws
  - Business logic vulnerabilities
  - API security issues
  - Client-side vulnerabilities (XSS, CSRF)
  - Database security misconfigurations

## SAST vs DAST

| Feature             | SAST (Semgrep)               | DAST (OWASP ZAP)            |
| ------------------- | ---------------------------- | --------------------------- |
| **When it runs**    | Code analysis (no execution) | Running app (execution)     |
| **Speed**           | Fast (few seconds)           | Slow (minutes/hours)        |
| **False positives** | High (pattern matching)      | Lower (actual testing)      |
| **Setup**           | Simple                       | Needs running app + DB      |
| **Best for**        | Catching obvious bugs        | Finding real attack vectors |

## Setup

Your DAST workflow is ready at `.github/workflows/dast.yml`

### Prerequisites

1. **Application must start successfully**
   - Docker Compose for dependencies (MongoDB already configured)
   - Environment variables in GitHub Secrets

2. **Available endpoints for scanning**
   - Home page: `http://localhost:8080`
   - API endpoints: `/api/auth`, `/api/products`, etc.
   - Admin pages (if not behind auth): `/api/admin`

### Running DAST

**Option 1: Automatic (Daily Schedule)**

```
Every day at 2 AM UTC → Full baseline scan
```

**Option 2: Manual Trigger**

```
GitHub Actions → Workflows → DAST with OWASP ZAP
→ Run workflow → Choose baseline or full scan
```

**Option 3: Local Testing**

```bash
# Install ZAP locally (macOS)
brew install zaproxy

# Start your app
npm run server &

# Run baseline scan
zaproxy -cmd \
  -quickurl http://localhost:8080 \
  -quickout report.html
```

## Understanding ZAP Reports

### Risk Levels

- **HIGH** – Critical vulnerabilities (e.g., SQL injection, auth bypass)
- **MEDIUM** – Important issues (e.g., weak headers, info disclosure)
- **LOW** – Best practices (e.g., outdated libraries)
- **INFO** – Informational findings

### Common Findings

**Example: Missing Security Header**

```
Alert: Missing Anti-CSRF Tokens
Risk: Medium
Solution: Add CSRF protection middleware
Code: res.setHeader('X-CSRF-Token', token)
```

**Example: Stored XSS**

```
Alert: Cross Site Scripting (Stored)
Risk: High
Solution: Sanitize user input before storing
Code: const clean = DOMPurify.sanitize(userInput)
```

## Configuration Files

### `.github/workflows/dast.yml`

- Triggers: Daily schedule + manual workflow
- Services: MongoDB for testing
- Environment: Test JWT secret auto-generated
- Reports: HTML + JSON artifacts

### `.zap/rules.tsv`

- Controls which security checks ZAP runs
- Current: All OWASP Top 10 enabled
- Customize: Comment out rules to skip

## Common Issues & Fixes

### "App fails to start in CI"

```bash
# Ensure .env has all required vars
PORT=8080
MONGO_URL=mongodb://localhost:27017/test
JWT_SECRET=test_secret
```

### "ZAP finds too many false positives"

Edit `.zap/rules.tsv` to disable noisy checks:

```
10002	DISABLED	# Disable reflected XSS checks
10030	DISABLED	# Disable security header warnings
```

### "Scan is too slow"

```yaml
# In dast.yml, reduce scan depth
-m 1 # Max depth = 1 (faster but less thorough)
```

### "Authentication required for scanning"

```yaml
# Add pre-login step before ZAP scan
- name: Authenticate if needed
  run: |
    # Login and save session cookie
    curl -X POST http://localhost:8080/api/auth/login \
      -d '{"email":"admin@test.com","password":"test"}' \
      -c cookies.txt
```

## Integration with Branch Protection

Set ZAP to **block high-risk merges**:

```
Repo Settings → Branches → main
→ Require status checks to pass
→ Add "DAST with OWASP ZAP"
```

Now PRs can't merge if ZAP finds HIGH severity issues.

## Next Steps

1. ✅ Push code to trigger SAST workflow
2. View results in GitHub Security tab
3. Run DAST manually: GitHub Actions → DAST workflow → Run workflow
4. Review ZAP HTML report in artifacts
5. Fix HIGH severity findings
6. Enable branch protection rules
7. Schedule automated daily scans

## Local Testing Before CI

Test DAST locally first:

```bash
# Terminal 1: Start app
npm run server

# Terminal 2: Run ZAP (requires zaproxy brew installed)
zaproxy -cmd -quickurl http://localhost:8080 -quickout zap-report.html

# Open report
open zap-report.html
```

## Monitoring & Documentation

Save reports in artifacts for:

- 📊 Trend analysis (security improving?)
- 📋 Audit trail (what was tested?)
- 🔍 Root cause analysis (which patterns leak issues?)

## Resources

- [OWASP ZAP Guide](https://www.zaproxy.org/docs/)
- [ZAP GitHub Action](https://github.com/zaproxy/action-baseline)
- [OWASP Top 10](https://owasp.org/Top10/)
- [CWE/SANS Top 25](https://cwe.mitre.org/top25/)
