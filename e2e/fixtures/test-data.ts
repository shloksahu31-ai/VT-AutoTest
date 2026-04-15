/**
 * Test data for E2E intake flow tests.
 * Contains standardized job descriptions and expected extraction results.
 */

export interface JobDescriptionTestCase {
  id: string;
  name: string;
  language: 'nl' | 'en';
  description: string;
  /** Fields we expect the AI to extract */
  expectedExtractions: {
    jobTitle?: string | RegExp;
    location?: string | RegExp;
    salary?: string | RegExp;
    skills?: string[];
    contractType?: string | RegExp;
  };
  /** Follow-up answers for the conversation flow */
  followUpAnswers?: string[];
}

export const JOB_DESCRIPTIONS: JobDescriptionTestCase[] = [
  {
    id: 'senior-swe-amsterdam',
    name: 'Senior Software Engineer (EN)',
    language: 'en',
    description:
      'We need a Senior Software Engineer for our Amsterdam office. ' +
      'The role requires React and Node.js expertise with at least 5 years of experience. ' +
      'Salary range is €70,000-€90,000 per year. Full-time position, hybrid working model. ' +
      'The team consists of 8 developers working on our SaaS platform.',
    expectedExtractions: {
      jobTitle: /senior.*software.*engineer/i,
      location: /amsterdam/i,
      salary: /70.*90/,
      skills: ['React', 'Node.js'],
      contractType: /full.?time/i,
    },
    followUpAnswers: [
      'The team is led by a CTO who believes in servant leadership. We have a flat hierarchy.',
      'We offer 25 vacation days, pension contribution, and a learning budget of €2000 per year.',
      'The ideal candidate is someone who takes ownership and mentors junior developers.',
    ],
  },
  {
    id: 'verpleegkundige-rotterdam',
    name: 'Verpleegkundige Rotterdam (NL)',
    language: 'nl',
    description:
      'Wij zoeken een ervaren verpleegkundige voor ons ziekenhuis in Rotterdam. ' +
      'BIG-registratie is vereist. Salaris conform CAO, schaal 50-55. ' +
      'Fulltime of parttime mogelijk (minimaal 24 uur per week). ' +
      'Je komt te werken op de afdeling cardiologie met een team van 12 verpleegkundigen.',
    expectedExtractions: {
      jobTitle: /verpleegkundige/i,
      location: /rotterdam/i,
      salary: /cao|50.*55/i,
      skills: ['BIG-registratie'],
    },
    followUpAnswers: [
      'Het team wordt aangestuurd door een afdelingshoofd met 15 jaar ervaring.',
      'Wij bieden ook onregelmatigheidstoeslag, reiskostenvergoeding en opleidingsmogelijkheden.',
      'De ideale kandidaat is empathisch, stressbestendig en heeft ervaring met cardiologische patiënten.',
    ],
  },
  {
    id: 'marketing-manager-utrecht',
    name: 'Marketing Manager Utrecht (NL)',
    language: 'nl',
    description:
      'Voor ons kantoor in Utrecht zoeken wij een Marketing Manager. ' +
      'Je bent verantwoordelijk voor online en offline marketingcampagnes. ' +
      'Ervaring met Google Ads, social media advertising en contentmarketing is een must. ' +
      'Salaris: €55.000 - €70.000. Fulltime, mogelijkheid tot 2 dagen thuiswerken.',
    expectedExtractions: {
      jobTitle: /marketing.*manager/i,
      location: /utrecht/i,
      salary: /55.*70/,
      skills: ['Google Ads'],
    },
    followUpAnswers: [
      'Het marketingteam bestaat uit 5 mensen en je rapporteert aan de CMO.',
      'We bieden een auto van de zaak of mobiliteitsbudget en een bonusregeling.',
    ],
  },
  {
    id: 'data-engineer-remote',
    name: 'Data Engineer Remote (EN)',
    language: 'en',
    description:
      'Looking for a Data Engineer to join our fully remote team. ' +
      'Must have strong experience with Python, SQL, Apache Spark, and cloud platforms (AWS or GCP). ' +
      'Salary: €80,000-€100,000 depending on experience. ' +
      'We are a scale-up in the fintech space with 50 employees.',
    expectedExtractions: {
      jobTitle: /data.*engineer/i,
      location: /remote/i,
      salary: /80.*100/,
      skills: ['Python', 'SQL', 'Spark'],
    },
    followUpAnswers: [
      'The data team has 6 engineers and is led by a Head of Data with a PhD in ML.',
      'We offer equity options, unlimited PTO, and annual company retreats.',
    ],
  },
  {
    id: 'project-manager-den-haag',
    name: 'Project Manager Den Haag (NL)',
    language: 'nl',
    description:
      'De Rijksoverheid zoekt een Project Manager voor een digitaliseringsproject in Den Haag. ' +
      'Prince2 of PMP certificering is vereist, evenals ervaring met Agile/Scrum. ' +
      'Schaal 12 (€4.500 - €6.200 per maand). Fulltime, 36 uur per week. ' +
      'Je leidt een multidisciplinair team van 15 mensen.',
    expectedExtractions: {
      jobTitle: /project.*manager/i,
      location: /den haag|'s-gravenhage/i,
      salary: /4.*500.*6.*200|schaal.*12/i,
      skills: ['Prince2', 'Agile'],
    },
    followUpAnswers: [
      'Het project heeft een looptijd van 2 jaar en een budget van €5 miljoen.',
      'ABP-pensioen, 8% vakantiegeld en een IKB van 16,37% van het salaris.',
    ],
  },
];

/**
 * Quick smoke-test job description — short and simple for fast validation.
 */
export const SMOKE_JOB_DESCRIPTION =
  'We zoeken een developer voor Amsterdam, fulltime, €60k-€80k, React ervaring vereist.';

/**
 * Minimum expected fields in the structured intake output.
 */
export const REQUIRED_INTAKE_FIELDS = [
  'persona',
  'job',
  'requirements',
  'hygiene',
] as const;

/**
 * Intake steps in order — used to verify flow progression.
 */
export const INTAKE_STEP_ORDER = [
  'START',
  'ANALYSIS',
  'ROUTE_SELECTION',
  'SUMMARY',
  'INTERVIEW',
  'WAITING_ANSWERS',
  'REVIEW_ANSWERS',
  'REVIEW',
  'COMPLETE',
] as const;
