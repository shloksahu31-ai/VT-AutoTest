# E2E Golden Baseline: Process Automation Analyst (English v1.0)
*Recorded on: 2026-04-01*

## 1. Baseline Scenario
- **Job Title**: Process Automation Analyst
- **Location**: The Hague
- **Owner**: shlok
- **Language**: English (System Language)
- **Flow**: Full Intake (Manual Entry) -> Writer Pipeline -> Advisor Strategy

## 2. Step-by-Step Recording Details (English Interface)

### Phase A: Setup & Creation
1. **Login**: 
   - Selectors: `#email`, `#password`, `text="Inloggen"`
2. **Language Switch**: 
   - Click Top Header Language Selector (`NL` -> `EN`)
3. **Dashboard**: 
   - Click `text="Create New Vacancy"`
4. **Creation Modal**: 
   - Inputs: `#company`, `#jobTitle`, `#location`, `#vacancyType`
   - Selection: Vacancy Type -> "Regular"
   - Action: `text="Create Vacancy"`

### Phase B: Intake (English Strategy)
1. **Selection**: Click `text="Generate intake questions"` (Option B)
2. **Utility**: Use the Manual Entry dropdown (`[role="combobox"]`) and select **"Form"**.
3. **Identity**: Enter "shlok" in the name field.
4. **Trigger**: Click `text="Open Form"` (Opens in new tab).

### Phase C: Form Submission (Tab 2)
1. **Interaction**: Answer interview questions in English.
2. **Action**: Click `text="Submit Form"`.
3. **Verification**: Confirm success message appeared.

### Phase D: Generation Pipeline (Tab 1)
1. **Sync**: Click `text="View answers & continue"`.
2. **Review**: Click `text="Use answers & continue"`.
3. **Completion**: Click `text="Mark as Complete"`.
4. **Writer Pipeline**: 
   - Click `text="Generate Candidate Persona"`
   - Click `text="Continue to Questions"`
   - Click `text="Generate Full Vacancy"`
   - Click `text="Determine Recruitment Strategy"`

### Phase E: Advisor Verification (English Tabs)
1. **Strategy**: Confirm English terminology in mappings.
2. **Final Check**: Verify Tabs: `Salary & Market`, `Target DNA`, `Competition & SEO`, `Channels`, `Budget & Time`.

---
> [!IMPORTANT]
> This is a protected standard for the English version. Do not modify or delete.
