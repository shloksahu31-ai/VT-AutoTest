# Platform Interaction Map: Vacature Tovenaar

This document maps all points of interaction within the Vacature Tovenaar platform to ensure 100% test coverage.

## 1. Global Navigation & Authentication

### Top-Bar
| Element | Logic/Action | Note |
| :--- | :--- | :--- |
| **Logo (Vacature Tovenaar)** | Navigation to `/` | Returns user to the main dashboard. |
| **Tenant Admin** | Navigation to `/admin/companies` | Access to company management, brand config, and defaults. |
| **Security** | Navigation to `/settings` | Password management and 2FA settings. |
| **Notification Bell** | State Toggle (Popover) | Shows system alerts and connection status. |
| **Language Switcher (EN/NL)** | State Toggle (Global) | Switches platform-wide language. |
| **User Profile** | Display Only | Shows `Initials`, `Name`, and `Environment`. |
| **Log Out** | Action (Session Clear) | Redirects to `/login`. |

### Sidebar
| Element | Logic/Action | Note |
| :--- | :--- | :--- |
| **Refresh Tree** | Action (Sync) | Reloads company hierarchy data. |
| **Collapse/Expand** | State Toggle (UI) | Adjusts sidebar width. |
| **Search (Placeholder: "Search...")** | Input (Filter) | Real-time filtering of company tree items. |
| **Company Tree Item** | Navigation | Switches dashboard context to the selected company. |
| **Expand/Collapse Chevron** | State Toggle (Tree) | Shows/hides child organizational units. |

---

## 2. Main Landing Page & Dashboard

### Dashboard Overview
| Element | Logic/Action | Note |
| :--- | :--- | :--- |
| **Company Cards** | Navigation | Starts the vacancy creation flow for the specific client. |
| **'Continue' Button** | Navigation | Resumes the most recent active workflow. |
| **'View workflow dashboard' Icon** | Navigation | Opens the 3-step progress tracker for a specific vacancy. |

### Company-Specific Dashboard
| Element | Logic/Action | Note |
| :--- | :--- | :--- |
| **Create New Vacancy** | Navigation (Modal) | Opens the vacancy creation wizard. |
| **Search (by title, location, status)** | Input (Filter) | Filters the local vacancy list. |
| **Intakes Tab** | State Toggle | Shows active intake sessions. |
| **Vacancy Drafts Tab** | State Toggle | Shows saved drafts. |
| **Recruitment Intelligence Tab** | State Toggle | Shows completed intelligence reports. |
| **Vacancy List: Position Link** | Navigation | Opens the workflow for that vacancy. |
| **Vacancy List: 'Launch' Button** | Navigation | Primary action to resume/view the process. |
| **Empty State Messages** | Display | "No intakes available", etc. |

### Workflow Dashboard (Progress Tracker)
| Element | Logic/Action | Note |
| :--- | :--- | :--- |
| **Intake Step: 'View'** | Navigation | Opens the completed intake answers/form. |
| **Vacancy Writing Step: 'View'** | Navigation | Opens the generated vacancy text editor. |
| **Recruitment Intelligence Step: 'View'** | Navigation | Opens the 5-tab strategy advisor. |

---

## 3. Vacancy Creation & Intake

### 'Create New Vacancy' Modal
| Element | Logic/Action | Note |
| :--- | :--- | :--- |
| **Company Selector** | Dropdown/Autocomplete | Pre-filled based on dashboard context. |
| **Job Title** | Text Input (`id="jobTitle"`) | Required field. |
| **Location** | Text Input (`id="location"`) | Required field. |
| **Vacancy Type** | Combobox (`id="vacancyType"`) | Options: `Regulier`, `Bulk`, `Schaars`, `Regulier-test`. |
| **Language Buttons** | Toggle (NL / EN) | Sets the language for the vacancy generation. |
| **Existing Info** | Textarea | Optional context for the AI. |
| **'X' (Close Icon)** | Action (Close) | Dismisses modal without saving. |
| **'Annuleren' (Cancel)** | Action (Close) | Dismisses modal without saving. |
| **'Vacature Maken'** | Action (Submit) | Initiates creation and redirects to Intake Assistant. |

### Intake Assistant (Initial State)
| Element | Logic/Action | Note |
| :--- | :--- | :--- |
| **Information Analysis** | Display (Loading) | UI shows "Analyzing information..." while AI prepares questions. |

---

## 4. Intake Strategy & Form Execution

### Intake Assistant (Work Panel)
| Element | Logic/Action | Note |
| :--- | :--- | :--- |
| **Option A: Start Chat** | Action (Chat) | Switches to AI chat mode for direct intake. |
| **Option B: Generate Questions** | Action (Process) | Triggers AI to create a questionnaire. |
| **Strategy Dropdown** | Combobox | Options: `Form`, `Manual Entry`. |
| **Hiring Manager Name** | Text Input | Used for personalization and tracking. |
| **Email Input** | Text Input | Optional: Sends the form link directly. |
| **'Create Form Link'** | Action (Generate) | Generates unique UUID for the session. |
| **'Open Formulier'** | Navigation (New Tab) | Opens the external hiring manager form. |
| **'Skip to Vacancy Writer'** | Navigation | Bypasses intake if info is already sufficient. |

### External Position Intake Form (`/intake/[uuid]`)
| Element | Logic/Action | Note |
| :--- | :--- | :--- |
| **Question Item** | State Toggle (Open) | Clicking a question expands the answer textarea. |
| **Answer Textarea** | Input | For providing specific job details. |
| **Progress Tracker** | Display | "X / Y answered". |
| **'Save Draft'** | Action (Save) | Persists current answers for later. |
| **'Submit Form'** | Action (Process) | Finalizes answers and syncs to studio. |
| **'Edit Questions'** | Link | Returns to the Studio intake assistant (if logged in). |

---

## 5. Generation Pipeline

### Intake Review & Sync
| Element | Logic/Action | Note |
| :--- | :--- | :--- |
| **'View answers' Banner** | Display (Notification) | Appears in studio when form is submitted. |
| **Review Modal** | State Overlay | Shows compare/select view for manager's answers. |
| **Selection Controls** | Action (Toggle) | **'Deselect all'** / **'Select all'**. |
| **Import Answer** | Action (Process) | **'Use answers & continue'**. |
| **Completion Button** | Action (Finalize) | **'Markeer als Voltooid'**. |

### Vacancy Writer (AI Workbench)
| Element | Logic/Action | Note |
| :--- | :--- | :--- |
| **Persona Trigger** | Action (Initial) | **'Genereer Kandidaat Persona'**. |
| **Persona Card** | Display | Shows Background, Goals, Motivations (right panel). |
| **Persona Refine Chat** | Input (AI) | Refines persona targets via natural language. |
| **Questions Trigger** | Action (Iterative) | **'Continue to questions'**. |
| **Questions List** | Display | Review 10 candidate FAQs. |
| **Final Generate** | Action (Terminal) | **'Generate full vacancy'**. |

### Vacancy Review & Refinement
| Element | Logic/Action | Note |
| :--- | :--- | :--- |
| **Document View Modes** | Toggle (Tabs) | **'Full View'**, **'Section View'**, **'Canvas Edit'**. |
| **Workbench Controls** | Action | **'Share'**, **'Copy'**, **'Wervingsstrategie Bepalen'**. |
| **Global Refine Chat** | Input (AI) | Bottom-left chat for manual text adjustments. |

---

## 6. Recruitment Advisor & Strategy

### Recruitment Strategy Dashboard
| Element | Logic/Action | Note |
| :--- | :--- | :--- |
| **Share** | Action (Link) | Copies a unique shareable link to the recruitment plan. |
| **Approve Plan** | Action (Process) | **'Plan Goedkeuren'** button to finalize the strategy advisor. |
| **Advisor Navigation Tabs** | Toggle (Process) | **'Salary & Market'**, **'Target DNA'**, **'Competition & SEO'**, **'Channels'**, **'Budget & Time'**. |

### Strategy Advisor Tabs (Detailed)
| Tab | Key Elements & Interactions |
| :--- | :--- |
| **Salary & Market** | Market Positioning charts, Salary Range displays, Data Source list (with scroll). |
| **Target DNA** | Strategic Rationale text, Mobility Requirements, Target Demographic cards. |
| **Competition & SEO** | SEO Optimized Position Title, Clickable Search Term chips. |
| **Channels** | Recommended Platform list (e.g., Tweakers), Channel rationale, reach/feasibility metrics. |
| **Budget & Time** | Investment Breakdown (Advertising vs Tools), Lead Time estimate, Success Feasibility badge. |

### Recruitment AI Assistant ('Sparringpartner')
| Element | Logic/Action | Note |
| :--- | :--- | :--- |
| **Deep-dive Question Chips** | Action (AI Query) | Pre-defined strategic questions to refine the plan. |
| **Chat Textarea** | Input (Natural Language) | For custom strategy refinement or Plan B/C analysis. |
| **Message History** | Display / Action | Scrollable history with 'Copy message' icons. |

---

## 7. Profile & Administration

### User Settings (`/settings`)
| Element | Logic/Action | Note |
| :--- | :--- | :--- |
| **Change Password** | Form (Submit) | Requires Current, New, and Confirm New password. |
| **2FA Toggle** | State Toggle | Allows enabling/disabling Two-Factor Authentication. |
| **Personal Info** | Display Only | Name and Email are shown in header (not editable on this page). |

### Tenant Admin: Company Management (`/admin/companies`)
| Element | Logic/Action | Note |
| :--- | :--- | :--- |
| **'Add Company'** | Action (Modal) | Opens a blank company configuration modal. |
| **Company List Row** | Display | Shows Name, Industry, and brief description. |
| **Set Default** | Action | Sets the primary company context for the tenant. |
| **Edit** | Action (Modal) | Opens the three-tab configuration modal described below. |
| **Delete** | Action (Destructive) | Removes the company entity from the platform. |

### Company Configuration Modal (Tabs)
| Tab | Key Interaction Points |
| :--- | :--- |
| **Company Info** | Editable fields: Name, Industry, Size, Description, Headquarters, Website, Mission, Vision, Core Values. |
| **Content** | AI Context: Tone of Voice, EVP Claims, Company Positioning. |
| **Language** | AI Output: Language dropdown, Complexity level (A1-C2), Tone, Formality, Perspective, Language Guidelines (Textarea). |
| **Global Actions** | **'Update'** (Save), **'Cancel'**, **'Close (X)'**. |

---

## 8. Micro-Interactions & UX Elements

### Interactivity Polish
| Element | Interaction | Behavior |
| :--- | :--- | :--- |
| **Chat Bubble** | Hover | Reveals **'Copy'** button; No micro-reactions (emojis) or per-message feedback. |
| **Canvas Toolbar** | Click | Formatting triggers: **Bold, Italic, H1-H3, Lists**. |
| **Workbench Progress** | Display | Visual stepper (Info -> Persona -> Questions -> Generate). |
| **AI Rewriting** | Process | Direct inline update in Editor (Canvas Edit); No manual version selector found. |
| **Copy Feedback** | Action State | Button text changes to **'Copied'** (green) briefly; No global toasts. |

### Global Utilities
| Element | Logic/Action | Note |
| :--- | :--- | :--- |
| **Sound Toggle** | Action (Toggle) | Top-right sound icon for AI response feedback. |
| **Feedback Button** | Action (Modal) | Floating button in bottom-right for Tally/General feedback. |

---

## 9. Test Automation Readiness (Audit)

### Interaction Locators (Selectors)
*   **Top Bar**: `button:has-text("Tenant Admin")`, `button:has-text("Security")`, `button:has-text("EN")`.
*   **Vacancy Creation**: `[name="jobTitle"]`, `[name="location"]`, `button:has-text("Vacature Maken")`.
*   **Generation Flow**: `button:has-text("Bekijk antwoorden & ga verder")`, `button:has-text("Genereer Kandidaat Persona")`.
*   **Recruitment Strategy**: `[role="tab"]:has-text("Salary")`, `button:has-text("Plan Goedkeuren")`.

### Known Constraints (E2E)
*   **Async AI Latency**: Strategy and Vacancy generation take 15-30s; require polling/waitForSelector logic.
*   **Tab Coordination**: Intake form generation opens a new tab with a UUID; requires browser context management.
*   **Localized State**: 'Copied' state is transient; verification requires immediate snapshot after click.

*Mapping Complete. Repository is ready for E2E Suite generation.*
