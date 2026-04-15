# Master Navigation Prompt: E2E Golden Flow (NL & EN)
*Revision: v1.0 (2026-04-01)*

## 1. Overview
This prompt is a high-fidelity guide for any AI Agent or Human to execute the full "Process Automation Analyst" End-to-End flow. It handles language switching, onboarding stabilization, and high-complexity multi-tab form handling.

## 2. Definitive Execution Steps

### Step 1: Authentication & Stabilization
- **Action**: Login to `uat-demo.vacaturetovenaar.nl/login`.
- **Logic**: Use credentials (`shlok@example.com / demo1234`).
- **Wait**: Ensure the dashboard loads and the `onboarding_state` is suppressed (see `stabilization.ts`).

### Step 2: Language Switching (Optional)
- **NL to EN**: Click the Header language toggle (`NL` button) and select `EN`.
- **Target**: Confirm the interface text changes to English (e.g., "Create New Vacancy").

### Step 3: Vacancy Creation
- **Action**: Click "Create New Vacancy" / "Nieuwe Vacature Maken".
- **Modal Inputs**: 
  - Position: `Process Automation Analyst`
  - Location: `The Hague`
  - Type: `Regular` / `Regulier`
- **Trigger**: Click "Create Vacancy" / "Vacature Maken".

### Step 4: Intake Option B (Manual Form)
- **Selection**: Click "Generate intake questions" / "Genereer intake vragen".
- **Utility**: In the Manual Entry dropdown, select "Form" / "Formulier".
- **Identify**: Enter "shlok" as the manager name.
- **Trigger**: Click "Open Form" / "Open Formulier". **(TAB 2 OPENS)**

### Step 5: Multi-Tab Form Submission (Tab 2)
- **Sync**: Wait for the interview questions form to load.
- **Action**: Answer all generated questions.
- **Trigger**: Click "Submit Form" / "Formulier Verzenden".
- **Exit**: Verify the "Thank you" / "Bedankt" message and close Tab 2.

### Step 6: Pipeline Generation (Tab 1)
- **Sync**: Return to the main tab. Click "View answers & continue" / "Bekijk antwoorden & ga verder".
- **Review**: Click "Use answers & continue" / "Gebruik antwoorden & ga verder".
- **Finalize**: Click "Mark as Complete" / "Markeer als Voltooid".

### Step 7: Writer -> Advisor Pipeline
- **Command**: Run the AI writing workflow in sequence:
  1. Generate Candidate Persona.
  2. Continue to Questions.
  3. Generate Full Job Posting.
  4. Determine Recruitment Strategy / Wervingsstrategie Bepalen.

### Step 8: Final Advisor Check
- **Verification**: Ensure all 5 tabs load and report data:
  - `Salary & Market` / `Salaris & Markt`
  - `Target DNA` / `Doelgroep DNA`
  - `Competition & SEO` / `Concurrentie & SEO`
  - `Channels` / `Kanalen`
  - `Budget & Time` / `Budget & Tijd`

---
> [!IMPORTANT]
> The selectors used in this flow (e.g., `#jobTitle`, `text="Mark as Complete"`) are verified baseline locators. Do not change them unless the UI undergoes a major structural change.
