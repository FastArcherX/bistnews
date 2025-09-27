import React, { useState, useRef } from 'react';
import { CKEditor } from '@ckeditor/ckeditor5-react';
import DecoupledEditor from '@ckeditor/ckeditor5-build-decoupled-document';
import { ref, push, set, serverTimestamp } from 'firebase/database';
import { database } from '../../firebase';

const AnnouncementEditor: React.FC = () => {
  const [content, setContent] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const editorToolbarRef = useRef<HTMLDivElement>(null);

  const handleSaveAnnouncement = async () => {
    if (!content.trim()) {
      setError('L\'annuncio non può essere vuoto.');
      return;
    }
    setError(null);
    setSuccess(null);

    try {
      const announcementsRef = ref(database, 'announcements');
      const newAnnouncementRef = push(announcementsRef);
      await set(newAnnouncementRef, {
        content,
        createdAt: serverTimestamp(),
      });
      setSuccess('Annuncio pubblicato con successo!');
      setContent('');
    } catch (error: any) {
      setError(error.message);
    }
  };

  return (
    <div>
      <h2>Crea un Nuovo Annuncio Rapido</h2>
      <p>Usa questo editor per comunicazioni veloci che appariranno in un'apposita sezione sul sito.</p>
      <hr />
      {error && (
        <div style={{
          padding: '15px',
          backgroundColor: '#f8d7da',
          color: '#721c24',
          border: '1px solid #f5c6cb',
          borderRadius: '5px',
          marginBottom: '20px'
        }}>
          {error}
        </div>
      )}
      {success && (
        <div style={{
          padding: '15px',
          backgroundColor: '#d4edda',
          color: '#155724',
          border: '1px solid #c3e6cb',
          borderRadius: '5px',
          marginBottom: '20px'
        }}>
          {success}
        </div>
      )}
      
      <div style={{ marginBottom: '15px' }} ref={editorToolbarRef}></div>

      <div style={{ border: '1px solid #ccc', minHeight: '250px' }}>
        <CKEditor
          onReady={editor => {
            if (editorToolbarRef.current && editor.ui.view.toolbar) {
              editorToolbarRef.current.appendChild(editor.ui.view.toolbar.element!);
            }
          }}
          editor={DecoupledEditor as any}
          data={content}
          onChange={(_, editor) => {
            const data = editor.getData();
            setContent(data);
          }}
        />
      </div>

      <button 
        onClick={handleSaveAnnouncement} 
        style={{
          marginTop: '20px',
          padding: '12px 24px',
          backgroundColor: 'var(--primary)',
          color: 'white',
          border: 'none',
          borderRadius: '5px',
          cursor: 'pointer',
          fontFamily: 'Montserrat',
          fontWeight: '600'
        }}
      >
        Pubblica Annuncio
      </button>
    </div>
  );
};

export default AnnouncementEditor;
