import { Navigate, Route, Routes } from 'react-router-dom';
import FormPage from './pages/FormPage';
import ThankYouPage from './pages/ThankYouPage';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<FormPage />} />
      <Route path="/thank-you" element={<ThankYouPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
