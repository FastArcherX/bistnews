import React from 'react';
import { Container, Row, Col, Card } from 'react-bootstrap';

const ProfileCard: React.FC<{ name: string; role: string }> = ({ name, role }) => (
  <Col md={6} lg={4} className="mb-4">
    <Card className="h-100 text-center article-card p-4">
      <div style={{
        width: '100px',
        height: '100px',
        borderRadius: '50%',
        backgroundColor: 'var(--primary)',
        margin: '0 auto 1.5rem auto',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        color: 'var(--secondary)',
        fontWeight: '700',
        fontSize: '3rem',
        fontFamily: 'Lora, serif'
      }}>
        {name.charAt(0)}
      </div>
      <Card.Title as="h4" className="font-family-montserrat">{name}</Card.Title>
      <Card.Subtitle className="text-muted">{role}</Card.Subtitle>
    </Card>
  </Col>
);

const CreditsPage: React.FC = () => {
  const redazione = [
    { name: 'Mario Rossi', role: 'Caporedattore' },
    { name: 'Giulia Bianchi', role: 'Vice-caporedattore' },
    { name: 'Luca Verdi', role: 'Revisore Bozzetti' },
  ];

  const creativi = [
    { name: 'Laura Viola', role: 'Fotografa Principale' },
    { name: 'Paolo Arancio', role: 'Graphic Designer' },
    { name: 'Anna Neri', role: 'Giornalista' },
    { name: 'Marco Gialli', role: 'Giornalista' },
    { name: 'Sofia Bruno', role: 'Giornalista' },
  ];

  return (
    <Container className="py-5">
      <header className="text-center mb-5">
        <h1 className="display-3">Incontra il Team</h1>
        <p className="lead text-muted">Le menti e le penne dietro BISTnews.</p>
      </header>

      <section className="mb-5">
        <h2 className="section-title">La Redazione</h2>
        <Row className="justify-content-center">
          {redazione.map(p => <ProfileCard key={p.name} name={p.name} role={p.role} />)}
        </Row>
      </section>

      <section>
        <h2 className="section-title">Autori & Creativi</h2>
        <Row>
          {creativi.map(p => <ProfileCard key={p.name} name={p.name} role={p.role} />)}
        </Row>
      </section>

      <section className="p-5 mt-5 rounded-3 text-center" style={{ backgroundColor: 'var(--quaternary)', color: 'var(--secondary)' }}>
        <h2 style={{color: 'var(--secondary)'}}>Un Ringraziamento Speciale</h2>
        <p className="lead mt-3">
          Si ringrazia la Dirigente Scolastica, <strong>Prof.ssa Elena Grigi</strong>, e tutto il corpo docenti per il loro costante supporto e per aver creduto in questo progetto sin dall'inizio.
        </p>
      </section>
    </Container>
  );
};

export default CreditsPage;
