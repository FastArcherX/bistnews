import React, { useState, useEffect } from 'react';
import { ListGroup, Button, Spinner, Alert } from 'react-bootstrap';
import { ref, onValue, off, remove } from 'firebase/database';
import { database } from '../../firebase';

interface Article {
  id: string;
  title: string;
  createdAt: number;
}

const ArticleManager: React.FC = () => {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const articlesRef = ref(database, 'articles');
    const listener = onValue(articlesRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const articlesList: Article[] = Object.keys(data).map(key => ({
          id: key,
          ...data[key]
        })).sort((a, b) => b.createdAt - a.createdAt);
        setArticles(articlesList);
      } else {
        setArticles([]);
      }
      setLoading(false);
    });

    return () => {
      off(articlesRef, 'value', listener);
    };
  }, []);

  const handleDelete = (articleId: string, articleTitle: string) => {
    if (window.confirm(`Sei sicuro di voler eliminare l'articolo "${articleTitle}"? L'azione è irreversibile.`)) {
      const articleRef = ref(database, `articles/${articleId}`);
      remove(articleRef)
        .catch(error => console.error("Errore durante l'eliminazione: ", error));
    }
  };

  if (loading) {
    return <Spinner animation="border" />;
  }

  return (
    <div>
      <h2>Gestisci Articoli</h2>
      <hr />
      {articles.length > 0 ? (
        <ListGroup>
          {articles.map(article => (
            <ListGroup.Item key={article.id} className="d-flex justify-content-between align-items-center">
              <div>
                <strong>{article.title}</strong>
                <br />
                <small className="text-muted">
                  Pubblicato il: {new Date(article.createdAt).toLocaleString()}
                </small>
              </div>
              <Button variant="outline-danger" size="sm" onClick={() => handleDelete(article.id, article.title)}>
                Elimina
              </Button>
            </ListGroup.Item>
          ))}
        </ListGroup>
      ) : (
        <Alert variant="info">Nessun articolo da gestire.</Alert>
      )}
    </div>
  );
};

export default ArticleManager;
