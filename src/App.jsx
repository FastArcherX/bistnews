import React from 'react';
import { Routes, Route } from 'react-router-dom';
import './bootstrap-reset.css';
import './App.css';

import AppNavbar from './components/Navbar';
import Footer from './components/Footer';


import HomePage from './pages/HomePage';
import ArticlePage from './pages/ArticlePage';
import CreditsPage from './pages/CreditsPage';
import ContactPage from './pages/ContactPage';
import LoginPage from './pages/LoginPage';

import ProtectedRoute from './components/ProtectedRoute';
import AdminPage from './pages/AdminPage';
import AnnouncementEditor from './pages/admin/AnnouncementEditor';
import PdfManager from './pages/admin/PdfManager';
import MessageViewer from './pages/admin/MessageViewer';

function App() {
  return (
    <>
      <Routes>
        {/* Public routes with Navbar */}
        <Route path="/*" element={<PublicSite />} />

        {/* Admin routes */}
        <Route
          path="/admin/*"
          element={
            <ProtectedRoute>
              <AdminRoutes />
            </ProtectedRoute>
          }
        />
      </Routes>
    </>
  );
}

const PublicSite = () => {
  React.useEffect(() => {
    document.body.classList.add('has-navbar');
    return () => {
      document.body.classList.remove('has-navbar');
    };
  }, []);

  return (
    <>
      <AppNavbar />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/articolo/:id" element={<ArticlePage />} />
        <Route path="/crediti" element={<CreditsPage />} />
        <Route path="/contatti" element={<ContactPage />} />
        <Route path="/login" element={<LoginPage />} />
      </Routes>
      <Footer />
    </>
  );
};

const AdminRoutes = () => (
  <Routes>
    <Route path="/" element={<AdminPage />}>
      <Route index element={<AnnouncementEditor />} />
      <Route path="pdf-manager" element={<PdfManager />} />
      <Route path="messages" element={<MessageViewer />} />
    </Route>
  </Routes>
);

export default App;
