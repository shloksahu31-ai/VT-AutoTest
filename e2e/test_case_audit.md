# E2E Test Case Audit & Mapping (UAT)

This document maps all existing test scripts in the `e2e/tests` directory to their specific test case objectives and assesses their current health status on the **UAT** environment.

## 1. Core Authentication & Stability
| Script | Test Case Objective | Status | Priority |
| :--- | :--- | :--- | :--- |
| `auth.spec.ts` | Valid/Invalid login, API token refresh. | ✅ Stable | High |
| `minimal.spec.ts` | Basic URL reachability and login check. | ✅ Stable | Low |
| `integration-v4.spec.ts` | Consolidated End-to-End AI generation pipeline. | ✅ Stable | High |
| `edge-cases.spec.ts` | AI feedback interaction & public form bypass. | ✅ Stable | High |

## 2. Legacy E2E & Flow (Redundant)
| Script | Test Case Objective | Status | Action |
| :--- | :--- | :--- | :--- |
| `full-flow.spec.ts` | Ultra-granular 13-stage E2E verification. | ❌ Broken | Retire / Partial Salvage |
| `happy-path.spec.ts` | Original Intake-to-Advisor happy path. | ❌ Redundant | Retire |
| `integration-v3.spec.ts`| Previous Phase C iteration (before V4 stabilization).| ❌ Redundant | Retire |

## 3. Module & Logic Verification
| Script | Test Case Objective | Status | Priority |
| :--- | :--- | :--- | :--- |
| `dashboard.spec.ts` | Navigation presence, stats loading, UI error check. | ⚠️ Port Guards | Medium |
| `intake-flow.spec.ts` | Chat interface UX, input states, SSE receipt check. | ⚠️ Port Guards | Medium |
| `vacancy-writer.spec.ts`| Multi-step AI writing steps (Persona, Tone, Draft). | ⚠️ Update Flow | High |
| `smoke.spec.ts` | Visual elements, Dutch labels, quick smoke check. | ⚠️ Port Guards | Low |

## 4. Backend & AI Quality
| Script | Test Case Objective | Status | Priority |
| :--- | :--- | :--- | :--- |
| `intake-api.spec.ts` | Direct API/SSE logic, intent classification, extraction. | ⚠️ Audit SSE | Medium |
| `intake-quality.spec.ts`| LLM-based evaluation of intake response quality. | ⚠️ Audit Logic | Low |

---
## Stabilization Plan (Phase D)
1. **Port Guards**: Inject `hardDismissTour` stabilization and environment-aware `auth` into `dashboard.spec.ts` and `smoke.spec.ts`.
2. **Update AI Logic**: Refactor `vacancy-writer.spec.ts` to strictly adhere to the current 4-step pipeline (Persona -> Tone -> Draft).
3. **Verify API Integrity**: Test `intake-api.spec.ts` on UAT to ensure SSE handling is compatible with recent proxy/authentication guard updates.
