import { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import SuccessMessage from '../components/SuccessMessage';
import { getCatalogue } from '../config/catalogues';
import { isValidSubmission, loadSubmission } from '../utils/submissionSession';

/**
 * Accessible only after a confirmed submission. Data comes from router state
 * (normal flow) or sessionStorage (page refresh in the same tab). Direct visits
 * have neither and are redirected to the form. This page never submits and
 * never auto-downloads - the fallback button is the only download trigger here.
 */
export default function ThankYouPage() {
  const location = useLocation();
  const fromState = location.state?.submission;
  const submission = isValidSubmission(fromState) ? fromState : loadSubmission();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  if (!submission) return <Navigate to="/" replace />;

  const catalogue = getCatalogue(submission.company);

  return (
    <div className="page">
      <Header />
      <main className="main main--thankyou">
        <section className="card card--success" aria-live="polite">
          <SuccessMessage catalogue={catalogue} leadId={submission.leadId} />
        </section>
      </main>
      <Footer />
    </div>
  );
}
