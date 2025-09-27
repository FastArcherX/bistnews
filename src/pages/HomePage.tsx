import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ref, onValue, off } from 'firebase/database';
import { database } from '../firebase';
import { motion } from 'framer-motion';

interface PdfArticle {
  id: string;
  title: string;
  description: string;
  pdfUrl: string;
  thumbnailUrl: string;
  order: number;
  createdAt: number;
}

interface Announcement {
  id: string;
  content: string;
  createdAt: number;
}

const HomePage: React.FC = () => {
  const [latestArticle, setLatestArticle] = useState<PdfArticle | null>(null);
  const [otherArticles, setOtherArticles] = useState<PdfArticle[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const articlesRef = ref(database, 'pdfArticles');
    const announcementsRef = ref(database, 'announcements');

    const articlesListener = onValue(articlesRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const articlesList = Object.values(data) as PdfArticle[];
        const sortedArticles = articlesList.sort((a, b) => b.order - a.order);
        setLatestArticle(sortedArticles[0] || null);
        setOtherArticles(sortedArticles.slice(1, 7));
      } else {
        setLatestArticle(null);
        setOtherArticles([]);
      }
      setLoading(false);
    });

    const announcementsListener = onValue(announcementsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const announcementsList = Object.values(data) as Announcement[];
        const sortedAnnouncements = announcementsList.sort((a, b) => b.createdAt - a.createdAt);
        setAnnouncements(sortedAnnouncements.slice(0, 3)); // Mostra solo i 3 annunci più recenti
      } else {
        setAnnouncements([]);
      }
    });

    return () => {
      off(articlesRef, 'value', articlesListener);
      off(announcementsRef, 'value', announcementsListener);
    };
  }, []);

  if (loading) {
    return (
      <div className="loading-spinner">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      transition={{ duration: 0.8 }}
    >
      {/* Revolutionary Hero Section */}
      {latestArticle ? (
        <header 
          className="homepage-hero"
          style={{ 
            backgroundImage: `url(${latestArticle.thumbnailUrl || 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2070&q=80'})` 
          }}
        >
          <div className="hero-container">
            <div className="hero-content">
              <motion.h1 
                initial={{ y: 30, opacity: 0 }} 
                animate={{ y: 0, opacity: 1 }} 
                transition={{ delay: 0.2, duration: 0.8 }} 
                className="hero-title"
              >
                {latestArticle.title}
              </motion.h1>
              <motion.p 
                initial={{ y: 30, opacity: 0 }} 
                animate={{ y: 0, opacity: 1 }} 
                transition={{ delay: 0.4, duration: 0.8 }} 
                className="hero-subtitle"
              >
                {latestArticle.description}
              </motion.p>
              <motion.div 
                initial={{ y: 30, opacity: 0 }} 
                animate={{ y: 0, opacity: 1 }} 
                transition={{ delay: 0.6, duration: 0.8 }}
                className="hero-actions"
              >
                <Link to={`/articolo/${latestArticle.id}`} className="btn btn-primary">
                  Leggi l'articolo principale
                </Link>
                <Link to="#articles" className="btn btn-outline">
                  Scopri altri articoli
                </Link>
              </motion.div>
            </div>
            <div className="hero-visual">
              {/* Animated decorative element */}
            </div>
          </div>
        </header>
      ) : (
        <header 
          className="homepage-hero" 
          style={{ 
            backgroundImage: 'url(https://images.unsplash.com/photo-1586953208448-b95a79798f07?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2070&q=80)' 
          }}
        >
          <div className="hero-container">
            <div className="hero-content">
              <h1 className="hero-title">Benvenuti su BISTnews</h1>
              <p className="hero-subtitle">
                Il futuro del giornalismo scolastico. Innovativo, digitale, sempre sul pezzo. 
                Scopri le storie che contano nella nostra comunità.
              </p>
              <div className="hero-actions">
                <Link to="#articles" className="btn btn-primary">
                  Esplora gli articoli
                </Link>
                <Link to="/contatti" className="btn btn-outline">
                  Unisciti al team
                </Link>
              </div>
            </div>
            <div className="hero-visual">
              {/* Animated decorative element */}
            </div>
          </div>
        </header>
      )}

      {/* Modern Announcements Section */}
      {announcements.length > 0 && (
        <section className="announcements-section">
          <div className="announcements-container">
            <h2 className="announcements-title">Annunci Importanti</h2>
            <div className="announcement-content">
              {announcements.map((ann, index) => (
                <motion.div
                  key={ann.id || `announcement-${index}`}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.2 }}
                  dangerouslySetInnerHTML={{ __html: ann.content }}
                />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Revolutionary Articles Grid */}
      {otherArticles.length > 0 && (
        <section className="articles-section" id="articles">
          <h2 className="section-title">Ultimi Articoli</h2>
          <div className="articles-grid">
            {otherArticles.map((article, index) => (
              <motion.article
                key={article.id || `article-${index}`}
                initial={{ y: 50, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: index * 0.1, duration: 0.6 }}
                className="article-card fade-in"
              >
                <div 
                  className="article-card-img" 
                  style={{ 
                    backgroundImage: `url(${article.thumbnailUrl || `https://source.unsplash.com/600x400/?news,technology&sig=${article.id}`})` 
                  }}
                />
                <div className="card-body">
                  <h3 className="card-title">{article.title}</h3>
                  <p className="card-text">{article.description}</p>
                  <div className="card-meta">
                    <span className="card-date">
                      {new Date(article.createdAt).toLocaleDateString('it-IT')}
                    </span>
                    <Link to={`/articolo/${article.id}`} className="card-read-more">
                      Leggi tutto →
                    </Link>
                  </div>
                </div>
              </motion.article>
            ))}
          </div>
        </section>
      )}
    </motion.div>
  );
};

export default HomePage;