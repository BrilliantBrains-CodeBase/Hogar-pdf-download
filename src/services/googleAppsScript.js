/**
 * Sends a lead to the Google Apps Script Web App.
 *
 * The body is sent as `text/plain` so the browser makes a "simple" CORS request
 * (no preflight, which Apps Script cannot answer). Apps Script replies via a
 * redirect to script.googleusercontent.com, which returns readable JSON.
 *
 * Resolves ONLY when the script confirms `{ success: true, leadId }`.
 * Everything else throws, so the UI can never show a false success.
 */
const SCRIPT_URL = (import.meta.env.VITE_GOOGLE_SCRIPT_URL || '').trim();
const TIMEOUT_MS = 25000;

export class SubmissionError extends Error {
  constructor(message, { retryable = true } = {}) {
    super(message);
    this.name = 'SubmissionError';
    this.retryable = retryable;
  }
}

export function isScriptConfigured() {
  return /^https:\/\/script\.google\.com\/macros\/s\/[^/]+\/exec$/.test(SCRIPT_URL);
}

export async function submitLead(payload) {
  if (!isScriptConfigured()) {
    throw new SubmissionError(
      'The form is not connected yet (VITE_GOOGLE_SCRIPT_URL is missing or invalid). Please contact the event team.',
      { retryable: false },
    );
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  let response;
  try {
    response = await fetch(SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload),
      redirect: 'follow',
      signal: controller.signal,
    });
  } catch (err) {
    if (err?.name === 'AbortError') {
      throw new SubmissionError('The request timed out. Please check your connection and try again.');
    }
    throw new SubmissionError('Network error. Please check your internet connection and try again.');
  } finally {
    clearTimeout(timer);
  }

  if (!response.ok) {
    throw new SubmissionError(`The server responded with an error (${response.status}). Please try again.`);
  }

  let data;
  try {
    data = await response.json();
  } catch {
    throw new SubmissionError('Unexpected response from the server. Please try again.');
  }

  if (!data || data.success !== true || !data.leadId) {
    throw new SubmissionError(data?.message || 'We could not save your details. Please try again.', {
      retryable: data?.retryable !== false,
    });
  }

  return { leadId: String(data.leadId) };
}
