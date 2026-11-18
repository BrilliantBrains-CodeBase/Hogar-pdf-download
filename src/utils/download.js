/**
 * Catalogue download helpers.
 *
 * - Same-origin PDFs (default: /catalogues/*.pdf) use <a download="..."> so the
 *   file is saved as Hogar-Catalogue.pdf / DU-Catalogue.pdf.
 * - Cross-origin PDFs: browsers ignore the `download` attribute, so we convert
 *   known share links (Google Drive, Dropbox) to direct-download URLs and open
 *   them in a new tab as the fallback.
 */

export function toDirectDownloadUrl(url) {
  try {
    const u = new URL(url, window.location.href);

    // Google Drive: /file/d/<id>/view  or  /open?id=<id>
    if (u.hostname === 'drive.google.com') {
      const match = u.pathname.match(/\/file\/d\/([^/]+)/);
      const id = match ? match[1] : u.searchParams.get('id');
      if (id) return `https://drive.google.com/uc?export=download&id=${encodeURIComponent(id)}`;
    }

    // Dropbox: ?dl=0 -> ?dl=1
    if (u.hostname.endsWith('dropbox.com')) {
      u.searchParams.set('dl', '1');
      return u.toString();
    }

    return u.toString();
  } catch {
    return url;
  }
}

export function isSameOrigin(url) {
  try {
    return new URL(url, window.location.href).origin === window.location.origin;
  } catch {
    return false;
  }
}

/** Attributes for a real <a> element (used by the fallback "Download Catalogue" button). */
export function getDownloadLinkProps(catalogue) {
  const href = toDirectDownloadUrl(catalogue.url);
  if (isSameOrigin(href)) {
    return { href, download: catalogue.fileName };
  }
  return { href, target: '_blank', rel: 'noopener noreferrer' };
}

/**
 * Programmatically starts the download. Only call this AFTER the lead has been
 * confirmed as saved by the backend.
 */
export function triggerCatalogueDownload(catalogue) {
  if (!catalogue || !catalogue.url) return false;
  try {
    const props = getDownloadLinkProps(catalogue);
    const a = document.createElement('a');
    a.href = props.href;
    if (props.download) a.download = props.download;
    if (props.target) a.target = props.target;
    if (props.rel) a.rel = props.rel;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    a.remove();
    return true;
  } catch {
    return false;
  }
}
