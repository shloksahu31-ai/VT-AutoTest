import { Page, expect } from '@playwright/test';

/**
 * UAT Stabilization Helpers
 * 
 * Joyride Neutralization Strategy:
 * 
 * 1. addInitScript: Injects CSS before any page JS runs. This covers the
 *    initial page load but can be wiped by Next.js client-side navigation.
 * 
 * 2. addStyleTag: Injects CSS into the current page context. We call this
 *    AFTER login/navigation to handle the Next.js re-render.
 * 
 * The CSS makes Joyride elements invisible and non-interactive. This is
 * a one-shot, zero-polling approach.
 */

const KILL_TOURS_CSS = `
  #react-joyride-portal,
  #react-joyride-portal *,
  .react-joyride__overlay,
  .react-joyride__spotlight,
  .react-joyride__beacon,
  .react-joyride__tooltip,
  .shepherd-element,
  .shepherd-modal-overlay-container {
    display: none !important;
    visibility: hidden !important;
    pointer-events: none !important;
    opacity: 0 !important;
    z-index: -1 !important;
    width: 0 !important;
    height: 0 !important;
    overflow: hidden !important;
    position: fixed !important;
    top: -9999px !important;
    left: -9999px !important;
  }
  #react-joyride-portal svg,
  #react-joyride-portal path {
    pointer-events: none !important;
    fill: transparent !important;
  }
`;

/**
 * Call this BEFORE any navigation (page.goto / performLogin).
 * Registers addInitScript so the CSS is ready for the first page load.
 */
export async function injectStabilization(page: Page) {
  await page.addInitScript((css: string) => {
    if (typeof window === 'undefined') return;
    const inject = () => {
      if (!document.head || document.getElementById('e2e-kill-tours')) return;
      const style = document.createElement('style');
      style.id = 'e2e-kill-tours';
      style.textContent = css;
      document.head.appendChild(style);
    };
    if (document.head) inject();
    else document.addEventListener('DOMContentLoaded', inject, { once: true });
  }, KILL_TOURS_CSS);
}

/**
 * Call this AFTER login / any page navigation to re-inject the CSS
 * in case Next.js client-side navigation wiped it.
 */
export async function reinforceStabilization(page: Page) {
  await page.addStyleTag({ content: KILL_TOURS_CSS });
}

/**
 * Handle AI pipeline modals (e.g. "Toch doorgaan" / "Continue anyway")
 */
export async function handleAIPipelineModals(page: Page) {
  try {
    const continueButton = page.getByRole('button', { name: /toch doorgaan|continue anyway/i });
    if (await continueButton.isVisible({ timeout: 2000 })) {
      await continueButton.click();
    }
  } catch {}
}

/**
 * Wait for AI analysis indicators to disappear.
 * Matches spinners and Dutch-specific processing text.
 */
export async function waitForAIAnalysis(page: Page, timeout = 60000) {
  try {
    const processingTexts = [
      'Vraag verwerken',
      'Informatie analyseren',
      'Kwaliteitsanalyse',
      'Momentje',
      'Analyzing',
    ];
    
    for (const text of processingTexts) {
      const el = page.locator(`text=${text}`).first();
      if (await el.isVisible({ timeout: 3000 }).catch(() => false)) {
        await expect(el).not.toBeVisible({ timeout });
      }
    }

    const spinner = page.locator('.animate-spin, [role="status"]').first();
    if (await spinner.isVisible({ timeout: 2000 }).catch(() => false)) {
      await expect(spinner).not.toBeVisible({ timeout });
    }
  } catch {}
}
