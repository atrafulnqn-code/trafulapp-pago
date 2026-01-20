import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Form, Button, InputGroup, Alert, Spinner, Badge } from 'react-bootstrap';
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

const PatenteEfectivo: React.FC = () => {
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

      const response = await fetch(`${API_BASE_URL}/patente_efectivo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (response.ok) {
        setStatus({ type: 'success', msg: 'Pago en efectivo de patente registrado exitosamente. Comprobante enviado por email.' });

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
      <div className="sticky-top bg-slate-50 py-3 mb-4 border-bottom" style={{ zIndex: 1020, top: '70px' }}>
        <div className="d-flex align-items-center justify-content-between">
          <div className="d-flex align-items-center">
            <Button variant="outline-secondary" size="sm" onClick={() => navigate('/staff/pagos-efectivo')} className="me-3">&larr; Volver</Button>
            <div>
              <h2 className="fw-bold mb-0 text-dark">Pago de Patente - Efectivo</h2>
              <p className="text-muted mb-0 small">Registro de pago presencial ya realizado</p>
            </div>
          </div>
          <Badge bg="success" className="py-2 px-3">PAGO EFECTIVO</Badge>
        </div>
      </div>

      {status && <Alert variant={status.type} onClose={() => setStatus(null)} dismissible>{status.msg}</Alert>}

      <Alert variant="info" className="mb-4">
        <strong>ℹ️ Importante:</strong> Este formulario es para registrar pagos de patente que ya fueron recibidos en efectivo.
        Se generará un comprobante PDF que se enviará al email del contribuyente. <strong>NO</strong> se genera link de pago.
      </Alert>

      <Card className="shadow-sm border-0">
        <Card.Body className="p-4">
          <Form onSubmit={handleSubmit}>
            <Row className="mb-3">
              <Col md={4}>
                <Form.Group controlId="fecha">
                  <Form.Label>Fecha de Pago</Form.Label>
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

            <h5 className="mb-3 text-success border-bottom pb-2">Datos del Vehículo</h5>
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

            <h5 className="mb-3 text-success border-bottom pb-2">Importe</h5>
            <Row className="mb-3 align-items-end">
              <Col md={4}>
                <Form.Group controlId="monto">
                  <Form.Label>Monto Pagado</Form.Label>
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
                    <span className="text-muted d-block small">Total Pagado</span>
                    <span className="h4 fw-bold text-success">${totalFinal.toFixed(2)}</span>
                </div>
              </Col>
            </Row>

            <h5 className="mb-3 text-success border-bottom pb-2 mt-4">Datos para Comprobante</h5>
            <Row className="mb-3">
              <Col md={12}>
                <Form.Group controlId="email">
                  <Form.Label>Email del Contribuyente <span className="text-danger">*</span></Form.Label>
                  <Form.Control type="email" name="email" value={formData.email} onChange={handleChange} required />
                  <Form.Text className="text-muted">Se enviará el comprobante PDF a este email</Form.Text>
                </Form.Group>
              </Col>
            </Row>

            <Row className="mb-4">
              <Col md={6}>
                <Form.Group controlId="administrativo">
                  <Form.Label>Administrativo que recibió el pago</Form.Label>
                  <Form.Select name="administrativo" value={formData.administrativo} onChange={handleChange} required>
                    <option value="">- Seleccionar -</option>
                    {operadores.map(op => <option key={op} value={op}>{op}</option>)}
                  </Form.Select>
                </Form.Group>
              </Col>
            </Row>

            <div className="d-flex gap-3 mt-4">
              <Button variant="success" size="lg" type="submit" disabled={loading}>
                {loading ? <Spinner animation="border" size="sm" /> : '✓ Registrar Pago y Enviar Comprobante'}
              </Button>

              {pdfDownloadUrl && (
                  <Button variant="outline-dark" href={pdfDownloadUrl} download={`patente_efectivo_${formData.patente || 'comprobante'}.pdf`}>
                      📥 Descargar PDF
                  </Button>
              )}
            </div>
          </Form>
        </Card.Body>
      </Card>
    </Container>
  );
};

export default PatenteEfectivo;
