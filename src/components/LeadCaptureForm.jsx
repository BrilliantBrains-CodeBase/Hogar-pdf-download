import { useRef, useState } from 'react';
import { AlertCircle, ChevronDown, Loader2, RotateCcw, Send } from 'lucide-react';
import { CATEGORY_OPTIONS, COMPANY_OPTIONS } from '../config/formOptions';
import { BRAND } from '../config/brand';
import { submitLead } from '../services/googleAppsScript';
import { FIELD_ORDER, LIMITS, normalizeIndianMobile, validateField, validateForm } from '../utils/validation';

const INITIAL_VALUES = {
  category: '',
  company: '',
  fullName: '',
  firmName: '',
  mobile: '',
  email: '',
  city: '',
  remarks: '',
  website: '', // honeypot - must stay empty
};

function newSubmissionId() {
  if (window.crypto?.randomUUID) return window.crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * @param {{ onSuccess: (result: { leadId: string, company: string }) => void }} props
 */
export default function LeadCaptureForm({ onSuccess }) {
  const [values, setValues] = useState(INITIAL_VALUES);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [status, setStatus] = useState('idle'); // idle | submitting | error
  const [submitError, setSubmitError] = useState(null);

  // Synchronous guard against double taps (state updates are async).
  const inFlight = useRef(false);
  // Same ID is reused when retrying unchanged data, so the backend can
  // de-duplicate if a previous attempt was saved but the response was lost.
  const submissionId = useRef(null);
  const fieldRefs = useRef({});

  const isSubmitting = status === 'submitting';

  function handleChange(event) {
    const { name, value } = event.target;
    setValues((prev) => ({ ...prev, [name]: value }));
    submissionId.current = null;
    if (touched[name]) {
      setErrors((prev) => ({ ...prev, [name]: validateField(name, value) }));
    }
  }

  function handleBlur(event) {
    const { name, value } = event.target;
    setTouched((prev) => ({ ...prev, [name]: true }));
    setErrors((prev) => ({ ...prev, [name]: validateField(name, value) }));
  }

  async function handleSubmit(event) {
    event?.preventDefault();
    if (inFlight.current) return;

    const validationErrors = validateForm(values);
    setErrors(validationErrors);
    setTouched(Object.fromEntries(FIELD_ORDER.map((f) => [f, true])));

    const firstInvalid = FIELD_ORDER.find((f) => validationErrors[f]);
    if (firstInvalid) {
      fieldRefs.current[firstInvalid]?.focus();
      return;
    }

    inFlight.current = true;
    setStatus('submitting');
    setSubmitError(null);
    if (!submissionId.current) submissionId.current = newSubmissionId();

    const payload = {
      submissionId: submissionId.current,
      category: values.category,
      company: values.company,
      fullName: values.fullName.trim(),
      firmName: values.firmName.trim(),
      mobile: normalizeIndianMobile(values.mobile),
      email: values.email.trim(),
      city: values.city.trim(),
      remarks: values.remarks.trim(),
      website: values.website,
    };

    try {
      const { leadId } = await submitLead(payload);
      // Success is only reached when Apps Script confirmed the row was saved.
      onSuccess({ leadId, company: payload.company });
    } catch (err) {
      setSubmitError({
        message: err?.message || 'Something went wrong. Please try again.',
        retryable: err?.retryable !== false,
      });
      setStatus('error');
      inFlight.current = false;
    }
  }

  const fieldProps = (name) => ({
    id: name,
    name,
    value: values[name],
    onChange: handleChange,
    onBlur: handleBlur,
    disabled: isSubmitting,
    ref: (el) => {
      fieldRefs.current[name] = el;
    },
    'aria-invalid': Boolean(errors[name]) || undefined,
    'aria-describedby': errors[name] ? `${name}-error` : undefined,
  });

  const errorText = (name) =>
    errors[name] ? (
      <p className="field-error" id={`${name}-error`} role="alert">
        {errors[name]}
      </p>
    ) : null;

  return (
    <form className="lead-form" onSubmit={handleSubmit} noValidate aria-busy={isSubmitting}>
      <div className="form-grid">
        <div className="field">
          <label htmlFor="category">
            Category <span className="req" aria-hidden="true">*</span>
          </label>
          <div className="select-wrap">
            <select {...fieldProps('category')} required>
              <option value="">Select your category</option>
              {CATEGORY_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
            <ChevronDown className="select-icon" size={18} aria-hidden="true" />
          </div>
          {errorText('category')}
        </div>

        <div className="field">
          <label htmlFor="company">
            Company <span className="req" aria-hidden="true">*</span>
          </label>
          <div className="select-wrap">
            <select {...fieldProps('company')} required>
              <option value="">Select company catalogue</option>
              {COMPANY_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
            <ChevronDown className="select-icon" size={18} aria-hidden="true" />
          </div>
          {errorText('company')}
        </div>

        <div className="field">
          <label htmlFor="fullName">
            Full Name <span className="req" aria-hidden="true">*</span>
          </label>
          <input
            {...fieldProps('fullName')}
            type="text"
            placeholder="Enter your full name"
            autoComplete="name"
            maxLength={LIMITS.fullName}
            required
          />
          {errorText('fullName')}
        </div>

        <div className="field">
          <label htmlFor="firmName">
            Firm / Company Name <span className="opt">(optional)</span>
          </label>
          <input
            {...fieldProps('firmName')}
            type="text"
            placeholder="Your firm or company"
            autoComplete="organization"
            maxLength={LIMITS.firmName}
          />
          {errorText('firmName')}
        </div>

        <div className="field">
          <label htmlFor="mobile">
            Mobile Number <span className="req" aria-hidden="true">*</span>
          </label>
          <div className="input-prefix">
            <span className="prefix" aria-hidden="true">
              +91
            </span>
            <input
              {...fieldProps('mobile')}
              type="tel"
              inputMode="tel"
              placeholder="98765 43210"
              autoComplete="tel"
              maxLength={16}
              required
            />
          </div>
          {errorText('mobile')}
        </div>

        <div className="field">
          <label htmlFor="email">
            Email <span className="opt">(optional)</span>
          </label>
          <input
            {...fieldProps('email')}
            type="email"
            inputMode="email"
            placeholder="you@example.com"
            autoComplete="email"
            maxLength={LIMITS.email}
          />
          {errorText('email')}
        </div>

        <div className="field field--full">
          <label htmlFor="city">
            City <span className="opt">(optional)</span>
          </label>
          <input
            {...fieldProps('city')}
            type="text"
            placeholder="Your city"
            autoComplete="address-level2"
            maxLength={LIMITS.city}
          />
          {errorText('city')}
        </div>

        <div className="field field--full">
          <label htmlFor="remarks">
            Remarks <span className="opt">(optional)</span>
          </label>
          <textarea
            {...fieldProps('remarks')}
            rows={3}
            placeholder="Tell us about your project or requirement"
            maxLength={LIMITS.remarks}
          />
          {errorText('remarks')}
        </div>

        {/* Honeypot for bots: hidden from people and assistive tech */}
        <div className="hp-field" aria-hidden="true">
          <label htmlFor="website">Website</label>
          <input id="website" name="website" type="text" tabIndex={-1} autoComplete="off" value={values.website} onChange={handleChange} />
        </div>
      </div>

      {status === 'error' && submitError && (
        <div className="alert alert--error" role="alert">
          <AlertCircle size={20} aria-hidden="true" />
          <div className="alert__body">
            <strong>Your details were not submitted.</strong>
            <span>{submitError.message}</span>
            {submitError.retryable && (
              <button type="button" className="btn btn--ghost btn--sm" onClick={handleSubmit}>
                <RotateCcw size={16} aria-hidden="true" /> Retry
              </button>
            )}
          </div>
        </div>
      )}

      <button type="submit" className="btn btn--primary btn--block" disabled={isSubmitting}>
        {isSubmitting ? (
          <>
            <Loader2 className="spin" size={20} aria-hidden="true" /> Submitting…
          </>
        ) : (
          <>
            Submit &amp; Get Catalogue <Send size={18} aria-hidden="true" />
          </>
        )}
      </button>

      <p className="form-note">
        <span className="req">*</span> Required fields. By submitting, you agree to our{' '}
        <a href={BRAND.privacyPolicy} target="_blank" rel="noopener noreferrer">
          Privacy Policy
        </a>
        .
      </p>
    </form>
  );
}
