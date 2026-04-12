Sherwyn Ng, A0255132N

# CI/CD Security Testing Integration

## Overview

This project now includes automated security testing in CI/CD pipeline:

- **SAST** (Static Analysis) – Semgrep on every push & pull request
- **DAST** (Dynamic Analysis) – OWASP ZAP (coming next)

## Current Setup: Semgrep in GitHub Actions

### What Happens Automatically

1. **On push to `main` or `sherwyn-integrationUItests`:**
   - Semgrep scans entire codebase
   - Results uploaded to GitHub Security tab
   - Sarif report generated

2. **On pull request:**
   - Semgrep scans changed files
   - Posts comment on PR with findings
   - Blocks merge if HIGH severity issues found (configurable)

### Viewing Results

#### GitHub Security Tab

```
Repository → Security → Code scanning
```

Shows all Semgrep findings with drill-down details.

#### Pull Request Comments

Bot automatically comments with:

- ✅ "Scan passed" (no issues)
- ⚠️ Issue list with file/line links

#### Local Verification

```bash
# Run same scan locally before pushing
npm run sast:report

# Or with login for pro rules
semgrep ci
```

## Configuration Details

**File:** `.github/workflows/sast.yml`

**Triggers:**

- Push to `main` or `sherwyn-integrationUItests`
- PR against `main`

**Rulesets Used:**

- `p/security-audit` – General security patterns
- `p/owasp-top-ten` – Web app vulnerabilities
- `p/cwe-top-25` – Most dangerous weaknesses
- `p/nodejs` – Node.js specific issues
- `p/express` – Express.js vulnerabilities

## Next: DAST Testing with OWASP ZAP

For dynamic testing (runtime vulnerabilities), add:

```yaml
# .github/workflows/dast.yml (to be created)
name: DAST with OWASP ZAP

on:
  schedule:
    - cron: '0 2 * * *'  # Daily at 2am
  workflow_dispatch

jobs:
  zap:
    runs-on: ubuntu-latest
    steps:
      # Start app, run ZAP scan, upload results
```

## Secrets Configuration (If Using Pro Semgrep)

To enable Semgrep pro features in CI:

1. Create Semgrep token: https://semgrep.dev/settings/tokens
2. Add to GitHub secrets:
   ```
   Repo Settings → Secrets and variables → Actions
   New secret: SEMGREP_APP_TOKEN
   ```
3. Update workflow to use token:
   ```yaml
   env:
     SEMGREP_APP_TOKEN: ${{ secrets.SEMGREP_APP_TOKEN }}
   ```

Then workflows will have access to:

- 2,931 pro rules
- Advanced taint analysis
- Dependency scanning
- Cross-file analysis

## Monitoring & Alerts

### GitHub Branch Protection

Require Semgrep to pass before merging:

```
Repo Settings → Branches → main
→ Require status checks to pass before merging
→ Select "Semgrep Security Scan"
```

### Slack Notifications (Optional)

```yaml
- name: Notify Slack on failure
  if: failure()
  uses: slackapi/slack-github-action@v1.24
  with:
    webhook-url: ${{ secrets.SLACK_WEBHOOK }}
```

## Troubleshooting

**Workflow not running?**

- Check `.github/workflows/sast.yml` exists
- Verify file syntax: `yamllint .github/workflows/sast.yml`
- Check Actions tab for error logs

**Too many false positives?**

- Create `.semgrep.yml` to customize rules
- Use `# nosemgrep` comments to suppress specific findings
- Adjust severity thresholds

**Build too slow?**

- Use `semgrep --baseline main` to scan only changed code
- Exclude node_modules: add to `.semgrepignore`

## Quick Commands

```bash
# Test locally before committing
npm run sast:report

# Check what would run in CI
semgrep ci --dry-run

# View all findings with pro rules (if logged in)
semgrep login
semgrep ci
```

## Files Modified

- ✅ `.github/workflows/sast.yml` – GitHub Actions workflow
- ✅ `package.json` – npm scripts (`sast`, `sast:report`)
- ✅ `.semgrep.yml` – Semgrep configuration
- ✅ `.gitignore` – Added report files

## Next Steps

1. ✅ Push to trigger first SAST workflow
2. View results in GitHub Security tab
3. Set up branch protection rules
4. Create DAST workflow with OWASP ZAP
5. Configure Slack/email notifications

Ready to set up DAST testing next?
