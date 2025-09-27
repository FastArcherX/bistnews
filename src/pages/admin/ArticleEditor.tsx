import React, { useState, useRef } from 'react';
import { Form, Button, Alert } from 'react-bootstrap';
import { CKEditor } from '@ckeditor/ckeditor5-react';
import DecoupledEditor from '@ckeditor/ckeditor5-build-decoupled-document';
import { ref, push, set, serverTimestamp } from 'firebase/database';
import { database } from '../../firebase';

const ArticleEditor: React.FC = () => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const editorToolbarRef = useRef<HTMLDivElement>(null);

  const handleSaveArticle = async () => {
    if (!title.trim() || !content.trim()) {
      setError('Titolo e contenuto non possono essere vuoti.');
      return;
    }
    setError(null);
    setSuccess(null);

    try {
      const articlesRef = ref(database, 'articles');
      const newArticleRef = push(articlesRef);
      await set(newArticleRef, {
        title,
        content,
        createdAt: serverTimestamp(),
      });
      setSuccess('Articolo pubblicato con successo!');
      setTitle('');
      setContent('');
    } catch (error: any) {
      setError(error.message);
    }
  };

  return (
    <div>
      <h2>Crea un Nuovo Articolo</h2>
      <hr />
      {error && <Alert variant="danger">{error}</Alert>}
      {success && <Alert variant="success">{success}</Alert>}
      
      <Form.Group className="mb-3">
        <Form.Label>Titolo Articolo</Form.Label>
        <Form.Control
          type="text"
          placeholder="Il titolo del tuo articolo"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="mb-3"
        />
      </Form.Group>

      <div className="mb-3" ref={editorToolbarRef}></div>

      <div style={{ border: '1px solid #ccc', minHeight: '400px' }}>
        <CKEditor
          onReady={editor => {
            if (editorToolbarRef.current) {
              editorToolbarRef.current.appendChild(editor.ui.view.toolbar.element!);
            }
          }}
          editor={DecoupledEditor}
          data={content}
          onChange={(event, editor) => {
            const data = editor.getData();
            setContent(data);
          }}
        />
      </div>

      <Button variant="primary" onClick={handleSaveArticle} className="mt-3">
        Pubblica Articolo
      </Button>
    </div>
  );
};

export default ArticleEditor;
