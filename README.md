# Playwright Test (practice)

Hands-on Playwright + TypeScript practice on https://testautomationpractice.blogspot.com/

Phase 1: plain tests, no Page Object Model. Phase 2: refactor into POM.

## Run

| Command | What it does |
|---|---|
| `npm test` | Run all tests (headless) |
| `npm run test:headed` | Run with the browser visible |
| `npm run test:ui` | Playwright UI mode: pick tests, watch each step, time-travel |
| `npm run test:debug` | Step through a test with the inspector |
| `npm run codegen` | Record clicks on the site and get generated code |
| `npm run report` | Open the last HTML report |
| `npx playwright test tests/<file>.spec.ts` | Run one file |

## Layout

```
tests/                  Spec files, numbered in learning order
test-data/              Files used by tests (e.g. upload)
playwright.config.ts    baseURL, trace/screenshot/video on failure
```
