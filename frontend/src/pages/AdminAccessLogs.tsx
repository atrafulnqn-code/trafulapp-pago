import React, { useEffect, useState } from 'react';
import { Container, Card, Table, Spinner, Alert, Button, Pagination, Badge } from 'react-bootstrap';
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

const AdminAccessLogs: React.FC = () => {
  const navigate = useNavigate();
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchLogs = async (page: number) => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/admin/access_logs?page=${page}`);
      const data = await response.json();
      if (response.ok) {
        setLogs(data.logs);
        setTotalPages(Math.ceil(data.total_records / data.per_page));
      } else {
        setError(data.error || 'Error al cargar registros de acceso.');
      }
    } catch (err) {
      setError('Error de conexión.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs(currentPage);
  }, [currentPage]);

  return (
    <Container className="py-5 mt-5" fluid>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div className="d-flex align-items-center">
            <Button variant="outline-secondary" size="sm" onClick={() => navigate('/admin/dashboard')} className="me-3">&larr; Volver</Button>
            <h4 className="fw-bold mb-0">Accesos de Personal</h4>
        </div>
        <Button variant="primary" size="sm" onClick={() => fetchLogs(currentPage)}>Refrescar</Button>
      </div>

      {error && <Alert variant="danger">{error}</Alert>}

      <Card className="shadow-sm border-0">
        <Card.Body className="p-0">
          <Table responsive hover striped className="mb-0">
            <thead className="bg-light">
              <tr>
                <th>Fecha</th>
                <th>Hora</th>
                <th>Usuario</th>
                <th>IP</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="text-center py-5"><Spinner animation="border" /></td></tr>
              ) : logs.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-5">No hay registros de acceso recientes.</td></tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id}>
                    <td>{log.fecha}</td>
                    <td>{log.hora}</td>
                    <td className="fw-bold">{log.usuario}</td>
                    <td className="font-monospace text-muted">{log.ip}</td>
                    <td><Badge bg="success">Acceso Correcto</Badge></td>
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

export default AdminAccessLogs;