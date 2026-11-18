import { getCatalogue } from '../config/catalogues';

/**
 * Keeps the confirmed submission in sessionStorage (this browser tab only) so
 * the Thank You page survives a refresh, while direct visits / new tabs have
 * nothing stored and are redirected back to the form.
 */
const KEY = 'hogar_lead_submission';
const MAX_AGE_MS = 30 * 60 * 1000; // 30 minutes

function safeStorage() {
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

export function saveSubmission({ leadId, company }) {
  const record = { leadId, company, submittedAt: Date.now() };
  try {
    safeStorage()?.setItem(KEY, JSON.stringify(record));
  } catch {
    /* storage unavailable (private mode) - router state still carries the data */
  }
  return record;
}

export function isValidSubmission(record) {
  return Boolean(
    record &&
      typeof record.leadId === 'string' &&
      record.leadId &&
      getCatalogue(record.company) &&
      typeof record.submittedAt === 'number' &&
      Date.now() - record.submittedAt < MAX_AGE_MS,
  );
}

export function loadSubmission() {
  try {
    const raw = safeStorage()?.getItem(KEY);
    const record = raw ? JSON.parse(raw) : null;
    if (isValidSubmission(record)) return record;
    safeStorage()?.removeItem(KEY);
  } catch {
    /* ignore */
  }
  return null;
}

export function clearSubmission() {
  try {
    safeStorage()?.removeItem(KEY);
  } catch {
    /* ignore */
  }
}
