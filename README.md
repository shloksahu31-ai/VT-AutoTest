# Vacature Tovenaar Test Automation (UAT)

This repository contains the stabilized end-to-end (E2E) testing framework for the Vacature Tovenaar platform on UAT environments.

## 🌟 E2E Golden Baseline (v1.0)
This project follows a strict **"Golden Baseline"** protocol verified by browser extension recording on 2026-04-01.

- **[PROTECTED POLICY](file:///c:/Users/shlok/Desktop/Work/Vacature%20Tovenaar/vacature-tovenaar-testing/e2e/Knowledge%20items/GOLDEN_BASELINE_POLICY.md)**: "Logic should never be removed."
- **[MASTER NAVIGATION PROMPT](file:///c:/Users/shlok/Desktop/Work/Vacature%20Tovenaar/vacature-tovenaar-testing/e2e/Knowledge%20items/MASTER_E2E_FLOW_PROMPT.md)**: Definitive guide for E2E flow navigation (NL & EN).
- **[Dutch Baseline](file:///c:/Users/shlok/Desktop/Work/Vacature%20Tovenaar/vacature-tovenaar-testing/e2e/Knowledge%20items/BASELINE_RECORDED_FLOW.md)** | **[English Baseline](file:///c:/Users/shlok/Desktop/Work/Vacature%20Tovenaar/vacature-tovenaar-testing/e2e/Knowledge%20items/BASELINE_RECORDED_FLOW_EN.md)**
- **[Original User Instructions](file:///c:/Users/shlok/Desktop/Work/Vacature%20Tovenaar/vacature-tovenaar-testing/e2e/Knowledge%20items/ORIGINAL_USER_INSTRUCTIONS.md)**

---

## 🚀 Getting Started
This is the standalone end-to-end (E2E) testing framework for Vacature Tovenaar. It runs via Playwright and is fully detached from the main application codebase.

## 🚀 Running Tests Locally Before Pushing to UAT

You should always verify your Playwright tests locally against your development environment before merging changes that will be executed in UAT.

### 1. Configure the Local Environment

First, create a local environment file. Playwright looks for `.env.e2e` defined in `playwright.config.ts`.

Copy the example file to create your active `.env.e2e`:
```bash
cp .env.e2e.example .env.e2e
```

Open `.env.e2e` and update the values to point to your local development servers:

```env
# E2E_BASE_URL should point to the frontend you are testing
E2E_BASE_URL=http://localhost:3000  # or http://rws.localhost:9002 for studio

# The credentials of test users you seeded locally
E2E_USERNAME=superadmin@platform.local
E2E_PASSWORD=superadmin123
```

*(Note: Ensure your local Studio, Admin, and Backend servers are actually running before trying to test them!)*

### 2. Run the Tests

You can use the built-in npm scripts to trigger the tests:

```bash
# Run all tests headlessly
npm run test

# Run tests with the Playwright UI (highly recommended for local debugging!)
npm run test:ui

# Run only a specific project/suite
npx playwright test --project=auth
```

### 3. Debugging Failing Tests

If a test fails or times out, Playwright will automatically save screenshots and traces into the `playwright-report/` directory.

To view the report interactively:
```bash
npm run report
```

