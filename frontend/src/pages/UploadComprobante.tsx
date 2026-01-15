import React, { useState } from 'react';
import { Container, Card, Form, Button, Alert, Spinner } from 'react-bootstrap';
import { useSearchParams } from 'react-router-dom';

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

const UploadComprobante: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState(searchParams.get('email') || '');
  const [monto, setMonto] = useState(searchParams.get('monto') || '');
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'danger', msg: string } | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setStatus({ type: 'danger', msg: 'Por favor, seleccione un archivo.' });
      return;
    }
    setLoading(true);
    setStatus(null);

    const formData = new FormData();
    formData.append('email', email);
    formData.append('monto', monto);
    formData.append('archivo', file);

    try {
      const response = await fetch(`${API_BASE_URL}/upload_comprobante`, {
        method: 'POST',
        body: formData // Fetch maneja el Content-Type multipart automáticamente
      });

      if (response.ok) {
        setStatus({ type: 'success', msg: '¡Comprobante enviado con éxito! Gracias por su pago.' });
        setFile(null);
      } else {
        setStatus({ type: 'danger', msg: 'Error al subir el comprobante. Intente nuevamente.' });
      }
    } catch (err) {
      setStatus({ type: 'danger', msg: 'Error de conexión.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container className="py-5" style={{ maxWidth: '600px' }}>
      <div className="text-center mb-4">
        <h2 className="fw-bold text-primary">Adjuntar Comprobante</h2>
        <p className="text-muted">Por favor, suba la foto o PDF de su transferencia o pago.</p>
      </div>

      {status && <Alert variant={status.type}>{status.msg}</Alert>}

      <Card className="shadow-sm border-0">
        <Card.Body className="p-4">
          <Form onSubmit={handleSubmit}>
            <Form.Group className="mb-3" controlId="email">
              <Form.Label>Su Email</Form.Label>
              <Form.Control type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </Form.Group>
            
            <Form.Group className="mb-3" controlId="monto">
              <Form.Label>Monto Pagado ($)</Form.Label>
              <Form.Control type="number" value={monto} onChange={(e) => setMonto(e.target.value)} required placeholder="0.00" />
            </Form.Group>

            <Form.Group className="mb-4" controlId="archivo">
              <Form.Label>Archivo (Foto o PDF)</Form.Label>
              <Form.Control type="file" onChange={handleFileChange} required accept="image/*,.pdf" />
              <Form.Text className="text-muted">Formatos aceptados: JPG, PNG, PDF.</Form.Text>
            </Form.Group>

            <div className="d-grid">
              <Button variant="primary" size="lg" type="submit" disabled={loading}>
                {loading ? <Spinner animation="border" size="sm" /> : 'Enviar Comprobante'}
              </Button>
            </div>
          </Form>
        </Card.Body>
      </Card>
    </Container>
  );
};

export default UploadComprobante;