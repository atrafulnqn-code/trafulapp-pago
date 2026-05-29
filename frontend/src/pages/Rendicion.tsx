import React, { useEffect, useState } from 'react';
import { Container, Table, Form, Button, Spinner, Alert, Row, Col, Card } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

// @ts-ignore
const getApiBaseUrl = () => {
  // @ts-ignore
  const runtimeUrl = window._env_?.VITE_API_BASE_URL;
  if (runtimeUrl && runtimeUrl !== '__VITE_API_BASE_URL__') {
    return runtimeUrl;
  }
  return import.meta.env.VITE_API_BASE_URL || 'https://traful-backend-docker.onrender.com/api';
};

const API_BASE_URL = getApiBaseUrl();

interface RendicionRecord {
  id: number;
  fecha: string;
  nombre: string;
  monto: number;
  tipo_pago: string;
  pdf_url: string;
}

const Rendicion: React.FC = () => {
  const navigate = useNavigate();
  const [records, setRecords] = useState<RendicionRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const today = new Date();
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [year, setYear] = useState(today.getFullYear());

  const fetchRecords = async (m: number, y: number) => {
    setLoading(true);
    setError(null);
    try {
      const password = localStorage.getItem('adminPassword') || '';
      
      const response = await axios.get(`${API_BASE_URL}/admin/rendicion`, {
        params: { month: m, year: y },
        headers: { Authorization: `Bearer ${password}` }
      });

      if (response.data.status === 'success') {
        setRecords(response.data.data);
      } else {
        setError('Error al obtener datos');
      }
    } catch (err: any) {
      console.error('Error fetching rendicion:', err);
      if (err.response?.status === 401) {
        setError('Sesión expirada o no autorizada.');
        setTimeout(() => navigate('/admin'), 3000);
      } else {
        setError(err.response?.data?.error || 'Error al cargar los datos.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const password = localStorage.getItem('adminPassword');
    if (!password) {
      setError('No se encontró sesión activa.');
      setTimeout(() => navigate('/admin'), 2000);
      return;
    }
    fetchRecords(month, year);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchRecords(month, year);
  };

  const handleDownloadPdf = async (id: number) => {
    try {
      const password = localStorage.getItem('adminPassword') || '';
      const response = await axios.get(`${API_BASE_URL}/admin/db/payment-history/${id}/pdf`, {
        headers: { Authorization: `Bearer ${password}` },
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `comprobante_${id}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error al descargar PDF:', err);
      alert('Error al descargar el comprobante PDF');
    }
  };

  // Calcular totales por categoría
  const summary = records.reduce((acc, curr) => {
    acc[curr.tipo_pago] = (acc[curr.tipo_pago] || 0) + curr.monto;
    acc['Total'] = (acc['Total'] || 0) + curr.monto;
    return acc;
  }, {} as Record<string, number>);

  return (
    <Container className="py-5 mt-5">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <Button variant="outline-secondary" size="sm" onClick={() => navigate('/admin/dashboard')} className="mb-2">
            ← Volver al Panel
          </Button>
          <h1 className="fw-bold text-info">Rendición Mensual</h1>
          <p className="text-muted">Visualización unificada por tipo de pago</p>
        </div>
      </div>

      <Card className="mb-4 shadow-sm border-0">
        <Card.Body>
          <Form onSubmit={handleSearch} className="d-flex gap-3 align-items-end">
            <Form.Group>
              <Form.Label>Mes</Form.Label>
              <Form.Select value={month} onChange={(e) => setMonth(Number(e.target.value))}>
                <option value={1}>Enero</option>
                <option value={2}>Febrero</option>
                <option value={3}>Marzo</option>
                <option value={4}>Abril</option>
                <option value={5}>Mayo</option>
                <option value={6}>Junio</option>
                <option value={7}>Julio</option>
                <option value={8}>Agosto</option>
                <option value={9}>Septiembre</option>
                <option value={10}>Octubre</option>
                <option value={11}>Noviembre</option>
                <option value={12}>Diciembre</option>
              </Form.Select>
            </Form.Group>
            <Form.Group>
              <Form.Label>Año</Form.Label>
              <Form.Control type="number" value={year} onChange={(e) => setYear(Number(e.target.value))} min={2020} max={2050} />
            </Form.Group>
            <Button type="submit" variant="info" className="text-white">Filtrar</Button>
          </Form>
        </Card.Body>
      </Card>

      {error && <Alert variant="danger">{error}</Alert>}

      {loading ? (
        <div className="text-center py-5">
          <Spinner animation="border" variant="info" />
        </div>
      ) : (
        <Row className="g-4">
          <Col md={8}>
            <div className="table-responsive shadow-sm rounded">
              <Table striped bordered hover className="mb-0">
                <thead className="table-dark">
                  <tr>
                    <th>Fecha</th>
                    <th>Nombre y Apellido</th>
                    <th>Tipo de Pago</th>
                    <th className="text-end">Monto</th>
                    <th className="text-center">Comprobante</th>
                  </tr>
                </thead>
                <tbody>
                  {records.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center text-muted py-4">No hay pagos registrados en este mes.</td>
                    </tr>
                  ) : (
                    records.map(record => (
                      <tr key={record.id}>
                        <td><small>{record.fecha.split(' ')[0]}</small></td>
                        <td>{record.nombre}</td>
                        <td>
                          <span className={`badge bg-${record.tipo_pago === 'Pago TIC' ? 'primary' : record.tipo_pago === 'Pago de Patente' ? 'info' : 'success'}`}>
                            {record.tipo_pago}
                          </span>
                        </td>
                        <td className="text-end fw-bold">${record.monto.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</td>
                        <td className="text-center">
                           <Button
                              variant="outline-secondary"
                              size="sm"
                              onClick={() => handleDownloadPdf(record.id)}
                            >
                              PDF
                            </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </Table>
            </div>
          </Col>

          <Col md={4}>
            <Card className="shadow-sm border-0 sticky-top" style={{ top: '100px' }}>
              <Card.Header className="bg-info text-white fw-bold">
                Resumen del Mes
              </Card.Header>
              <Card.Body>
                {Object.keys(summary).length === 0 ? (
                  <p className="text-muted mb-0">Sin datos para resumir.</p>
                ) : (
                  <ul className="list-group list-group-flush">
                    {Object.entries(summary).map(([tipo, monto]) => {
                      if (tipo === 'Total') return null;
                      return (
                        <li key={tipo} className="list-group-item d-flex justify-content-between align-items-center px-0">
                          <span>{tipo}</span>
                          <span className="fw-bold">${monto.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</span>
                        </li>
                      );
                    })}
                    <li className="list-group-item d-flex justify-content-between align-items-center px-0 mt-2 border-top-2 border-dark">
                      <span className="fw-bold fs-5">TOTAL</span>
                      <span className="fw-bold fs-5 text-success">${(summary['Total'] || 0).toLocaleString('es-AR', { minimumFractionDigits: 2 })}</span>
                    </li>
                  </ul>
                )}
              </Card.Body>
            </Card>
          </Col>
        </Row>
      )}
    </Container>
  );
};

export default Rendicion;
