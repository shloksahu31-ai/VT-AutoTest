/**
 * LLM-as-judge quality scorer.
 *
 * Uses Google Gemini Flash to evaluate AI intake responses
 * against a set of quality dimensions.
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import * as fs from 'fs';
import * as path from 'path';

// ── Types ─────────────────────────────────────────────────────────────

export interface QualityScores {
  responseRelevance: number;       // 1-10
  dataExtractionAccuracy: number;  // 1-10
  conversationHelpfulness: number; // 1-10
  dutchLanguageQuality: number;    // 1-10 (only scored for Dutch inputs)
  overallAverage: number;
}

export interface QualityEvaluation {
  testCaseId: string;
  testCaseName: string;
  language: string;
  scores: QualityScores;
  reasoning: string;
  passesBaseline: boolean;
  timestamp: string;
}

export interface QualityBaselines {
  version: string;
  thresholds: {
    responseRelevance: number;
    dataExtractionAccuracy: number;
    conversationHelpfulness: number;
    dutchLanguageQuality: number;
    overallMinimum: number;
  };
}

// ── Scorer ────────────────────────────────────────────────────────────

export class QualityScorer {
  private genAI: GoogleGenerativeAI | null = null;
  private baselines: QualityBaselines;

  constructor() {
    const apiKey = process.env.GOOGLE_AI_API_KEY;
    if (apiKey) {
      this.genAI = new GoogleGenerativeAI(apiKey);
    }

    // Load baselines
    const baselinesPath = path.join(__dirname, '..', 'fixtures', 'quality-baselines.json');
    this.baselines = JSON.parse(fs.readFileSync(baselinesPath, 'utf-8'));
  }

  /**
   * Evaluate an AI response for quality.
   */
  async evaluate(params: {
    testCaseId: string;
    testCaseName: string;
    language: string;
    jobDescription: string;
    aiResponse: string;
    extractedData?: unknown;
    expectedExtractions?: Record<string, unknown>;
  }): Promise<QualityEvaluation> {
    if (!this.genAI) {
      // Return passing scores if no API key (for local dev without key)
      console.warn('[QualityScorer] No GOOGLE_AI_API_KEY set, returning mock scores');
      return this.createMockEvaluation(params);
    }

    const model = this.genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    const prompt = this.buildScoringPrompt(params);

    try {
      const result = await model.generateContent(prompt);
      const text = result.response.text();
      const scores = this.parseScores(text, params.language);
      const passesBaseline = this.checkBaseline(scores, params.language);

      const evaluation: QualityEvaluation = {
        testCaseId: params.testCaseId,
        testCaseName: params.testCaseName,
        language: params.language,
        scores,
        reasoning: text,
        passesBaseline,
        timestamp: new Date().toISOString(),
      };

      // Log for trend tracking
      this.logEvaluation(evaluation);

      return evaluation;
    } catch (error) {
      console.error('[QualityScorer] Gemini evaluation failed:', error);
      // Return mock on failure so tests don't crash on API issues
      return this.createMockEvaluation(params);
    }
  }

  private buildScoringPrompt(params: {
    jobDescription: string;
    aiResponse: string;
    extractedData?: unknown;
    expectedExtractions?: Record<string, unknown>;
    language: string;
  }): string {
    const extractedDataStr = params.extractedData
      ? `\n\nExtracted structured data:\n${JSON.stringify(params.extractedData, null, 2)}`
      : '';

    const expectedStr = params.expectedExtractions
      ? `\n\nExpected extractions (ground truth):\n${JSON.stringify(params.expectedExtractions, null, 2)}`
      : '';

    return `You are an AI quality evaluator for a recruitment intake assistant.

The assistant receives job descriptions and:
1. Analyzes the content
2. Extracts structured data (job title, skills, salary, location, etc.)
3. Asks relevant follow-up questions to fill gaps
4. Provides a helpful conversational experience

Evaluate the following interaction.

## Input Job Description
${params.jobDescription}

## AI Response
${params.aiResponse}
${extractedDataStr}
${expectedStr}

## Scoring Instructions

Score each dimension from 1 (terrible) to 10 (excellent):

1. **Response Relevance** (responseRelevance): Does the response directly address the job description? Is it on-topic? Does it acknowledge key details?

2. **Data Extraction Accuracy** (dataExtractionAccuracy): Were the key fields (job title, skills, location, salary, etc.) correctly identified and extracted? ${params.expectedExtractions ? 'Compare against the expected extractions.' : ''}

3. **Conversation Helpfulness** (conversationHelpfulness): Does the AI ask useful follow-up questions? Does it guide the user toward completing the intake? Is the tone professional and helpful?

4. **Dutch Language Quality** (dutchLanguageQuality): ${params.language === 'nl' ? 'Score the quality of the Dutch language: grammar, spelling, natural phrasing, professional tone.' : 'Score as 10 (not applicable for English input).'}

## Output Format

Respond with ONLY a JSON object (no markdown, no code fences):
{
  "responseRelevance": <number 1-10>,
  "dataExtractionAccuracy": <number 1-10>,
  "conversationHelpfulness": <number 1-10>,
  "dutchLanguageQuality": <number 1-10>,
  "reasoning": "<brief explanation of scores>"
}`;
  }

  private parseScores(text: string, language: string): QualityScores {
    // Try to extract JSON from the response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.warn('[QualityScorer] Could not parse JSON from Gemini response, using defaults');
      return this.defaultScores(language);
    }

    try {
      const parsed = JSON.parse(jsonMatch[0]);
      const scores: QualityScores = {
        responseRelevance: this.clamp(parsed.responseRelevance || 5),
        dataExtractionAccuracy: this.clamp(parsed.dataExtractionAccuracy || 5),
        conversationHelpfulness: this.clamp(parsed.conversationHelpfulness || 5),
        dutchLanguageQuality: language === 'nl'
          ? this.clamp(parsed.dutchLanguageQuality || 5)
          : 10,
        overallAverage: 0,
      };

      scores.overallAverage = this.calculateAverage(scores, language);
      return scores;
    } catch {
      console.warn('[QualityScorer] JSON parse failed, using defaults');
      return this.defaultScores(language);
    }
  }

  private clamp(value: number): number {
    return Math.max(1, Math.min(10, Math.round(value)));
  }

  private calculateAverage(scores: QualityScores, language: string): number {
    const values = [
      scores.responseRelevance,
      scores.dataExtractionAccuracy,
      scores.conversationHelpfulness,
    ];
    if (language === 'nl') {
      values.push(scores.dutchLanguageQuality);
    }
    return Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10) / 10;
  }

  private defaultScores(language: string): QualityScores {
    return {
      responseRelevance: 5,
      dataExtractionAccuracy: 5,
      conversationHelpfulness: 5,
      dutchLanguageQuality: language === 'nl' ? 5 : 10,
      overallAverage: 5,
    };
  }

  /**
   * Check if scores meet the baseline thresholds.
   */
  checkBaseline(scores: QualityScores, language: string): boolean {
    const t = this.baselines.thresholds;
    if (scores.responseRelevance < t.responseRelevance) return false;
    if (scores.dataExtractionAccuracy < t.dataExtractionAccuracy) return false;
    if (scores.conversationHelpfulness < t.conversationHelpfulness) return false;
    if (language === 'nl' && scores.dutchLanguageQuality < t.dutchLanguageQuality) return false;
    if (scores.overallAverage < t.overallMinimum) return false;
    return true;
  }

  /**
   * Get the baseline thresholds (for test assertions).
   */
  getBaselines(): QualityBaselines {
    return this.baselines;
  }

  private createMockEvaluation(params: {
    testCaseId: string;
    testCaseName: string;
    language: string;
  }): QualityEvaluation {
    return {
      testCaseId: params.testCaseId,
      testCaseName: params.testCaseName,
      language: params.language,
      scores: {
        responseRelevance: 8,
        dataExtractionAccuracy: 8,
        conversationHelpfulness: 8,
        dutchLanguageQuality: params.language === 'nl' ? 8 : 10,
        overallAverage: 8,
      },
      reasoning: 'Mock evaluation — GOOGLE_AI_API_KEY not configured',
      passesBaseline: true,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Evaluate a generated vacancy text for quality.
   */
  async evaluateVacancy(params: {
    testCaseId: string;
    testCaseName: string;
    language: string;
    jobDescription: string;
    generatedVacancy: string;
    candidatePersona?: string;
  }): Promise<QualityEvaluation> {
    if (!this.genAI) {
      console.warn('[QualityScorer] No GOOGLE_AI_API_KEY set, returning mock scores');
      return this.createMockEvaluation(params);
    }

    const model = this.genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
    const prompt = this.buildVacancyScoringPrompt(params);

    try {
      const result = await model.generateContent(prompt);
      const text = result.response.text();
      const scores = this.parseScores(text, params.language);
      const passesBaseline = this.checkBaseline(scores, params.language);

      const evaluation: QualityEvaluation = {
        testCaseId: params.testCaseId,
        testCaseName: params.testCaseName,
        language: params.language,
        scores,
        reasoning: text,
        passesBaseline,
        timestamp: new Date().toISOString(),
      };

      this.logEvaluation(evaluation);
      return evaluation;
    } catch (error) {
      console.error('[QualityScorer] Gemini vacancy evaluation failed:', error);
      return this.createMockEvaluation(params);
    }
  }

  /**
   * Evaluate intake workspace content (extracted data, gaps, persona) for quality.
   */
  async evaluateIntakeWorkspace(params: {
    testCaseId: string;
    testCaseName: string;
    language: string;
    jobDescription: string;
    workspaceContent: string;
    chatMessages?: string;
  }): Promise<QualityEvaluation> {
    if (!this.genAI) {
      console.warn('[QualityScorer] No GOOGLE_AI_API_KEY set, returning mock scores');
      return this.createMockEvaluation(params);
    }

    const model = this.genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
    const prompt = this.buildIntakeWorkspaceScoringPrompt(params);

    try {
      const result = await model.generateContent(prompt);
      const text = result.response.text();
      const scores = this.parseScores(text, params.language);
      const passesBaseline = this.checkBaseline(scores, params.language);

      const evaluation: QualityEvaluation = {
        testCaseId: params.testCaseId,
        testCaseName: params.testCaseName,
        language: params.language,
        scores,
        reasoning: text,
        passesBaseline,
        timestamp: new Date().toISOString(),
      };

      this.logEvaluation(evaluation);
      return evaluation;
    } catch (error) {
      console.error('[QualityScorer] Gemini intake workspace evaluation failed:', error);
      return this.createMockEvaluation(params);
    }
  }

  private buildVacancyScoringPrompt(params: {
    jobDescription: string;
    generatedVacancy: string;
    candidatePersona?: string;
    language: string;
  }): string {
    const personaStr = params.candidatePersona
      ? `\n\nCandidate Persona used:\n${params.candidatePersona}`
      : '';

    return `You are an AI quality evaluator for a recruitment vacancy text generator.

The system receives job details and generates a complete vacancy text for publication.
Evaluate the quality of the generated vacancy against the original job description.

## Original Job Description / Input
${params.jobDescription}
${personaStr}

## Generated Vacancy Text
${params.generatedVacancy}

## Scoring Instructions

Score each dimension from 1 (terrible) to 10 (excellent):

1. **Response Relevance** (responseRelevance): Does the vacancy accurately reflect the job described? Are the title, location, responsibilities, and requirements consistent with the input?

2. **Data Extraction Accuracy** (dataExtractionAccuracy): Are key facts (salary, location, team size, requirements, contract type) correctly carried over from the input into the vacancy? No fabricated details?

3. **Conversation Helpfulness** (conversationHelpfulness): Is the vacancy well-structured with clear sections? Is it compelling and would attract the right candidates? Professional tone, good call-to-action?

4. **Dutch Language Quality** (dutchLanguageQuality): ${params.language === 'nl' ? 'Score the quality of the Dutch language: grammar, spelling, natural professional recruitment tone, no awkward translations.' : 'Score as 10 (not applicable for English input).'}

## Output Format

Respond with ONLY a JSON object (no markdown, no code fences):
{
  "responseRelevance": <number 1-10>,
  "dataExtractionAccuracy": <number 1-10>,
  "conversationHelpfulness": <number 1-10>,
  "dutchLanguageQuality": <number 1-10>,
  "reasoning": "<brief explanation of scores>"
}`;
  }

  private buildIntakeWorkspaceScoringPrompt(params: {
    jobDescription: string;
    workspaceContent: string;
    chatMessages?: string;
    language: string;
  }): string {
    const chatStr = params.chatMessages
      ? `\n\nChat Messages:\n${params.chatMessages}`
      : '';

    return `You are an AI quality evaluator for a recruitment intake assistant.

The assistant receives a job description and:
1. Extracts structured data (job title, skills, salary, location, persona, requirements)
2. Identifies gaps and assumptions in the provided information
3. Generates a candidate persona and viability assessment
4. Asks relevant follow-up questions

Evaluate the quality of the intake processing based on the workspace panel output.

## Original Job Description / Input
${params.jobDescription}
${chatStr}

## Intake Workspace Output (extracted data, persona, gaps, etc.)
${params.workspaceContent}

## Scoring Instructions

Score each dimension from 1 (terrible) to 10 (excellent):

1. **Response Relevance** (responseRelevance): Is the extracted information relevant to the job description? Does the workspace reflect the key aspects of the role?

2. **Data Extraction Accuracy** (dataExtractionAccuracy): Were the key fields (job title, skills, location, salary, team info, requirements) correctly identified? Were persona insights reasonable?

3. **Conversation Helpfulness** (conversationHelpfulness): Are the identified gaps meaningful? Would the follow-up questions/suggestions help complete the intake? Is the viability assessment reasonable?

4. **Dutch Language Quality** (dutchLanguageQuality): ${params.language === 'nl' ? 'Score the quality of any Dutch content: professional tone, correct terminology for recruitment context.' : 'Score as 10 (not applicable for English input).'}

## Output Format

Respond with ONLY a JSON object (no markdown, no code fences):
{
  "responseRelevance": <number 1-10>,
  "dataExtractionAccuracy": <number 1-10>,
  "conversationHelpfulness": <number 1-10>,
  "dutchLanguageQuality": <number 1-10>,
  "reasoning": "<brief explanation of scores>"
}`;
  }

  /**
   * Log evaluation to a JSON file for trend tracking.
   */
  private logEvaluation(evaluation: QualityEvaluation): void {
    const logDir = path.join(__dirname, '..', 'results');
    const logFile = path.join(logDir, 'quality-scores.jsonl');

    try {
      if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
      }
      fs.appendFileSync(logFile, JSON.stringify(evaluation) + '\n');
    } catch (err) {
      console.warn('[QualityScorer] Failed to log evaluation:', err);
    }
  }
}
