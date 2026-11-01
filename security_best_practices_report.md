# Security Best Practices Review

## Executive Summary

The project has solid application-level defenses, including safe React rendering, backend input validation, rate limiting, strict CORS configuration, safe error responses, and security-focused tests. However, the repository contains a tracked `.env` file with provider credentials, which requires immediate credential rotation and history cleanup. The deployed frontend also lacks a visible Content Security Policy in `vercel.json`, while the backend-only CSP does not cover static frontend responses.

Review scope: Python Flask backend, React/Vite frontend, deployment configuration, dependency manifests, and existing security tests.

## Findings

### Critical

#### SEC-001: Provider credentials committed in tracked `.env`

- **Severity:** Critical
- **Location:** `.env:8`, `.env:11`, `.env:12`
- **Rule ID:** FLASK-CONFIG-001 / REACT-CONFIG-001
- **Evidence:** The tracked `.env` file contains populated `*_API_KEY` values. `git ls-files .env` confirms that the file is tracked. The repository history also contains multiple commits for `.env`.
- **Impact:** Anyone with repository access, a leaked repository copy, or an exposed Git history can use the provider credentials. This can cause unauthorized API usage, quota exhaustion, financial impact, or access to provider account data. The values were intentionally not reproduced in this report.
- **Fix:** Rotate every exposed provider credential immediately at the provider, remove `.env` from the repository and all reachable Git history, and keep only placeholder values in `.env.example`. Treat any previously committed value as compromised, even if the current file is later deleted.
- **Mitigation:** Keep secrets only in deployment environment variables or a secret manager. Add a pre-commit/CI secret scanner and fail CI when `.env`, private keys, or high-confidence credential patterns are staged.
- **False positive notes:** The values may be test or development credentials, but they are populated provider-key-shaped values in a tracked file and must be treated as exposed until proven otherwise.

### High

#### SEC-002: Content Security Policy does not cover static frontend responses

- **Severity:** High
- **Location:** `vercel.json:2-12`; backend CSP is only added in `backend/core/security.py:205-233`
- **Rule ID:** REACT-CSP-001 / JS-CSP-001
- **Evidence:** `vercel.json` adds `X-Content-Type-Options`, `X-Frame-Options`, HSTS, `Referrer-Policy`, and `Permissions-Policy`, but no `Content-Security-Policy`. The Flask CSP is attached by backend middleware, while Vercel rewrites non-API routes to `/index.html`.
- **Impact:** Static React pages may be served without the `default-src 'self'`, `object-src 'none'`, `base-uri 'self'`, and `frame-ancestors 'none'` protections present on API responses. If a future frontend injection or compromised dependency occurs, the browser has less defense-in-depth.
- **Fix:** Add a response-header CSP for the static deployment in `vercel.json`, matching the actual application needs. Start with a report-only policy if necessary, then enforce it. Avoid adding `unsafe-eval`; minimize or remove `unsafe-inline` where the build permits.
- **Mitigation:** Verify production headers with an external request to the deployed site and ensure the policy covers API origins, image providers, and Google Fonts only where required.
- **False positive notes:** An upstream CDN or platform setting could add CSP outside this repository. This was not visible in the checked-in configuration, so verify the deployed response headers.

### Medium

#### SEC-003: Client IP rate limiting trusts caller-controlled `X-Forwarded-For` without an explicit proxy boundary

- **Severity:** Medium
- **Location:** `backend/core/security.py:77-92`, especially lines 84-90
- **Rule ID:** FLASK-RATE-001
- **Evidence:** `get_client_ip()` reads `X-Forwarded-For` and defaults `TRUSTED_PROXY_DEPTH` to `1`. There is no application-level validation that the immediate peer is a trusted reverse proxy before using the header.
- **Impact:** If the Flask service is reachable directly, or if the edge proxy does not overwrite/sanitize the header, an attacker can send different `X-Forwarded-For` values to obtain different rate-limit buckets and bypass the per-IP limiter. This primarily affects availability and upstream provider quota protection.
- **Fix:** Trust forwarded headers only when traffic is guaranteed to come through a configured proxy. Prefer the hosting platform's verified client-IP mechanism, or default to `request.remote_addr` and explicitly configure trusted proxy count/address ranges per deployment.
- **Mitigation:** Keep the edge/WAF rate limit enabled and test direct-origin access. Ensure the proxy overwrites `X-Forwarded-For` rather than appending to an attacker-controlled value.
- **False positive notes:** If Vercel or the production reverse proxy always terminates traffic and sanitizes this header, exploitability is reduced. The trust boundary is not enforced in application code.

#### SEC-004: Moderate npm advisory in ESLint development dependency tree

- **Severity:** Medium
- **Location:** `package.json:20-29`; resolved dependency tree in `package-lock.json`
- **Rule ID:** DEP-NPM-001
- **Evidence:** `npm audit` reports six moderate vulnerabilities involving `minimatch` and the ESLint toolchain, including a glob-pattern denial-of-service advisory. `npm audit --omit=dev` reports zero production dependency vulnerabilities. npm reports no non-breaking automatic fix.
- **Impact:** The vulnerable packages are development dependencies, so the direct production runtime impact is limited. A maliciously crafted lint/build input in a CI or developer environment could cause excessive resource consumption.
- **Fix:** Track the advisory and update ESLint/config packages when a compatible patched dependency becomes available. Evaluate a controlled `npm audit fix --force` only on a branch with a full lint/test review; do not force an unreviewed major toolchain change into production.
- **Mitigation:** Run CI with resource/time limits and avoid linting untrusted attacker-controlled repositories in privileged environments.
- **False positive notes:** This does not currently indicate a vulnerable production bundle; the affected packages are in `devDependencies`.

## Positive Controls Observed

- React code search found no `dangerouslySetInnerHTML`, `innerHTML`, `eval`, `new Function`, `document.write`, or unsafe browser navigation sinks.
- Flask production startup requires `FLASK_SECRET_KEY` when production mode is detected.
- CORS is allowlisted and does not enable credentials.
- API responses use safe generic error bodies and disable caching for errors.
- Backend security headers include CSP and clickjacking protection for responses handled by Flask.
- Input validation covers request size, URI length, traversal markers, dates, seasons, pagination, and search lengths.

## Validation Evidence

- `PYTHONPATH=. pytest -q tests/test_security.py`: **7 passed**
- `npm run lint`: **passed**
- `npm audit --omit=dev`: **0 production vulnerabilities**
- `npm audit`: **6 moderate development-dependency vulnerabilities; no automatic fix available**
- Initial `pytest -q tests/test_security.py` without `PYTHONPATH=.` failed during collection because the repository root was not on the import path; the corrected run passed.

## Recommended Order of Operations

1. Rotate and revoke the credentials from `.env` immediately, then remove the file from Git history.
2. Add and verify a CSP for static frontend responses in the deployment layer.
3. Confirm the production proxy sanitizes `X-Forwarded-For`, or change the application trust model.
4. Monitor the npm advisory and update the development toolchain when a compatible fix is available.
