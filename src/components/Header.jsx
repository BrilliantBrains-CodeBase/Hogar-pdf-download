import { BRAND } from '../config/brand';

export default function Header({ children }) {
  return (
    <header className="site-header">
      <div className="site-header__bar">
        <a href={BRAND.website} className="brand-logos" aria-label={`${BRAND.name} website`}>
          <img src={BRAND.logo} alt={`${BRAND.name} logo`} className="brand-logo" width="340" height="105" />
          {BRAND.duLogo && (
            <>
              <span className="brand-divider" aria-hidden="true" />
              <img src={BRAND.duLogo} alt="DU logo" className="brand-logo brand-logo--du" />
            </>
          )}
        </a>
      </div>
      {children && <div className="site-header__hero">{children}</div>}
    </header>
  );
}
