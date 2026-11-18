/**
 * Catalogue mapping: Company Selection -> catalogue PDF.
 *
 * To replace a catalogue, either:
 *  1. Overwrite the file in `public/catalogues/` (keep the same filename), or
 *  2. Set VITE_HOGAR_CATALOGUE_URL / VITE_DU_CATALOGUE_URL in your .env, or
 *  3. Edit the fallback URL below.
 *
 * `fileName` is the name the visitor's device saves the PDF as.
 */
export const CATALOGUES = {
  Hogar: {
    label: 'Hogar Product Catalogue',
    url: import.meta.env.VITE_HOGAR_CATALOGUE_URL || '/catalogues/hogar-catalogue.pdf',
    fileName: 'Hogar-Catalogue.pdf',
  },
  DU: {
    label: 'DU Product Catalogue',
    url: import.meta.env.VITE_DU_CATALOGUE_URL || '/catalogues/du-catalogue.pdf',
    fileName: 'DU-Catalogue.pdf',
  },
};

export function getCatalogue(company) {
  return Object.prototype.hasOwnProperty.call(CATALOGUES, company) ? CATALOGUES[company] : null;
}
