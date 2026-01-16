import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Form, Button, InputGroup, Alert, Spinner } from 'react-bootstrap';
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

const operadores = [
  'Virginia Paicil',
  'Anahí Olivero',
  'Carolina Cobos'
];

const PatenteForm: React.FC = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState<any>({
    fecha: new Date().toISOString().split('T')[0],
    nombre: '',
    patente: '',
    marca: '',
    modelo: '',
    anio: '',
    monto: '',
    descuento: 0,
    email: '',
    transferencia: '',
    administrativo: '',
  });

  const [totalFinal, setTotalFinal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'danger', msg: string } | null>(null);
  const [pdfDownloadUrl, setPdfDownloadUrl] = useState<string | null>(null);

  // Calcular total automáticamente
  useEffect(() => {
    const monto = parseFloat(formData.monto) || 0;
    const desc = parseFloat(formData.descuento) || 0;
    const final = monto - (monto * (desc / 100));
    setTotalFinal(final);
  }, [formData.monto, formData.descuento]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setStatus(null);
    setPdfDownloadUrl(null);

    try {
      const payload = {
        ...formData,
        total_final: totalFinal
      };

      const response = await fetch(`${API_BASE_URL}/patente_manual`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (response.ok) {
        setStatus({ type: 'success', msg: 'Pago de Patente registrado, PDF generado y email enviado con éxito.' });
        
        // Crear URL para descargar PDF
        if (data.pdf_base64) {
            const byteCharacters = atob(data.pdf_base64);
            const byteNumbers = new Array(byteCharacters.length);
            for (let i = 0; i < byteCharacters.length; i++) {
                byteNumbers[i] = byteCharacters.charCodeAt(i);
            }
            const byteArray = new Uint8Array(byteNumbers);
            const blob = new Blob([byteArray], { type: "application/pdf" });
            const url = URL.createObjectURL(blob);
            setPdfDownloadUrl(url);
        }
        
        // Reset form parcial
        setFormData({ ...formData, nombre: '', patente: '', marca: '', modelo: '', anio: '', monto: '', descuento: 0, email: '', transferencia: '' });
      } else {
        setStatus({ type: 'danger', msg: `Error: ${data.error || 'No se pudo registrar.'}` });
      }
    } catch (err: any) {
      setStatus({ type: 'danger', msg: `Error de conexión: ${err.message}` });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container className="py-5 mt-5">
      <div className="d-flex align-items-center mb-4">
        <Button variant="outline-secondary" size="sm" onClick={() => navigate('/staff/dashboard')} className="me-3">&larr; Volver</Button>
        <h2 className="fw-bold mb-0">Pago de Patente</h2>
      </div>

      {status && <Alert variant={status.type} onClose={() => setStatus(null)} dismissible>{status.msg}</Alert>}

      <Card className="shadow-sm border-0">
        <Card.Body className="p-4">
          <Form onSubmit={handleSubmit}>
            <Row className="mb-3">
              <Col md={4}>
                <Form.Group controlId="fecha">
                  <Form.Label>Fecha</Form.Label>
                  <Form.Control type="date" name="fecha" value={formData.fecha} onChange={handleChange} required />
                </Form.Group>
              </Col>
              <Col md={8}>
                <Form.Group controlId="nombre">
                  <Form.Label>Nombre y Apellido</Form.Label>
                  <Form.Control type="text" name="nombre" value={formData.nombre} onChange={handleChange} required />
                </Form.Group>
              </Col>
            </Row>

            <h5 className="mb-3 text-primary border-bottom pb-2">Datos del Vehículo</h5>
            <Row className="mb-3">
              <Col md={4}>
                <Form.Group controlId="patente">
                  <Form.Label>Patente</Form.Label>
                  <Form.Control type="text" name="patente" value={formData.patente} onChange={handleChange} required className="text-uppercase fw-bold" />
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group controlId="marca">
                  <Form.Label>Marca</Form.Label>
                  <Form.Control type="text" name="marca" value={formData.marca} onChange={handleChange} required />
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group controlId="modelo">
                  <Form.Label>Modelo</Form.Label>
                  <Form.Control type="text" name="modelo" value={formData.modelo} onChange={handleChange} required />
                </Form.Group>
              </Col>
            </Row>
            <Row className="mb-4">
               <Col md={4}>
                <Form.Group controlId="anio">
                  <Form.Label>Año</Form.Label>
                  <Form.Control type="number" name="anio" value={formData.anio} onChange={handleChange} required min="1900" max="2100" />
                </Form.Group>
              </Col>
            </Row>

            <h5 className="mb-3 text-primary border-bottom pb-2">Importe</h5>
            <Row className="mb-3 align-items-end">
              <Col md={4}>
                <Form.Group controlId="monto">
                  <Form.Label>Monto a Pagar</Form.Label>
                  <InputGroup>
                    <InputGroup.Text>$</InputGroup.Text>
                    <Form.Control type="number" name="monto" value={formData.monto} onChange={handleChange} required min="0" step="0.01" />
                  </InputGroup>
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group controlId="descuento">
                  <Form.Label>Descuento %</Form.Label>
                  <Form.Control type="number" name="descuento" value={formData.descuento} onChange={handleChange} min="0" max="100" />
                </Form.Group>
              </Col>
              <Col md={4}>
                <div className="bg-light p-2 rounded text-center">
                    <span className="text-muted d-block small">Total Final</span>
                    <span className="h4 fw-bold text-success">${totalFinal.toFixed(2)}</span>
                </div>
              </Col>
            </Row>

            <h5 className="mb-3 text-primary border-bottom pb-2 mt-4">Datos de Pago</h5>
            <Row className="mb-3">
              <Col md={6}>
                <Form.Group controlId="email">
                  <Form.Label>Email <span className="text-danger">*</span></Form.Label>
                  <Form.Control type="email" name="email" value={formData.email} onChange={handleChange} required />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group controlId="transferencia">
                  <Form.Label>Número de transferencia</Form.Label>
                  <Form.Control type="text" name="transferencia" value={formData.transferencia} onChange={handleChange} />
                </Form.Group>
              </Col>
            </Row>
            
            <Row className="mb-4">
              <Col md={6}>
                <Form.Group controlId="administrativo">
                  <Form.Label>Administrativo</Form.Label>
                  <Form.Select name="administrativo" value={formData.administrativo} onChange={handleChange} required>
                    <option value="">- Seleccionar -</option>
                    {operadores.map(op => <option key={op} value={op}>{op}</option>)}
                  </Form.Select>
                </Form.Group>
              </Col>
            </Row>

            <div className="d-flex gap-3 mt-4">
              <Button variant="success" size="sm" type="submit" disabled={loading} className="px-4 py-2">
                {loading ? <Spinner animation="border" size="sm" /> : 'Registrar y Enviar por Email'}
              </Button>
              
              {pdfDownloadUrl && (
                  <Button variant="outline-dark" size="sm" href={pdfDownloadUrl} download={`patente_${formData.patente || 'comprobante'}.pdf`} className="px-4 py-2">
                      Descargar PDF
                  </Button>
              )}
            </div>
          </Form>
        </Card.Body>
      </Card>
    </Container>
  );
};

export default PatenteForm;