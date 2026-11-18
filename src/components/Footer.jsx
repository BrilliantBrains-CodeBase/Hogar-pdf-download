import { Globe, Mail, MapPin, Phone } from 'lucide-react';
import { BRAND } from '../config/brand';

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="site-footer__inner">
        <img src={BRAND.footerLogo} alt={`${BRAND.name} logo`} className="footer-logo" width="1905" height="435" loading="lazy" />

        <p className="footer-company">{BRAND.legalName}</p>

        <ul className="footer-contact">
          <li>
            <MapPin size={16} aria-hidden="true" />
            <span>{BRAND.address}</span>
          </li>
          <li>
            <Mail size={16} aria-hidden="true" />
            <a href={`mailto:${BRAND.email}`}>{BRAND.email}</a>
          </li>
          <li>
            <Phone size={16} aria-hidden="true" />
            <a href={BRAND.phoneHref}>{BRAND.phoneDisplay}</a>
          </li>
          <li>
            <Globe size={16} aria-hidden="true" />
            <a href={BRAND.website} target="_blank" rel="noopener noreferrer">
              www.hogarcontrols.com
            </a>
          </li>
        </ul>

        <div className="footer-bottom">
          <span>© {new Date().getFullYear()} Hogar Controls. All Rights Reserved.</span>
          <a href={BRAND.privacyPolicy} target="_blank" rel="noopener noreferrer">
            Privacy Policy
          </a>
        </div>
      </div>
    </footer>
  );
}
