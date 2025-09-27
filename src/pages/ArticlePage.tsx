import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { ref, get } from 'firebase/database';
import { database } from '../firebase';
import { Document, Page, pdfjs } from 'react-pdf';

// Setup worker for react-pdf
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

interface PdfArticle {
  id: string;
  title: string;
  description: string;
  pdfUrl: string;
  thumbnailUrl: string;
  order: number;
  createdAt: number;
}

const ArticlePage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [article, setArticle] = useState<PdfArticle | null>(null);
  const [loading, setLoading] = useState(true);
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageNumber, setPageNumber] = useState(1);

  useEffect(() => {
    if (!id) return;

    const articleRef = ref(database, `pdfArticles/${id}`);
    get(articleRef).then((snapshot) => {
      if (snapshot.exists()) {
        setArticle(snapshot.val());
      }
      setLoading(false);
    });
  }, [id]);

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
  };

  const goToPrevPage = () => setPageNumber(prev => Math.max(prev - 1, 1));
  const goToNextPage = () => setPageNumber(prev => Math.min(prev + 1, numPages || 1));

  if (loading) {
    return (
      <div className="loading-spinner">
        <div className="spinner"></div>
      </div>
    );
  }

  if (!article) {
    return (
      <div className="container-fluid-modern" style={{ paddingTop: '120px', textAlign: 'center' }}>
        <h1>Articolo non trovato</h1>
        <p>L'articolo richiesto non esiste o non è più disponibile.</p>
      </div>
    );
  }

  return (
    <article>
      <header className="article-header">
        <div className="article-header-content">
          <h1 className="article-title">{article.title}</h1>
          <div className="article-meta">
            <span>{article.description}</span>
            <span>{new Date(article.createdAt).toLocaleDateString('it-IT')}</span>
          </div>
        </div>
      </header>
      
      <div className="container-fluid-modern" style={{ paddingTop: 'var(--space-xxl)', paddingBottom: 'var(--space-xxl)' }}>
        <div className="pdf-viewer-container" style={{ 
          maxWidth: '900px', 
          margin: '0 auto',
          textAlign: 'center',
          boxShadow: 'var(--shadow-heavy)',
          borderRadius: 'var(--radius-xl)',
          overflow: 'hidden',
          background: 'var(--text-light)'
        }}>
          <Document
            file={article.pdfUrl}
            onLoadSuccess={onDocumentLoadSuccess}
            loading={
              <div className="loading-spinner">
                <div className="spinner"></div>
              </div>
            }
          >
            <Page 
              pageNumber={pageNumber}
              width={Math.min(850, window.innerWidth - 40)}
            />
          </Document>
        </div>

        {numPages && (
          <div className="pagination-controls" style={{ 
            marginTop: 'var(--space-xl)', 
            textAlign: 'center',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: 'var(--space-md)',
            flexWrap: 'wrap'
          }}>
            <button 
              className="btn btn-secondary" 
              onClick={goToPrevPage} 
              disabled={pageNumber <= 1}
            >
              ← Pagina Precedente
            </button>
            <span style={{ 
              padding: 'var(--space-sm) var(--space-md)',
              background: 'var(--secondary)',
              borderRadius: 'var(--radius-md)',
              fontWeight: '600'
            }}>
              Pagina {pageNumber} di {numPages}
            </span>
            <button 
              className="btn btn-secondary" 
              onClick={goToNextPage} 
              disabled={pageNumber >= numPages}
            >
              Pagina Successiva →
            </button>
          </div>
        )}
      </div>
    </article>
  );
};

export default ArticlePage;