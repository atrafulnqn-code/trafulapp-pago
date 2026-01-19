import React, { useState } from 'react';
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

const PlanPagoForm: React.FC = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState<any>({
    fecha: new Date().toISOString().split('T')[0],
    nombre: '',
    cuota_plan: '',
    monto_total: '',
    email: '',
    administrativo: '',
  });

  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'danger', msg: string } | null>(null);
  const [pdfDownloadUrl, setPdfDownloadUrl] = useState<string | null>(null);
  const [mpLink, setMpLink] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setStatus(null);
    setPdfDownloadUrl(null);
    setMpLink(null);

    try {
      const response = await fetch(`${API_BASE_URL}/plan_pago`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (response.ok) {
        let successMsg = 'Plan de Pago registrado con éxito.';
        if (data.email_sent) {
          successMsg += ' Email enviado correctamente.';
        }
        if (data.pdf_generated) {
          successMsg += ' PDF generado.';
        }
        if (data.mp_link) {
          successMsg += ' Link de pago de Mercado Pago creado.';
        }

        setStatus({ type: 'success', msg: successMsg });

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

        // Guardar link de Mercado Pago
        if (data.mp_link) {
            setMpLink(data.mp_link);
        }

        // Reset form parcial
        setFormData({
          ...formData,
          nombre: '',
          cuota_plan: '',
          monto_total: '',
          email: ''
        });
      } else {
        setStatus({ type: 'danger', msg: `Error: ${data.error || 'No se pudo registrar el plan de pago.'}` });
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
        <div className="d-flex align-items-center">
          <Button variant="outline-secondary" size="sm" onClick={() => navigate('/staff/dashboard')} className="me-3">&larr; Volver</Button>
          <h2 className="fw-bold mb-0 text-dark">Plan de Pago</h2>
        </div>
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
                  <Form.Label>Nombre Contribuyente</Form.Label>
                  <Form.Control type="text" name="nombre" value={formData.nombre} onChange={handleChange} required />
                </Form.Group>
              </Col>
            </Row>

            <h5 className="mb-3 text-primary border-bottom pb-2">Datos del Plan</h5>
            <Row className="mb-3">
              <Col md={6}>
                <Form.Group controlId="cuota_plan">
                  <Form.Label>Cuota del Plan</Form.Label>
                  <Form.Control
                    type="text"
                    name="cuota_plan"
                    value={formData.cuota_plan}
                    onChange={handleChange}
                    required
                    placeholder="Ej: 1/6, 2/6, etc."
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group controlId="concepto">
                  <Form.Label>Concepto</Form.Label>
                  <Form.Control type="text" value="Plan de Pago" disabled readOnly className="bg-light" />
                </Form.Group>
              </Col>
            </Row>

            <h5 className="mb-3 text-primary border-bottom pb-2">Importe</h5>
            <Row className="mb-3">
              <Col md={6}>
                <Form.Group controlId="monto_total">
                  <Form.Label>Monto Total</Form.Label>
                  <InputGroup>
                    <InputGroup.Text>$</InputGroup.Text>
                    <Form.Control
                      type="number"
                      name="monto_total"
                      value={formData.monto_total}
                      onChange={handleChange}
                      required
                      min="0"
                      step="0.01"
                    />
                  </InputGroup>
                </Form.Group>
              </Col>
            </Row>

            <h5 className="mb-3 text-primary border-bottom pb-2 mt-4">Datos de Pago</h5>
            <Row className="mb-3">
              <Col md={12}>
                <Form.Group controlId="email">
                  <Form.Label>Email <span className="text-danger">*</span></Form.Label>
                  <Form.Control type="email" name="email" value={formData.email} onChange={handleChange} required />
                  <Form.Text className="text-muted">
                    El link de pago de Mercado Pago será enviado a este correo.
                  </Form.Text>
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

            <div className="d-flex gap-3 mt-4 flex-wrap">
              <Button variant="success" size="sm" type="submit" disabled={loading} className="px-4 py-2">
                {loading ? <Spinner animation="border" size="sm" /> : 'Registrar y Enviar por Email'}
              </Button>

              {pdfDownloadUrl && (
                  <Button
                    variant="outline-dark"
                    size="sm"
                    href={pdfDownloadUrl}
                    download={`plan_pago_${formData.cuota_plan || 'comprobante'}.pdf`}
                    className="px-4 py-2"
                  >
                      Descargar PDF
                  </Button>
              )}

              {mpLink && (
                  <Button
                    variant="primary"
                    size="sm"
                    href={mpLink}
                    target="_blank"
                    className="px-4 py-2"
                  >
                      Abrir Link de Mercado Pago
                  </Button>
              )}
            </div>
          </Form>
        </Card.Body>
      </Card>
    </Container>
  );
};

export default PlanPagoForm;
