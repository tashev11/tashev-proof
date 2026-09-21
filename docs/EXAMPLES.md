# Proof Examples Gallery

This gallery shows how Tashev Proof can verify common features that are often built quickly with AI assistance ("vibe-coded").  
Each example includes a copy-pasteable `.proof/contract.json` snippet and explains:

- what is verified automatically (`command`, `file_exists`, `file_contains`, `http`);
- what still requires `manual` attestation;
- why that manual step should not be faked by automation;
- expected `PROVEN` / `PARTIAL` / `FAILED` behavior.

These are illustrative contracts, not reusable "policy packs". Adapt commands, URLs and patterns to your project.  
Schema details are described in the main README.

> Conventions: ✅ PROVEN · 🟡 PARTIAL · ❌ FAILED  
> Schema version: `1`

---

## 1. Authentication / Password Reset

**Task:** "Users can sign up, log in, and reset a forgotten password."

```json
{
  "schemaVersion": 1,
  "project": "myapp",
  "task": "Authentication and password reset",
  "criteria": [
    {
      "id": "auth.signup",
      "title": "Signup endpoint returns 201 with a session token",
      "type": "http",
      "url": "http://localhost:3000/api/signup",
      "status": 201,
      "contains": "token"
    },
    {
      "id": "auth.login",
      "title": "Login succeeds with correct credentials",
      "type": "http",
      "url": "http://localhost:3000/api/login",
      "status": 200,
      "contains": "token"
    },
    {
      "id": "auth.reset-email",
      "title": "Password reset triggers an email job",
      "type": "command",
      "command": "npm run test:auth -- --reset-email"
    },
    {
      "id": "auth.review",
      "title": "Reset flow has token expiry and rate limiting",
      "type": "manual"
    }
  ]
}
```

**Automated verification**

- `auth.signup` and `auth.login` use `http` to prove the happy path: endpoints return expected status codes and a token.
- `auth.reset-email` uses `command` to assert that a reset action queues an email job (via a test script that checks a mock SMTP or job queue).

**Manual attestation**

- `auth.review` requires a human to confirm that the reset flow follows security best practices: token expiry, rate limiting, secure email templates, etc.

**Why manual**

Security posture and UX details are judgment calls. Automation can check that *something* is sent, but not whether the design is safe and user-friendly under real-world abuse patterns.

**Expected verdicts**

- If all `http` and `command` criteria pass but `auth.review` has no attestation → **PARTIAL**.  
- After `proof attest auth.review --note "..." --by "..."` → **PROVEN**.  
- If any required automated criterion fails (e.g., signup returns 500) → **FAILED**.

---

## 2. Stripe-style Webhook Idempotency

**Task:** "Process Stripe webhooks exactly once, even if delivered multiple times."

```json
{
  "schemaVersion": 1,
  "project": "myapp",
  "task": "Webhook idempotency",
  "criteria": [
    {
      "id": "webhook.first",
      "title": "First delivery of an event creates exactly one order",
      "type": "command",
      "command": "npm run test:webhook -- --event evt_test_1 --expect orders=1"
    },
    {
      "id": "webhook.duplicate",
      "title": "Duplicate delivery of the same event creates no new order",
      "type": "command",
      "command": "npm run test:webhook -- --event evt_test_1 --expect orders=1 --repeat"
    },
    {
      "id": "webhook.ack",
      "title": "Duplicate delivery still returns 200",
      "type": "http",
      "url": "http://localhost:3000/webhooks/stripe",
      "status": 200
    }
  ]
}
```

**Automated verification**

- `webhook.first` and `webhook.duplicate` use `command` to assert state: one order on first delivery, no new order on duplicate.
- `webhook.ack` uses `http` to ensure the duplicate still gets a 200 response (acknowledgment) without side effects.

**Manual attestation**

- Not strictly required for this task, but a reviewer may want to confirm that the idempotency key strategy matches the provider's semantics and that error handling for failed webhooks is robust. This can be added as an extra `manual` criterion if desired.

**Why manual**

Idempotency logic is easy to get subtly wrong (e.g., key scope, race conditions). Automation can prove the basic contract, but the design choices still need human review.

**Expected verdicts**

- If all `command` and `http` criteria pass → **PROVEN** (manual step optional).  
- If any state check fails (e.g., duplicate creates a second order) → **FAILED**.

---

## 3. REST API Health

**Task:** "The API is up, returns JSON, and responds within 500ms."

```json
{
  "schemaVersion": 1,
  "project": "myapp",
  "task": "REST API health check",
  "criteria": [
    {
      "id": "health.up",
      "title": "/health returns 200 with status: ok",
      "type": "http",
      "url": "http://localhost:3000/health",
      "status": 200,
      "contains": "\"status\":\"ok\""
    },
    {
      "id": "health.fast",
      "title": "/health responds in under 500ms",
      "type": "command",
      "command": "npm run test:health-latency -- --max-ms 500"
    },
    {
      "id": "health.deps",
      "title": "Health probe actually checks database and cache",
      "type": "manual"
    }
  ]
}
```

**Automated verification**

- `health.up` uses `http` to enforce the endpoint contract: status code and JSON body.
- `health.fast` uses `command` to enforce a latency budget via a test script.

**Manual attestation**

- `health.deps` requires a human to confirm that the health probe truly exercises critical dependencies (database, cache, queue), not just returns a static 200.

**Why manual**

A shallow health endpoint can give a false sense of safety. Only a person who knows the architecture can judge whether the probe is meaningful.

**Expected verdicts**

- If `http` and `command` pass but no attestation for `health.deps` → **PARTIAL**.  
- After `proof attest health.deps --note "..." --by "..."` → **PROVEN**.  
- If `/health` returns non-200 or exceeds latency → **FAILED**.

---

## 4. Database Migration

**Task:** "A schema migration can be applied and rolled back safely."

```json
{
  "schemaVersion": 1,
  "project": "myapp",
  "task": "Safe DB migration",
  "criteria": [
    {
      "id": "migration.up",
      "title": "Migration applies on a fresh database",
      "type": "command",
      "command": "npm run db:migrate:up"
    },
    {
      "id": "migration.schema",
      "title": "Expected tables and columns exist after migration",
      "type": "command",
      "command": "npm run db:assert-schema -- --table orders --column status"
    },
    {
      "id": "migration.down",
      "title": "Migration rolls back cleanly",
      "type": "command",
      "command": "npm run db:migrate:down"
    },
    {
      "id": "migration.prod-safety",
      "title": "Migration is safe to run in production without downtime",
      "type": "manual"
    }
  ]
}
```

**Automated verification**

- `migration.up`, `migration.schema`, and `migration.down` use `command` to prove the mechanics: up/down scripts work and the schema has the expected shape.

**Manual attestation**

- `migration.prod-safety` requires a human to assess production safety: data volume, lock times, backfill strategy, impact on live traffic.

**Why manual**

Automation can verify behavior on a small test database, but "safe on 500M rows with live traffic" depends on operational context and cannot be decided by a local command.

**Expected verdicts**

- If all `command` criteria pass but no attestation for `migration.prod-safety` → **PARTIAL**.  
- After `proof attest migration.prod-safety --note "..." --by "..."` → **PROVEN**.  
- If migration fails to apply/rollback or schema assertions fail → **FAILED**.

---

## 5. Responsive UI + Human Attestation

**Task:** "The landing page is usable on mobile and desktop."

```json
{
  "schemaVersion": 1,
  "project": "myapp",
  "task": "Responsive landing page",
  "criteria": [
    {
      "id": "ui.screenshots",
      "title": "Screenshots captured at mobile, tablet, desktop",
      "type": "command",
      "command": "npm run test:visual -- --viewports 375,768,1440"
    },
    {
      "id": "ui.regression",
      "title": "No unexpected visual diffs against baseline",
      "type": "command",
      "command": "npm run test:visual-diff -- --threshold 0.02"
    },
    {
      "id": "ui.review",
      "title": "A human reviewed the screenshots and approved the layout",
      "type": "manual"
    }
  ]
}
```

**Automated verification**

- `ui.screenshots` uses `command` to capture screenshots at multiple viewports.
- `ui.regression` uses `command` to detect unexpected visual diffs against a baseline.

**Manual attestation**

- `ui.review` requires a human to attest that the layout is actually good and matches design intent, not just "unchanged".

**Why manual**

Visual correctness is subjective. Automation can flag changes, but only a person can decide whether they are improvements or acceptable trade-offs.

**Expected verdicts**

- If screenshot and diff checks pass but no attestation for `ui.review` → **PARTIAL**.  
- After `proof attest ui.review --note "..." --by "..."` → **PROVEN**.  
- If visual diffs exceed the threshold or screenshot capture fails → **FAILED**.

---

## 6. Release Readiness

**Task:** "Everything required for a release has been done."

```json
{
  "schemaVersion": 1,
  "project": "myapp",
  "task": "Release v1.4.0",
  "criteria": [
    {
      "id": "release.tests",
      "title": "All tests pass",
      "type": "command",
      "command": "npm test"
    },
    {
      "id": "release.changelog",
      "title": "CHANGELOG.md contains v1.4.0",
      "type": "file_contains",
      "path": "CHANGELOG.md",
      "regex": "v1\\.4\\.0"
    },
    {
      "id": "release.version",
      "title": "package.json version is 1.4.0",
      "type": "file_contains",
      "path": "package.json",
      "regex": "\"version\":\\s*\"1\\.4\\.0\""
    },
    {
      "id": "release.signoff",
      "title": "Release manager approves the release",
      "type": "manual"
    }
  ]
}
```

**Automated verification**

- `release.tests` uses `command` to enforce that the test suite passes.
- `release.changelog` and `release.version` use `file_contains` to ensure changelog and version are updated.

**Manual attestation**

- `release.signoff` requires a release manager to attest that the release is ready for production, considering business context, known issues, and risk.

**Why manual**

Automation enforces the checklist, but the go/no-go decision is a business call, not a file check.

**Expected verdicts**

- If all automated criteria pass but no attestation for `release.signoff` → **PARTIAL**.  
- After `proof attest release.signoff --note "..." --by "..."` → **PROVEN**.  
- If tests fail or version/changelog checks fail → **FAILED**.

---

## How to use these examples

1. Create `.proof/contract.json` in your project root.  
2. Copy one of the snippets above and adapt:
   - `project` and `task` to your context;
   - `url`, `command`, `path`, and `regex` to your actual endpoints, scripts, and files.
3. Run:

   ```bash
   proof run
   ```

4. Inspect the verdicts:
   - ✅ PROVEN — all required criteria satisfied (including manual attestations).  
   - 🟡 PARTIAL — automated criteria passed, but some `manual` criteria lack attestation.  
   - ❌ FAILED — at least one required automated criterion failed.

Manual criteria can be attested with:

```bash
proof attest <criterion-id> --note "What was checked" --by "Reviewer"
```

Attestations are local runtime evidence and can be revoked if needed.
