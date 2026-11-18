import { Download, ExternalLink, FileText } from 'lucide-react';
import { BRAND } from '../config/brand';
import { getDownloadLinkProps } from '../utils/download';

/**
 * Success state shown on the Thank You page. Only rendered for a submission
 * the backend has confirmed. Shows ONLY the selected company's catalogue.
 */
export default function SuccessMessage({ catalogue, leadId }) {
  const linkProps = getDownloadLinkProps(catalogue);

  return (
    <div className="success">
      <div className="success-icon" aria-hidden="true">
        <svg viewBox="0 0 52 52" className="success-check">
          <circle className="success-check__circle" cx="26" cy="26" r="24" fill="none" />
          <path className="success-check__tick" fill="none" d="M15 27l7 7 15-15" />
        </svg>
      </div>

      <h1 className="success-title">Thank You for Connecting with Hogar!</h1>
      <p className="success-text">
        Your details have been submitted successfully. We appreciate your interest in our products.
      </p>

      <div className="catalogue-card">
        <div className="catalogue-card__icon" aria-hidden="true">
          <FileText size={26} />
        </div>
        <div className="catalogue-card__meta">
          <span className="catalogue-card__label">Your catalogue</span>
          <strong className="catalogue-card__name">{catalogue.label}</strong>
          <span className="catalogue-card__hint">
            Your download should start automatically. If it didn&apos;t, tap the button below.
          </span>
        </div>
      </div>

      <div className="success-actions">
        <a className="btn btn--primary btn--block btn--lg" {...linkProps}>
          <Download size={20} aria-hidden="true" /> Download Catalogue
        </a>
        <a className="btn btn--outline btn--block" href={BRAND.website} target="_blank" rel="noopener noreferrer">
          Visit Hogar Controls <ExternalLink size={18} aria-hidden="true" />
        </a>
      </div>

      {leadId && <p className="lead-ref">Reference ID: {leadId}</p>}
    </div>
  );
}
