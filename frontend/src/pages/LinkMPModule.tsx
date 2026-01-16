import React, { useState } from 'react';
import { Container, Card, Form, Button, InputGroup, Alert, Spinner, Row, Col } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';

// Configuración de URL de API robusta
// @ts-ignore
const getApiBaseUrl = () => {
    // @ts-ignore
    const runtimeUrl = window._env_?.VITE_API_BASE_URL;
    if (runtimeUrl && runtimeUrl !== '__VITE_API_BASE_URL__') {
        return runtimeUrl;
    }
    return import.meta.env.VITE_API_BASE_URL || 'http://localhost:10000/api';
};

const API_BASE_URL = getApiBaseUrl();
const MP_LINK = "https://link.mercadopago.com.ar/comunavillatraful";

const LinkMPModule: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [monto, setMonto] = useState('');
  const [concepto, setConcepto] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'info' | 'danger', msg: string } | null>(null);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(MP_LINK);
    setStatus({ type: 'info', msg: '¡Enlace copiado al portapapeles!' });
    setTimeout(() => setStatus(null), 3000);
  };

  const handleSendEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setStatus(null);

    try {
      const response = await fetch(`${API_BASE_URL}/send_payment_link`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, monto, concepto, link: MP_LINK })
      });

      if (response.ok) {
        setStatus({ type: 'success', msg: 'Email enviado con éxito. El usuario recibirá el link de pago y el botón para adjuntar comprobante.' });
        setEmail('');
        setMonto('');
        setConcepto('');
      } else {
        setStatus({ type: 'danger', msg: 'Error al enviar el email.' });
      }
    } catch (err) {
      setStatus({ type: 'danger', msg: 'Error de conexión.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container className="py-5 mt-5">
      <div className="sticky-top bg-slate-50 py-3 mb-4 border-bottom" style={{ zIndex: 1020, top: '70px' }}>
        <div className="d-flex align-items-center">
          <Button variant="outline-secondary" size="sm" onClick={() => navigate('/staff/dashboard')} className="me-3">&larr; Volver</Button>
          <h2 className="fw-bold mb-0 text-primary">Cobro con Mercado Pago</h2>
        </div>
      </div>

      {status && <Alert variant={status.type} onClose={() => setStatus(null)} dismissible>{status.msg}</Alert>}

      <Row>
        {/* Tarjeta de Copiado Rápido */}
        <Col md={12} className="mb-4">
          <Card className="shadow-sm border-primary bg-primary bg-opacity-10">
            <Card.Body className="d-flex align-items-center justify-content-between p-4">
              <div>
                <h5 className="fw-bold mb-1">Link de Pago General</h5>
                <code className="text-dark bg-white px-2 py-1 rounded border">{MP_LINK}</code>
              </div>
              <Button variant="primary" onClick={copyToClipboard} className="fw-bold">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" className="bi bi-clipboard me-2" viewBox="0 0 16 16">
                  <path d="M4 1.5H3a2 2 0 0 0-2 2V14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V3.5a2 2 0 0 0-2-2h-1v1h1a1 1 0 0 1 1 1V14a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V3.5a1 1 0 0 1 1-1h1v-1z"/>
                  <path d="M9.5 1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-3a.5.5 0 0 1-.5-.5v-1a.5.5 0 0 1 .5-.5h3zm-3-1A1.5 1.5 0 0 0 5 1.5v1A1.5 1.5 0 0 0 6.5 4h3A1.5 1.5 0 0 0 11 2.5v-1A1.5 1.5 0 0 0 9.5 0h-3z"/>
                </svg>
                Copiar
              </Button>
            </Card.Body>
          </Card>
        </Col>

        {/* Formulario de Envío */}
        <Col md={12}>
          <Card className="shadow-sm border-0">
            <Card.Header className="bg-white py-3">
              <h5 className="mb-0 fw-bold">Enviar Solicitud de Pago por Email</h5>
            </Card.Header>
            <Card.Body className="p-4">
              <Form onSubmit={handleSendEmail}>
                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3" controlId="email">
                      <Form.Label>Email del Contribuyente</Form.Label>
                      <Form.Control type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="ejemplo@email.com" />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3" controlId="monto">
                      <Form.Label>Monto a Cobrar ($)</Form.Label>
                      <Form.Control type="number" value={monto} onChange={(e) => setMonto(e.target.value)} required placeholder="0.00" />
                    </Form.Group>
                  </Col>
                  <Col md={12}>
                    <Form.Group className="mb-4" controlId="concepto">
                      <Form.Label>Concepto / Detalle</Form.Label>
                      <Form.Control type="text" value={concepto} onChange={(e) => setConcepto(e.target.value)} placeholder="Ej: Tasa Retributiva Enero" />
                    </Form.Group>
                  </Col>
                </Row>
                <div className="d-grid">
                  <Button variant="success" size="lg" type="submit" disabled={loading}>
                    {loading ? <Spinner animation="border" size="sm" /> : 'Enviar Link y Solicitud de Comprobante'}
                  </Button>
                </div>
              </Form>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default LinkMPModule;