import React from 'react';
import { Link } from 'react-router-dom';

const Footer: React.FC = () => {
  return (
    <footer className="site-footer">
      <div className="footer-container">
        <div className="footer-section">
          <h5>BISTnews</h5>
          <p>
            Il giornale scolastico del BIST. Notizie, approfondimenti e voci dalla nostra comunità scolastica. Un progetto creato con passione per informare, ispirare e connettere.
          </p>
        </div>
        
        <div className="footer-section">
          <h5>Navigazione</h5>
          <ul className="footer-links">
            <li><Link to="/">Home</Link></li>
            <li><Link to="/crediti">Crediti</Link></li>
            <li><Link to="/contatti">Contatti</Link></li>
          </ul>
        </div>

        <div className="footer-section">
          <h5>Area Riservata</h5>
          <ul className="footer-links">
            <li><Link to="/admin">Pannello Admin</Link></li>
            <li><Link to="/login">Login</Link></li>
          </ul>
        </div>

        <div className="footer-section">
          <h5>Seguici</h5>
          <ul className="footer-links">
            <li><a href="#" target="_blank" rel="noopener noreferrer">Instagram</a></li>
            <li><a href="#" target="_blank" rel="noopener noreferrer">Facebook</a></li>
            <li><a href="#" target="_blank" rel="noopener noreferrer">Twitter</a></li>
            <li><a href="#" target="_blank" rel="noopener noreferrer">YouTube</a></li>
          </ul>
        </div>
      </div>
      
      <div className="footer-bottom">
        <div className="footer-copyright">
          &copy; {new Date().getFullYear()} BISTnews. Tutti i diritti riservati.
        </div>
        <div className="footer-social">
          {[
            { icon: '📷', label: 'Instagram', href: '#' },
            { icon: '📘', label: 'Facebook', href: '#' },
            { icon: '🐦', label: 'Twitter', href: '#' },
            { icon: '📺', label: 'YouTube', href: '#' }
          ].map((social) => (
            <a key={social.label} href={social.href} aria-label={social.label}>
              {social.icon}
            </a>
          ))}
        </div>
      </div>
    </footer>
  );
};

export default Footer;
