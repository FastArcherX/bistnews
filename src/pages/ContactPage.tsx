import React, { useState } from 'react';
import { Container, Form, Button, Alert, Row, Col } from 'react-bootstrap';
import { ref, push, set, serverTimestamp } from 'firebase/database';
import { database } from '../firebase';

const ContactPage: React.FC = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !message.trim()) {
      setError('Tutti i campi sono obbligatori.');
      return;
    }
    setError(null);
    setSuccess(null);

    try {
      const messagesRef = ref(database, 'messages');
      const newMessageRef = push(messagesRef);
      await set(newMessageRef, {
        name,
        email,
        message,
        sentAt: serverTimestamp(),
      });
      setSuccess('Messaggio inviato con successo! Ti risponderemo al più presto.');
      setName('');
      setEmail('');
      setMessage('');
    } catch (error: any) {
      setError("Si è verificato un errore durante l'invio del messaggio. Riprova più tardi.");
    }
  };

  return (
    <Container className="py-5" style={{ maxWidth: '900px' }}>
      <header className="text-center mb-5">
        <h1 className="display-3">Mettiti in Contatto</h1>
        <p className="lead text-muted">
          Hai una domanda, un suggerimento o vuoi collaborare? Scrivici!
        </p>
      </header>

      <div className="p-4 p-md-5" style={{backgroundColor: '#fff', borderRadius: '15px', boxShadow: '0 10px 30px rgba(0,0,0,0.08)'}}>
        {error && <Alert variant="danger">{error}</Alert>}
        {success && <Alert variant="success">{success}</Alert>}

        <Form onSubmit={handleSubmit}>
          <Row>
            <Col md={6}>
              <Form.Group className="mb-4">
                <Form.Label>Il tuo Nome</Form.Label>
                <Form.Control
                  type="text"
                  placeholder="Mario Rossi"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  size="lg"
                />
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group className="mb-4">
                <Form.Label>La tua Email</Form.Label>
                <Form.Control
                  type="email"
                  placeholder="esempio@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  size="lg"
                />
              </Form.Group>
            </Col>
          </Row>

          <Form.Group className="mb-4">
            <Form.Label>Messaggio</Form.Label>
            <Form.Control
              as="textarea"
              rows={6}
              placeholder="Il tuo messaggio..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              required
              size="lg"
            />
          </Form.Group>

          <Button type="submit" variant="primary" size="lg" className="w-100">
            Invia Messaggio
          </Button>
        </Form>
      </div>
    </Container>
  );
};

export default ContactPage;
