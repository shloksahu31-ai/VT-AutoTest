# E2E Golden Baseline: Process Automation Analyst (v1.0)
*Recorded on: 2026-04-01*

## 1. Baseline Scenario
- **Job Title**: Process Automation Analyst
- **Location**: The Hague
- **Owner**: shlok
- **Flow**: Full Intake (Manual Entry) -> Writer Pipeline -> Advisor Strategy

## 2. Step-by-Step Recording Details

### Phase A: Setup & Creation
1. **Login**: 
   - Selectors: `#email`, `#password`, `text="Inloggen"`
2. **Dashboard**: 
   - Click `text="Nieuwe Vacature Maken"`
3. **Creation Modal**: 
   - Inputs: `#company`, `#jobTitle`, `#location`, `#vacancyType`
   - Action: `text="Vacature Maken"`

### Phase B: Intake (The "Manual Form" Strategy)
1. **Selection**: Click `text="Genereer intake vragen"` (Option B)
2. **Utility**: Use the Manual Entry dropdown (`[role="combobox"]`) and select **"Formulier"**.
3. **Identity**: Enter "shlok" in `input[placeholder="Naam Hiring Manager"]`.
4. **Trigger**: Click `text="Open Formulier"` (Opens in new tab).

### Phase C: Form Submission (Tab 2)
1. **Interaction**: Answer all generated interview questions.
2. **Action**: Click `text="Formulier Verzenden"`.
3. **Verification**: Confirm "Bedankt" message appeared.

### Phase D: Generation Pipeline (Tab 1)
1. **Sync**: Click `text="Bekijk antwoorden & ga verder"`.
2. **Review**: Click `text="Gebruik antwoorden & ga verder"`.
3. **Completion**: Click `text="Markeer als Voltooid"`.
4. **Writer**: 
   - Click `text="Genereer Kandidaat Persona"`
   - Click `text="Doorgaan naar vragen"`
   - Click `text="Volledige vacature genereren"`
   - Click `text="Wervingsstrategie Bepalen"`

### Phase E: Advisor Verification
1. **Strategy**: Confirm mappings are correct.
2. **Final Check**: Verify all 5 tabs (Salary, Persona, Channels, Budget, Goal/DNA).

---
> [!IMPORTANT]
> This is a protected standard. Do not modify or delete.
