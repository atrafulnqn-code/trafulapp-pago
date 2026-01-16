import React, { useEffect, useState } from 'react';
import { Container, Card, Table, Spinner, Alert, Button, Pagination } from 'react-bootstrap';
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

const AdminRecaudacion: React.FC = () => {
  const navigate = useNavigate();
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchRecords = async (page: number) => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/admin/recaudacion?page=${page}`);
      const data = await response.json();
      if (response.ok) {
        setRecords(data.records);
        setTotalPages(Math.ceil(data.total_records / data.per_page));
      } else {
        setError(data.error || 'Error al cargar registros.');
      }
    } catch (err) {
      setError('Error de conexión.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords(currentPage);
  }, [currentPage]);

  return (
    <Container className="py-5 mt-5" fluid>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div className="d-flex align-items-center">
            <Button variant="outline-secondary" size="sm" onClick={() => navigate('/admin/dashboard')} className="me-3">&larr; Volver</Button>
            <h4 className="fw-bold mb-0">Reporte de Recaudación</h4>
        </div>
        <Button variant="success" size="sm" onClick={() => fetchRecords(currentPage)}>Actualizar</Button>
      </div>

      {error && <Alert variant="danger">{error}</Alert>}

      <Card className="shadow-sm border-0">
        <Card.Body className="p-0">
          <Table responsive hover striped className="mb-0">
            <thead className="bg-light">
              <tr>
                <th>Fecha</th>
                <th>Contribuyente</th>
                <th>Administrativa</th>
                <th>Email</th>
                <th>Subtotal</th>
                <th>Desc.</th>
                <th>Total</th>
                <th>Transferencia</th>
                <th>Conceptos</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={9} className="text-center py-5"><Spinner animation="border" /></td></tr>
              ) : records.length === 0 ? (
                <tr><td colSpan={9} className="text-center py-5">No hay registros encontrados.</td></tr>
              ) : (
                records.map((rec) => (
                  <tr key={rec.id}>
                    <td>{rec.fecha}</td>
                    <td>{rec.contribuyente}</td>
                    <td>{rec.operador}</td>
                    <td>{rec.email}</td>
                    <td>${parseFloat(rec.subtotal || rec.total).toFixed(2)}</td>
                    <td className="text-danger">{rec.descuento ? `${rec.descuento}%` : '-'}</td>
                    <td className="fw-bold text-success">${parseFloat(rec.total).toFixed(2)}</td>
                    <td>{rec.transferencia || '-'}</td>
                    <td>
                        <small className="text-muted" title={rec.detalle}>Ver Detalle</small>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </Table>
        </Card.Body>
        <Card.Footer className="bg-white d-flex justify-content-center py-3">
            <Pagination>
                <Pagination.First onClick={() => setCurrentPage(1)} disabled={currentPage === 1} />
                <Pagination.Prev onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} disabled={currentPage === 1} />
                <Pagination.Item active>{currentPage}</Pagination.Item>
                <Pagination.Next onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} disabled={currentPage === totalPages} />
                <Pagination.Last onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages} />
            </Pagination>
        </Card.Footer>
      </Card>
    </Container>
  );
};

export default AdminRecaudacion;