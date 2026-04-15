/**
 * Intake Quality E2E Tests (AI QUALITY)
 *
 * Uses LLM-as-judge (Gemini Flash) to evaluate the quality of
 * AI intake responses. Scores are compared against baselines.
 *
 * Tests multiple job descriptions and scores:
 *  - Response relevance
 *  - Data extraction accuracy
 *  - Conversation helpfulness
 *  - Dutch language quality (for NL inputs)
 *
 * NOTE: These tests depend on the chat service being available on staging.
 * If the chat service is down, tests will be skipped gracefully.
 */

import { test, expect } from '@playwright/test';
import { ApiClient, createAuthenticatedClient } from '../helpers/api-client';
import { initSessionOrSkip } from '../helpers/session';
import { QualityScorer, type QualityEvaluation } from '../helpers/quality-scorer';
import { JOB_DESCRIPTIONS } from '../fixtures/test-data';

// Increase timeout for quality tests — they involve two AI calls each
test.setTimeout(180_000);

test.describe('Intake Quality', () => {
  let client: ApiClient;
  let scorer: QualityScorer;
  const evaluations: QualityEvaluation[] = [];

  test.beforeAll(async () => {
    client = await createAuthenticatedClient();
    scorer = new QualityScorer();
  });

  // Generate one test per job description
  for (const testCase of JOB_DESCRIPTIONS) {
    test(`Quality check: ${testCase.name}`, async () => {
      // Step 1: Initialize session and send job description
      const session = await initSessionOrSkip(client, testCase.language);
      if (!session) return;

      let result;
      try {
        result = await client.chatStream({
          message: testCase.description,
          sessionId: session.sessionId,
          currentStep: 'START',
          intakeData: session.intakeData,
          gaps: session.gaps,
          assumptions: session.assumptions,
          viabilityScore: session.viabilityScore,
          language: testCase.language,
          conversationHistory: [],
        });
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        if (msg.includes('502') || msg.includes('503') || msg.includes('STREAM_INIT_ERROR')) {
          test.skip(true, `Chat service unavailable on staging: ${msg}`);
          return;
        }
        throw error;
      }

      // Check for SSE error events
      const errorEvents = result.events.filter(e => e.type === 'error');
      if (errorEvents.length > 0 && result.chatResponse.length === 0) {
        test.skip(true, `Chat service returned error: ${JSON.stringify(errorEvents[0])}`);
        return;
      }

      expect(result.chatResponse.length).toBeGreaterThan(0);

      // Step 2: Extract data for evaluation
      const dataEvent = result.dataEvent as Record<string, unknown> | null;
      const extractedData = dataEvent?.intakeData ?? null;

      // Step 3: Score with LLM-as-judge
      const evaluation = await scorer.evaluate({
        testCaseId: testCase.id,
        testCaseName: testCase.name,
        language: testCase.language,
        jobDescription: testCase.description,
        aiResponse: result.chatResponse,
        extractedData: extractedData ?? undefined,
        expectedExtractions: testCase.expectedExtractions,
      });

      evaluations.push(evaluation);

      // Step 4: Log scores for visibility
      console.log(`\n📊 Quality Scores for "${testCase.name}":`);
      console.log(`   Response Relevance:       ${evaluation.scores.responseRelevance}/10`);
      console.log(`   Data Extraction Accuracy: ${evaluation.scores.dataExtractionAccuracy}/10`);
      console.log(`   Conversation Helpfulness: ${evaluation.scores.conversationHelpfulness}/10`);
      if (testCase.language === 'nl') {
        console.log(`   Dutch Language Quality:   ${evaluation.scores.dutchLanguageQuality}/10`);
      }
      console.log(`   Overall Average:          ${evaluation.scores.overallAverage}/10`);
      console.log(`   Passes Baseline:          ${evaluation.passesBaseline ? '✅' : '❌'}`);

      // Step 5: Assert quality passes baseline
      const baselines = scorer.getBaselines();

      expect(
        evaluation.scores.responseRelevance,
        `Response relevance (${evaluation.scores.responseRelevance}) below threshold (${baselines.thresholds.responseRelevance})`
      ).toBeGreaterThanOrEqual(baselines.thresholds.responseRelevance);

      expect(
        evaluation.scores.dataExtractionAccuracy,
        `Data extraction accuracy (${evaluation.scores.dataExtractionAccuracy}) below threshold (${baselines.thresholds.dataExtractionAccuracy})`
      ).toBeGreaterThanOrEqual(baselines.thresholds.dataExtractionAccuracy);

      expect(
        evaluation.scores.conversationHelpfulness,
        `Conversation helpfulness (${evaluation.scores.conversationHelpfulness}) below threshold (${baselines.thresholds.conversationHelpfulness})`
      ).toBeGreaterThanOrEqual(baselines.thresholds.conversationHelpfulness);

      if (testCase.language === 'nl') {
        expect(
          evaluation.scores.dutchLanguageQuality,
          `Dutch language quality (${evaluation.scores.dutchLanguageQuality}) below threshold (${baselines.thresholds.dutchLanguageQuality})`
        ).toBeGreaterThanOrEqual(baselines.thresholds.dutchLanguageQuality);
      }

      expect(
        evaluation.scores.overallAverage,
        `Overall average (${evaluation.scores.overallAverage}) below threshold (${baselines.thresholds.overallMinimum})`
      ).toBeGreaterThanOrEqual(baselines.thresholds.overallMinimum);
    });
  }

  test('Summary: all quality evaluations pass', async () => {
    // This test runs after all individual quality tests
    // and provides a summary
    if (evaluations.length === 0) {
      test.skip(true, 'No evaluations were collected (chat service may be unavailable)');
      return;
    }

    console.log('\n' + '='.repeat(60));
    console.log('📋 QUALITY EVALUATION SUMMARY');
    console.log('='.repeat(60));

    let allPassed = true;
    for (const evaluation of evaluations) {
      const status = evaluation.passesBaseline ? '✅' : '❌';
      console.log(`${status} ${evaluation.testCaseName}: avg=${evaluation.scores.overallAverage}/10`);
      if (!evaluation.passesBaseline) allPassed = false;
    }

    // Calculate aggregate scores
    const avgScores = {
      responseRelevance: avg(evaluations.map(e => e.scores.responseRelevance)),
      dataExtractionAccuracy: avg(evaluations.map(e => e.scores.dataExtractionAccuracy)),
      conversationHelpfulness: avg(evaluations.map(e => e.scores.conversationHelpfulness)),
      overall: avg(evaluations.map(e => e.scores.overallAverage)),
    };

    console.log('\nAggregate Scores:');
    console.log(`   Avg Response Relevance:       ${avgScores.responseRelevance}`);
    console.log(`   Avg Data Extraction Accuracy: ${avgScores.dataExtractionAccuracy}`);
    console.log(`   Avg Conversation Helpfulness: ${avgScores.conversationHelpfulness}`);
    console.log(`   Avg Overall:                  ${avgScores.overall}`);
    console.log('='.repeat(60));

    expect(allPassed, 'One or more quality evaluations failed baseline thresholds').toBe(true);
  });
});

function avg(values: number[]): number {
  if (values.length === 0) return 0;
  return Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10) / 10;
}
