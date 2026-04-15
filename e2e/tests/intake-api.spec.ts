/**
 * Modernized Intake API Spec (UAT)
 * Verifies direct backend SSE streaming, intent classification, and data extraction.
 */

import { test, expect } from '@playwright/test';
import { ApiClient, createAuthenticatedClient } from '../helpers/api-client';
import { JOB_DESCRIPTIONS } from '../fixtures/test-data';

test.describe('Intake API Consistency (UAT)', () => {
  let client: ApiClient;

  test.beforeAll(async () => {
    client = await createAuthenticatedClient();
  });

  test('Initialize an intake session successfully', async () => {
    const session = await client.initIntakeSession('nl');
    expect(session.sessionId).toBeTruthy();
    expect(session.currentStep).toBe('START');
    expect(session.intakeData).toBeDefined();
  });

  test('SSE stream returns valid intent and chat chunks', async () => {
    const session = await client.initIntakeSession('en');
    const testCase = JOB_DESCRIPTIONS[0]; // Senior SWE

    let result;
    try {
      result = await client.chatStream({
        message: testCase.description,
        sessionId: session.sessionId,
        currentStep: 'START',
        intakeData: session.intakeData,
        language: 'en'
      });
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      if (msg.includes('502') || msg.includes('503')) {
        test.skip(true, `UAT Backend Infrastructure Transient Error: ${msg}`);
        return;
      }
      throw error;
    }

    // Verify intent classification (expect GREET_AND_ANALYZE for first msg)
    expect(result.intentAction).toBeTruthy();
    expect(result.chatResponse.length).toBeGreaterThan(0);
    
    // Check for standard SSE event types
    const hasChunks = result.events.some(e => e.type === 'chat_chunk');
    const hasIntent = result.events.some(e => e.type === 'intent');
    expect(hasChunks && hasIntent).toBe(true);
  });

  test('Data extraction updates the session state in SSE response', async () => {
    const session = await client.initIntakeSession('en');
    const testCase = JOB_DESCRIPTIONS[0];

    const result = await client.chatStream({
      message: testCase.description,
      sessionId: session.sessionId,
      currentStep: 'START',
      intakeData: session.intakeData
    });

    // Should receive a data event containing the extracted persona/job fields
    expect(result.dataEvent).toBeDefined();
    const data = result.dataEvent as any;
    expect(data.intakeData).toBeDefined();
    
    // Verify specific extraction - should contain 'Software' or 'Engineer'
    const intakeDataString = JSON.stringify(data.intakeData);
    expect(intakeDataString.toLowerCase()).toMatch(/software|engineer/);
  });

  test('Intent classification responds to follow-up commands', async () => {
    const session = await client.initIntakeSession('nl');
    
    // Send a message that should trigger intent processing
    const result = await client.chatStream({
      message: 'Ik wil een vacature schrijven voor een Account Manager.',
      sessionId: session.sessionId,
      currentStep: 'START'
    });

    expect(result.intentAction).toBeDefined();
    expect(result.chatResponse.length).toBeGreaterThan(10);
  });
});
