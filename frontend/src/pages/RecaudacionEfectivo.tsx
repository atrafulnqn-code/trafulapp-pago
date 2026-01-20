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

const items = [
  { id: 'aranceles', label: 'Aranceles Administrativos' },
  { id: 'tasa_retributivos', label: 'Tasa p/Serv. Retributivos - Barrido y Limp. - Riego - Cons. Calles' },
  { id: 'recoleccion', label: 'Recolección de Residuos' },
  { id: 'inspeccion', label: 'Tasa por Isnp. e Higiene' },
  { id: 'licencia', label: 'Por Otorgamiento / Renovación de Lic. Conducir' },
  { id: 'publicidad', label: 'Publicidad y Propaganda' },
  { id: 'habilitacion', label: 'Habilitación Comercial' },
  { id: 'solicitud', label: 'Solicitud' },
  { id: 'ambulante', label: 'Venta Ambulante por día' },
  { id: 'deuda', label: 'Deuda Atrasada' },
  { id: 'agua', label: 'Agua Potable' },
  { id: 'libreta', label: 'Por Otorgamiento / Renovación Libreta Sanitaria' },
  { id: 'certificaciones', label: 'Certificaciones' },
];

const RecaudacionEfectivo: React.FC = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState<any>({
    fecha: new Date().toISOString().split('T')[0],
    nombre: '',
    email: '',
    transferencia: '',
    administrativa: '',
    descuento: 0,
  });

  const [importes, setImportes] = useState<any>({});
  const [notas, setNotas] = useState<any>({});
  const [seleccionados, setSeleccionados] = useState<string[]>([]);
  const [total, setTotal] = useState(0);
  const [totalFinal, setTotalFinal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'danger', msg: string } | null>(null);
  const [pdfDownloadUrl, setPdfDownloadUrl] = useState<string | null>(null);

  // Calcular totales cuando cambian importes, descuento o selección
  useEffect(() => {
    const suma = Object.entries(importes).reduce((acc: number, [key, val]: [string, any]) => {
      if (seleccionados.includes(key)) {
        return acc + (parseFloat(val) || 0);
      }
      return acc;
    }, 0);
    setTotal(suma);

    const desc = parseFloat(formData.descuento) || 0;
    const final = suma - (suma * (desc / 100));
    setTotalFinal(final);
  }, [importes, formData.descuento, seleccionados]);

  const handleCheckboxChange = (id: string) => {
    if (seleccionados.includes(id)) {
      setSeleccionados(seleccionados.filter(item => item !== id));
    } else {
      setSeleccionados([...seleccionados, id]);
    }
  };

  const handleImporteChange = (id: string, value: string) => {
    setImportes({ ...importes, [id]: value });
  };

  const handleNotaChange = (id: string, value: string) => {
    setNotas({ ...notas, [id]: value });
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (seleccionados.length === 0) {
        setStatus({ type: 'danger', msg: 'Debe seleccionar al menos un concepto.' });
        return;
    }
    setLoading(true);
    setStatus(null);
    setPdfDownloadUrl(null);

    try {
      // Filtrar solo importes y notas seleccionados
      const importesFinales = Object.fromEntries(
        Object.entries(importes).filter(([key]) => seleccionados.includes(key))
      );
      const notasFinales = Object.fromEntries(
        Object.entries(notas).filter(([key]) => seleccionados.includes(key))
      );

      const payload = {
        ...formData,
        importes: importesFinales,
        notas: notasFinales,
        total: total,
        total_final: totalFinal
      };

      const response = await fetch(`${API_BASE_URL}/recaudacion_efectivo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (response.ok) {
        setStatus({ type: 'success', msg: data.message || 'Pago en efectivo registrado exitosamente. Comprobante enviado por email.' });

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

        // Reset form
        setFormData({ ...formData, nombre: '', email: '', descuento: 0 });
        setImportes({});
        setNotas({});
        setSeleccionados([]);
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
              <h2 className="fw-bold mb-0 text-dark">Recaudación - Pago en Efectivo</h2>
              <p className="text-muted mb-0 small">Registro de pago presencial ya realizado</p>
            </div>
          </div>
          <Badge bg="success" className="py-2 px-3">PAGO EFECTIVO</Badge>
        </div>
      </div>

      {status && <Alert variant={status.type} onClose={() => setStatus(null)} dismissible>{status.msg}</Alert>}

      <Alert variant="info" className="mb-4">
        <strong>ℹ️ Importante:</strong> Este formulario es para registrar pagos que ya fueron recibidos en efectivo.
        Se generará un comprobante PDF que se enviará al email del contribuyente. <strong>NO</strong> se genera link de pago.
      </Alert>

      <Card className="shadow-sm border-0">
        <Card.Body className="p-4">
          <Form onSubmit={handleSubmit}>
            <Row className="mb-4">
              <Col md={4}>
                <Form.Group controlId="fecha">
                  <Form.Label>Fecha de Pago</Form.Label>
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

            <h5 className="mb-3 text-success border-bottom pb-2">Seleccione Conceptos Pagados</h5>

            {items.map((item) => (
              <div key={item.id} className="mb-3 border-bottom pb-2">
                  <Form.Check
                    type="checkbox"
                    id={`check-${item.id}`}
                    label={item.label}
                    checked={seleccionados.includes(item.id)}
                    onChange={() => handleCheckboxChange(item.id)}
                    className="mb-2 fw-bold"
                  />
                  {seleccionados.includes(item.id) && (
                      <div className="ms-4">
                          <InputGroup size="sm" className="mb-2" style={{ maxWidth: '200px' }}>
                            <InputGroup.Text>$</InputGroup.Text>
                            <Form.Control
                              type="number"
                              placeholder="0.00"
                              value={importes[item.id] || ''}
                              onChange={(e) => handleImporteChange(item.id, e.target.value)}
                              min="0"
                              step="0.01"
                              autoFocus
                            />
                          </InputGroup>
                          <Form.Control
                              size="sm"
                              type="text"
                              placeholder="Aclaración / Nota (opcional)"
                              value={notas[item.id] || ''}
                              onChange={(e) => handleNotaChange(item.id, e.target.value)}
                              className="text-muted fst-italic"
                          />
                      </div>
                  )}
              </div>
            ))}

            <hr className="my-4"/>

            <Row className="mb-3">
              <Col md={6} className="offset-md-6">
                <div className="d-flex justify-content-between mb-2">
                  <span className="fw-bold">Subtotal:</span>
                  <span>${total.toFixed(2)}</span>
                </div>
                <Form.Group as={Row} className="mb-2 align-items-center" controlId="descuento">
                  <Form.Label column sm={6} className="text-end">Descuento %:</Form.Label>
                  <Col sm={6}>
                    <Form.Control
                      type="number"
                      name="descuento"
                      value={formData.descuento}
                      onChange={handleChange}
                      min="0"
                      max="100"
                    />
                  </Col>
                </Form.Group>
                <div className="d-flex justify-content-between align-items-center bg-light p-3 rounded mt-3">
                  <span className="h5 mb-0 fw-bold text-success">Total Pagado:</span>
                  <span className="h4 mb-0 fw-bold text-success">${totalFinal.toFixed(2)}</span>
                </div>
              </Col>
            </Row>

            <h5 className="mb-3 text-success border-bottom pb-2 mt-4">Datos para Comprobante</h5>
            <Row className="mb-3">
              <Col md={12}>
                <Form.Group controlId="email" className="mb-3">
                  <Form.Label>Email del Contribuyente <span className="text-danger">*</span></Form.Label>
                  <Form.Control type="email" name="email" value={formData.email} onChange={handleChange} required />
                  <Form.Text className="text-muted">Se enviará el comprobante PDF a este email</Form.Text>
                </Form.Group>
              </Col>
            </Row>

            <Row className="mb-4">
              <Col md={6}>
                <Form.Group controlId="administrativa">
                  <Form.Label>Administrativa que recibió el pago</Form.Label>
                  <Form.Select name="administrativa" value={formData.administrativa} onChange={handleChange} required>
                    <option value="">- Seleccionar -</option>
                    <option value="Virginia Paicil">Virginia Paicil</option>
                    <option value="Anahí Olivero">Anahí Olivero</option>
                    <option value="Carolina Cobos">Carolina Cobos</option>
                  </Form.Select>
                </Form.Group>
              </Col>
            </Row>

            <div className="d-flex gap-3 mt-4">
              <Button variant="success" type="submit" disabled={loading} size="lg">
                {loading ? <Spinner animation="border" size="sm" /> : '✓ Registrar Pago y Enviar Comprobante'}
              </Button>

              {pdfDownloadUrl && (
                  <Button variant="outline-dark" href={pdfDownloadUrl} download={`comprobante_efectivo_${new Date().getTime()}.pdf`}>
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

export default RecaudacionEfectivo;
