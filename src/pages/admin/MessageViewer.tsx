import React, { useState, useEffect } from 'react';
import { Card, Button, Spinner, Alert, Container } from 'react-bootstrap';
import { ref, onValue, off, remove } from 'firebase/database';
import { database } from '../../firebase';

interface Message {
  id: string;
  name: string;
  email: string;
  message: string;
  sentAt: number;
}

const MessageViewer: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const messagesRef = ref(database, 'messages');
    const listener = onValue(messagesRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const messagesList: Message[] = Object.keys(data).map(key => ({
          id: key,
          ...data[key]
        })).sort((a, b) => b.sentAt - a.sentAt);
        setMessages(messagesList);
      } else {
        setMessages([]);
      }
      setLoading(false);
    });

    return () => {
      off(messagesRef, 'value', listener);
    };
  }, []);

  const handleDelete = (messageId: string) => {
    if (window.confirm(`Sei sicuro di voler eliminare questo messaggio?`)) {
      const messageRef = ref(database, `messages/${messageId}`);
      remove(messageRef)
        .catch(error => console.error("Errore durante l'eliminazione: ", error));
    }
  };

  if (loading) {
    return <Spinner animation="border" />;
  }

  return (
    <Container fluid>
      <h2>Messaggi Ricevuti</h2>
      <hr />
      {messages.length > 0 ? (
        messages.map(msg => (
          <Card key={msg.id} className="mb-3">
            <Card.Header className="d-flex justify-content-between align-items-center">
              <div>
                <strong>Da: {msg.name}</strong> ({msg.email})
              </div>
              <small className="text-muted">
                {new Date(msg.sentAt).toLocaleString()}
              </small>
            </Card.Header>
            <Card.Body>
              <Card.Text>{msg.message}</Card.Text>
              <Button variant="outline-danger" size="sm" onClick={() => handleDelete(msg.id)}>
                Elimina Messaggio
              </Button>
            </Card.Body>
          </Card>
        ))
      ) : (
        <Alert variant="info">Nessun messaggio ricevuto.</Alert>
      )}
    </Container>
  );
};

export default MessageViewer;
