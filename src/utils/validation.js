import { CATEGORY_OPTIONS, COMPANY_OPTIONS } from '../config/formOptions';

export const LIMITS = {
  fullName: 100,
  firmName: 150,
  email: 254,
  city: 100,
  remarks: 1000,
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const NAME_RE = /^[\p{L}\p{M}][\p{L}\p{M}\s.'-]*$/u;

/**
 * Normalises an Indian mobile number to its 10 digits.
 * Accepts: 9876543210, 98765 43210, +91 98765-43210, 919876543210, 09876543210
 * Returns null when invalid.
 */
export function normalizeIndianMobile(value) {
  let digits = String(value || '').replace(/[\s\-().]/g, '');
  if (digits.startsWith('+91')) digits = digits.slice(3);
  else if (digits.length === 12 && digits.startsWith('91')) digits = digits.slice(2);
  else if (digits.length === 11 && digits.startsWith('0')) digits = digits.slice(1);
  return /^[6-9]\d{9}$/.test(digits) ? digits : null;
}

export function validateField(name, rawValue) {
  const value = String(rawValue ?? '').trim();
  switch (name) {
    case 'category':
      if (!value) return 'Please select a category.';
      if (!CATEGORY_OPTIONS.includes(value)) return 'Please select a valid category.';
      return '';
    case 'company':
      if (!value) return 'Please select a company.';
      if (!COMPANY_OPTIONS.includes(value)) return 'Please select a valid company.';
      return '';
    case 'fullName':
      if (!value) return 'Please enter your full name.';
      if (value.length < 2) return 'Name must be at least 2 characters.';
      if (value.length > LIMITS.fullName) return `Name must be under ${LIMITS.fullName} characters.`;
      if (!NAME_RE.test(value)) return 'Name can contain letters, spaces, dots, hyphens and apostrophes only.';
      return '';
    case 'mobile':
      if (!value) return 'Please enter your mobile number.';
      if (!normalizeIndianMobile(value)) return 'Enter a valid 10-digit Indian mobile number (starting with 6–9).';
      return '';
    case 'email':
      if (!value) return '';
      if (value.length > LIMITS.email || !EMAIL_RE.test(value)) return 'Please enter a valid email address.';
      return '';
    case 'firmName':
    case 'city':
    case 'remarks':
      if (value.length > LIMITS[name]) return `Must be under ${LIMITS[name]} characters.`;
      return '';
    default:
      return '';
  }
}

export const FIELD_ORDER = ['category', 'company', 'fullName', 'firmName', 'mobile', 'email', 'city', 'remarks'];

export function validateForm(values) {
  const errors = {};
  for (const field of FIELD_ORDER) {
    const message = validateField(field, values[field]);
    if (message) errors[field] = message;
  }
  return errors;
}
