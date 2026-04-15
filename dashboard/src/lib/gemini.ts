import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY || "");
const modelName = process.env.GEMINI_MODEL || "gemini-3-flash";

export async function triageFailure(testData: {
  name: string;
  file: string;
  errorMessage: string;
  errorStack: string;
  history: string[]; // Last 5 statuses
}) {
  const model = genAI.getGenerativeModel({ model: modelName });

  const prompt = `
    As a senior QA automation engineer, triage this test failure.
    Test Name: ${testData.name}
    File: ${testData.file}
    Error Message: ${testData.errorMessage}
    Stack Trace: ${testData.errorStack}
    Last 5 Run Statuses: ${testData.history.join(", ")}

    Classify the failure as one of: REGRESSION | FLAKE | ENV_ISSUE | AI_DRIFT | SECURITY.
    
    Return the result in JSON format:
    {
      "category": "CATEGORY_NAME",
      "confidence": 0-10,
      "rootCause": "1 sentence explanation",
      "suggestedFix": "1 sentence recommendation"
    }
  `;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    // Extract JSON from markdown code block if present
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    throw new Error("Invalid AI response format");
  } catch (error) {
    console.error("AI Triage Error:", error);
    return {
      category: "UNKNOWN",
      confidence: 0,
      rootCause: "Failed to triage via AI",
      suggestedFix: "Manual review required"
    };
  }
}

export async function generateRunSummary(runResults: any) {
  const model = genAI.getGenerativeModel({ model: modelName });

  const prompt = `
    As a senior QA Lead, generate a summary for this test run.
    Target audience: mixed QA + developers. Avoid jargon.
    
    Run Results:
    ${JSON.stringify(runResults)}

    Return a markdown summary with:
    1. Overall verdict (PASSED/FAILED/MIXED)
    2. Top 3 issues (if any)
    3. Sprint recommendation (what should the team prioritize based on these results)
  `;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error("AI Summary Error:", error);
    return "Failed to generate AI summary.";
  }
}

export function detectDrift(latestScore: any, sevenDayAverage: any) {
  const dimensions = [
    "languageNaturalness",
    "roleConsistency",
    "toneAndBranding",
    "sectionCompleteness",
    "hallucinationScore",
    "marketAlignment"
  ];

  const affectedDimensions: string[] = [];
  let driftDetected = false;

  dimensions.forEach((dim) => {
    if (sevenDayAverage[dim] - latestScore[dim] > 0.5) {
      affectedDimensions.push(dim);
      driftDetected = true;
    }
  });

  return {
    driftDetected,
    affectedDimensions,
    severity: affectedDimensions.length > 2 ? "HIGH" : "MEDIUM",
    recommendation: driftDetected 
      ? `Investigate recent changes in LLM prompt or model version affecting: ${affectedDimensions.join(", ")}.`
      : "No significant drift detected."
  };
}
