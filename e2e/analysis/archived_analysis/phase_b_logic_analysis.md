# Phase B: Edge Case & System Logic Analysis

## 1. Conversational AI Feedback Loop
Based on `VacancyWriterChatPanel.tsx`, the system implements a sophisticated "Agent Chat" handler.
- **Intent Detection**: The AI does not just follow a rigid 4-step wizard; it listens to user chat messages during the Persona and Question phases.
- **Action Trigger**: Sending a chat message like *"Make it more commercial"* triggers the LLM to rework the `candidatePersona` state while staying in the current workflow step.
- **Test Strategy**: The E2E suite can simulate a "loop" by sending a correction command and verifying that the assistant responds before clicking "Continue".

## 2. Public Intake "Soft Validation"
Analysis of `src/app/intake/[formId]/page.tsx` reveals that the public form is designed for minimal friction.
- **Validation Rules**: 
    - Text questions (detailed) have a `minLength` of 0.
    - Number/Short questions have a `minLength` of 1.
- **Warning State**: Clicking "Submit" on an empty form triggers a `showUnansweredWarning`.
- **Bypass Mode**: The specific button `submitAnyway` (`Toch Verzenden`) allows the user to finalize the form with missing data.
- **System Impact**: Studio logic is robust enough to handle "Geen antwoord ontvangen" strings from these empty fields during the AI extraction phase.

## 3. State Persistence & Background Sync
The Studio uses a polling/SSE mechanism to wait for intake completion.
- **Sync Reliability**: The `intakeContext` is populated via `agencyApi.getIntakeContent(workflowId)`.
- **Background Completion**: If a user fills the form while the Studio is closed, the next time the Studio is opened for that vacancy, it will fetch the `ready` status and skip the "Waiting" step.
- **Test Strategy**: Closing and re-opening the browser tab during the intake phase to verify state persistence.
