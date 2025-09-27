import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import logo from '../assets/logo.png';

const AppNavbar: React.FC = () => {
  const [isScrolled, setScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  return (
    <nav className={`app-navbar ${isScrolled ? 'scrolled' : ''}`}>
      <div className="navbar-container">
        <NavLink to="/" className="navbar-brand" onClick={closeMobileMenu}>
          <img
            src={logo}
            alt="BISTnews logo"
          />
        </NavLink>
        
        <button 
          className="navbar-toggle"
          onClick={toggleMobileMenu}
          aria-label="Toggle navigation"
        >
          <div className="hamburger">
            <span></span>
            <span></span>
            <span></span>
          </div>
        </button>

        <ul className={`navbar-nav ${isMobileMenuOpen ? 'open' : ''}`}>
          {[
            { path: '/', label: 'Home', end: true },
            { path: '/crediti', label: 'Crediti' },
            { path: '/contatti', label: 'Contatti' },
            { path: '/admin', label: 'Admin' }
          ].map((link) => (
            <li key={link.path}>
              <NavLink 
                to={link.path}
                className="nav-link" 
                onClick={closeMobileMenu}
                end={link.end}
              >
                {link.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
};

export default AppNavbar;
