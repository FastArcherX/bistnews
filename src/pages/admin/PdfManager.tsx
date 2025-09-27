import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Form, Button, Card, Spinner, Alert } from 'react-bootstrap';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { ref as dbRef, set, onValue, off, update } from 'firebase/database';
import { database, storage } from '../../firebase';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface PdfArticle {
  id: string;
  title: string;
  description: string;
  pdfUrl: string;
  thumbnailUrl: string;
  order: number;
}

const SortableArticleItem: React.FC<{ article: PdfArticle; onMetaChange: Function; onSave: Function }> = ({ article, onMetaChange, onSave }) => {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: article.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    marginBottom: '1rem',
    backgroundColor: 'white',
    borderRadius: '8px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <Card.Body>
        <Row className="align-items-center">
          <Col md={1}><span style={{cursor: 'grab'}}>&#x2630;</span></Col>
          <Col md={3}>
            <Form.Control type="text" value={article.title} onChange={(e) => onMetaChange(article.id, 'title', e.target.value)} />
          </Col>
          <Col md={5}>
            <Form.Control as="textarea" rows={2} value={article.description} onChange={(e) => onMetaChange(article.id, 'description', e.target.value)} />
          </Col>
          <Col md={3}>
            <Button variant="primary" size="sm" onClick={() => onSave(article)}>Salva</Button>
            <a href={article.pdfUrl} target="_blank" rel="noopener noreferrer" className="btn btn-secondary btn-sm ms-2">Visualizza</a>
          </Col>
        </Row>
      </Card.Body>
    </div>
  );
};

const PdfManager: React.FC = () => {
  const [articles, setArticles] = useState<PdfArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sensors = useSensors(useSensor(PointerSensor));

  useEffect(() => {
    const articlesRef = dbRef(database, 'pdfArticles');
    const listener = onValue(articlesRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const articlesList: PdfArticle[] = Object.values(data).sort((a: any, b: any) => a.order - b.order);
        setArticles(articlesList);
      } else {
        setArticles([]);
      }
      setLoading(false);
    });
    return () => off(articlesRef, 'value', listener);
  }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError(null);

    try {
      const pdfId = `pdf_${Date.now()}`;
      const pdfStorageRef = storageRef(storage, `articles/${pdfId}.pdf`);
      const uploadResult = await uploadBytes(pdfStorageRef, file);
      const pdfUrl = await getDownloadURL(uploadResult.ref);

      const newArticle: PdfArticle = {
        id: pdfId,
        title: file.name.replace('.pdf', ''),
        description: '',
        pdfUrl,
        thumbnailUrl: '', // Placeholder
        order: articles.length,
      };

      await set(dbRef(database, `pdfArticles/${pdfId}`), newArticle);
    } catch (err: any) {
      setError('Upload fallito: ' + err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleMetaChange = (id: string, field: keyof PdfArticle, value: string) => {
    const updatedArticles = articles.map(a => a.id === id ? { ...a, [field]: value } : a);
    setArticles(updatedArticles);
  };

  const handleSaveChanges = async (article: PdfArticle) => {
    try {
      await set(dbRef(database, `pdfArticles/${article.id}`), article);
      alert('Salvataggio completato!');
    } catch (err: any) {
      alert('Errore durante il salvataggio: ' + err.message);
    }
  };

  const handleDragEnd = (event: any) => {
    const { active, over } = event;
    if (active.id !== over.id) {
      setArticles((items) => {
        const oldIndex = items.findIndex(item => item.id === active.id);
        const newIndex = items.findIndex(item => item.id === over.id);
        const newItems = arrayMove(items, oldIndex, newIndex);
        
        // Update order in database
        const updates: { [key: string]: any } = {};
        newItems.forEach((item, index) => {
          updates[`/pdfArticles/${item.id}/order`] = index;
        });
        update(dbRef(database), updates);

        return newItems;
      });
    }
  };

  if (loading) return <Spinner animation="border" />;

  return (
    <Container fluid>
      <h2>Gestione Articoli (PDF)</h2>
      <p>Carica, riordina e modifica i metadati dei tuoi articoli in formato PDF.</p>

      <Card className="mb-4">
        <Card.Body>
          <Form.Group>
            <Form.Label>Carica un nuovo articolo PDF</Form.Label>
            <Form.Control type="file" accept=".pdf" onChange={handleFileUpload} disabled={uploading} />
          </Form.Group>
          {uploading && <Spinner animation="border" size="sm" className="mt-2" />}
          {error && <Alert variant="danger" className="mt-2">{error}</Alert>}
        </Card.Body>
      </Card>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={articles.map(a => a.id)} strategy={verticalListSortingStrategy}>
          <div>
            {articles.map(article => (
              <SortableArticleItem key={article.id} article={article} onMetaChange={handleMetaChange} onSave={handleSaveChanges} />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </Container>
  );
};

export default PdfManager;