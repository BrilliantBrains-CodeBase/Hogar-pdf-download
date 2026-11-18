import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import LeadCaptureForm from '../components/LeadCaptureForm';
import { getCatalogue } from '../config/catalogues';
import { triggerCatalogueDownload } from '../utils/download';
import { saveSubmission } from '../utils/submissionSession';

export default function FormPage() {
  const navigate = useNavigate();

  // Called only after Apps Script confirmed the lead was saved.
  function handleSuccess({ leadId, company }) {
    const record = saveSubmission({ leadId, company });
    // Download is fired exactly once, here in the submit flow - never on render.
    triggerCatalogueDownload(getCatalogue(company));
    navigate('/thank-you', { state: { submission: record } });
  }

  return (
    <div className="page">
      <Header>
        <p className="eyebrow">Hogar · DU</p>
        <h1 className="hero-title">Get Your Product Catalogue</h1>
        <p className="hero-text">Please share your details to access our product catalogue.</p>
      </Header>

      <main className="main">
        <section className="card" aria-label="Lead capture form">
          <LeadCaptureForm onSuccess={handleSuccess} />
        </section>
      </main>

      <Footer />
    </div>
  );
}
