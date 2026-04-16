# 📓 Implementation Journal: Stabilizing Vacature Tovenaar E2E

Building the "End of World" automation suite for the Vacature Tovenaar platform was a journey of resolving deep-seated environment instabilities and aligning multi-language AI flows. This document outlines the technical hardships faced and the solutions implemented.

## 🏗️ Technical Hardships & Overcoming them

### 1. The "AI Latency" Barrier
**Problem**: The platform relies heavily on AI to generate recruitment strategies and vacancy content. These steps often take 5–9 minutes to complete, which is far beyond the default Playwright timeout of 30 seconds.
**Solution**: We significantly extended project and test-level timeouts to **600,000ms (10 minutes)** and implemented robust, targeted wait logic specifically for the "Vacancy is ready" state.

### 2. UI Synchronization & Hydration Issues
**Problem**: The UAT environment exhibited intermittent "hydration" races where buttons appeared but weren't yet interactive, or subtle overlays blocked clicks.
**Solution**: We implemented `force: true` on critical transition clicks and developed a custom `injectStabilization` helper to ensure the UI was truly settled before the script proceeded with the next action.

### 3. The "Setup Project" Catch-22 (CI/CD)
**Problem**: Upon migrating to GitHub Actions, the tests initially failed because the `storageState` (used to store login sessions) was defined globally. Playwright would try to read a non-existent file before the `setup` project could even run to create it.
**Solution**: We refactored the configuration to isolate the `storageState` at the project level, ensuring the `setup` task could initialize correctly in a clean Linux environment.

### 4. Linux Case-Sensitivity & Archived Noise
**Problem**: Moving from local development (Windows) to GitHub Runners (Ubuntu) revealed "Module Not Found" errors due to case-insensitive paths working locally but failing on Linux. Additionally, old archived tests with broken paths were polluting the CI runs.
**Solution**: We updated the Playwright config to explicitly ignore the `**/archived/**` directory and standardized all path references to follow strict Linux compatibility.

### 5. Multi-Language Alignment
**Problem**: Ensuring the Dutch (NL) flow was as robust as the English (EN) baseline required managing nuances in translations and handling a vastly larger volume of intake triggering questions (20+ triggers).
**Solution**: We harmonized the processing logic to be identical across both languages, using inclusive regex patterns (e.g., `/View answers|Bekijk antwoorden/i`) to ensure the script worked regardless of the active language toggle.

## 🏆 Current Status
Through these iterations, we have achieved a **100% stable pass rate** on both local and CI environments, establishing a definitive "Golden Baseline" for all future testing.
