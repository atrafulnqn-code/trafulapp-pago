import React, { useEffect, useState } from 'react';
import { Container, Table, Form, Button, Pagination, Spinner, Alert, Badge, Card, Row, Col } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

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

interface CashPayment {
  id: number;
  comprobante_id: string;
  tipo_pago: string;
  fecha_pago: string;
  nombre: string;
  email: string;
  monto_original: number | null;
  descuento: number;
  monto_total: number;
  administrativo: string | null;
  patente: string | null;
  marca: string | null;
  modelo: string | null;
  anio: string | null;
  pdf_enviado: boolean;
  email_status: string | null;
  created_at: string;
}

interface Stats {
  total_registros: number;
  monto_total: number;
  monto_recaudacion: number;
  monto_patente: number;
  emails_enviados: number;
}

interface ApiResponse {
  data: CashPayment[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
  stats: Stats;
}

const AdminDBCashPayments: React.FC = () => {
  const navigate = useNavigate();
  const [records, setRecords] = useState<CashPayment[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [tipoFilter, setTipoFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 10;

  const fetchRecords = async (page: number, searchTerm: string, tipo: string) => {
    setLoading(true);
    setError(null);
    try {
      const password = localStorage.getItem('adminPassword') || '';
      const response = await axios.get<ApiResponse>(`${API_BASE_URL}/admin/db/cash-payments`, {
        params: { page, limit, search: searchTerm, tipo },
        headers: { Authorization: `Bearer ${password}` }
      });

      setRecords(response.data.data);
      setTotal(response.data.total);
      setTotalPages(response.data.total_pages);
      setCurrentPage(response.data.page);
      setStats(response.data.stats);
    } catch (err: any) {
      if (err.response?.status === 401) {
        navigate('/admin');
      } else {
        setError(err.response?.data?.error || 'Error al cargar los datos');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords(1, '', '');
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchRecords(1, search, tipoFilter);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    fetchRecords(page, search, tipoFilter);
  };

  const handleLogout = () => {
    localStorage.removeItem('adminUser');
    localStorage.removeItem('adminPassword');
    navigate('/admin');
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-AR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('es-AR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getTipoBadge = (tipo: string) => {
    return tipo === 'recaudacion' ? 'primary' : 'success';
  };

  const getTipoLabel = (tipo: string) => {
    return tipo === 'recaudacion' ? 'Recaudación' : 'Patente';
  };

  const handleExport = async () => {
    try {
      const password = localStorage.getItem('adminPassword') || '';
      const response = await axios.get<ApiResponse>(`${API_BASE_URL}/admin/db/cash-payments`, {
        params: { page: 1, limit: 10000, search: search, tipo: tipoFilter },
        headers: { Authorization: `Bearer ${password}` }
      });

      const data = response.data.data;
      if (data.length === 0) {
        alert('No hay datos para exportar');
        return;
      }

      // Headers del CSV
      const headers = ['ID', 'Comprobante', 'Tipo', 'Fecha Pago', 'Nombre', 'Email', 'Patente/Vehículo', 'Monto Total', 'Administrativo', 'Registrado'];

      // Filas del CSV
      const rows = data.map(r => [
        r.id,
        r.comprobante_id,
        r.tipo_pago,
        r.fecha_pago,
        r.nombre,
        r.email,
        r.patente || '',
        r.monto_total,
        r.administrativo || '',
        r.created_at
      ]);

      const csvContent = [
        headers.join(';'),
        ...rows.map(row => row.join(';'))
      ].join('\n');

      const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `pagos_efectivo_${new Date().toISOString().slice(0, 10)}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('Error al exportar:', err);
      alert('Error al exportar los datos');
    }
  };

  return (
    <Container fluid className="py-5 mt-5">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <Button variant="outline-secondary" size="sm" onClick={() => navigate('/admin/dashboard')} className="mb-2">
            ← Volver al Panel
          </Button>
          <h1 className="fw-bold text-success">Pagos en Efectivo</h1>
          <p className="text-muted">Registro completo de pagos presenciales</p>
        </div>
        <div className="d-flex gap-2">
          <Button variant="success" onClick={handleExport}>
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" className="bi bi-download me-2" viewBox="0 0 16 16">
              <path d="M.5 9.9a.5.5 0 0 1 .5.5v2.5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-2.5a.5.5 0 0 1 1 0v2.5a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2v-2.5a.5.5 0 0 1 .5-.5z" />
              <path d="M7.646 11.854a.5.5 0 0 0 .708 0l3-3a.5.5 0 0 0-.708-.708L8.5 10.293V1.5a.5.5 0 0 0-1 0v8.793L5.354 8.146a.5.5 0 1 0-.708.708l3 3z" />
            </svg>
            Exportar a Excel
          </Button>
          <Button variant="outline-danger" onClick={handleLogout}>Cerrar Sesión</Button>
        </div>
      </div>

      {/* Estadísticas */}
      {stats && (
        <Row className="mb-4">
          <Col md={3}>
            <Card className="border-0 shadow-sm">
              <Card.Body>
                <div className="text-muted small mb-1">Total Registros</div>
                <h3 className="mb-0 fw-bold">{stats.total_registros}</h3>
              </Card.Body>
            </Card>
          </Col>
          <Col md={3}>
            <Card className="border-0 shadow-sm">
              <Card.Body>
                <div className="text-muted small mb-1">Monto Total</div>
                <h3 className="mb-0 fw-bold text-success">${stats.monto_total.toFixed(2)}</h3>
              </Card.Body>
            </Card>
          </Col>
          <Col md={3}>
            <Card className="border-0 shadow-sm">
              <Card.Body>
                <div className="text-muted small mb-1">Recaudación</div>
                <h4 className="mb-0 fw-bold text-primary">${stats.monto_recaudacion.toFixed(2)}</h4>
              </Card.Body>
            </Card>
          </Col>
          <Col md={3}>
            <Card className="border-0 shadow-sm">
              <Card.Body>
                <div className="text-muted small mb-1">Patentes</div>
                <h4 className="mb-0 fw-bold text-info">${stats.monto_patente.toFixed(2)}</h4>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      )}

      {/* Filtros y búsqueda */}
      <Form onSubmit={handleSearch} className="mb-4">
        <Row>
          <Col md={6}>
            <Form.Control
              type="text"
              placeholder="Buscar por comprobante, nombre, email, patente..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </Col>
          <Col md={3}>
            <Form.Select value={tipoFilter} onChange={(e) => setTipoFilter(e.target.value)}>
              <option value="">Todos los tipos</option>
              <option value="recaudacion">Recaudación</option>
              <option value="patente">Patente</option>
            </Form.Select>
          </Col>
          <Col md={3}>
            <div className="d-flex gap-2">
              <Button type="submit" variant="primary" className="w-100">Buscar</Button>
              {(search || tipoFilter) && (
                <Button
                  variant="outline-secondary"
                  onClick={() => {
                    setSearch('');
                    setTipoFilter('');
                    fetchRecords(1, '', '');
                  }}
                >
                  Limpiar
                </Button>
              )}
            </div>
          </Col>
        </Row>
      </Form>

      {loading && (
        <div className="text-center py-5">
          <Spinner animation="border" variant="primary" />
        </div>
      )}

      {error && (
        <Alert variant="danger">{error}</Alert>
      )}

      {!loading && !error && (
        <>
          <div className="table-responsive">
            <Table striped bordered hover>
              <thead className="table-dark">
                <tr>
                  <th>ID</th>
                  <th>Comprobante</th>
                  <th>Tipo</th>
                  <th>Fecha Pago</th>
                  <th>Nombre</th>
                  <th>Email</th>
                  <th>Patente/Vehículo</th>
                  <th>Monto</th>
                  <th>Desc%</th>
                  <th>Total</th>
                  <th>Administrativo</th>
                  <th>PDF Enviado</th>
                  <th>Registrado</th>
                </tr>
              </thead>
              <tbody>
                {records.length === 0 ? (
                  <tr>
                    <td colSpan={13} className="text-center text-muted">
                      No se encontraron registros
                    </td>
                  </tr>
                ) : (
                  records.map((record) => (
                    <tr key={record.id}>
                      <td>{record.id}</td>
                      <td>
                        <small className="font-monospace">{record.comprobante_id}</small>
                      </td>
                      <td>
                        <Badge bg={getTipoBadge(record.tipo_pago)}>
                          {getTipoLabel(record.tipo_pago)}
                        </Badge>
                      </td>
                      <td>{formatDate(record.fecha_pago)}</td>
                      <td>{record.nombre}</td>
                      <td><small>{record.email}</small></td>
                      <td>
                        {record.patente ? (
                          <div>
                            <strong>{record.patente}</strong><br />
                            <small className="text-muted">
                              {record.marca} {record.modelo} ({record.anio})
                            </small>
                          </div>
                        ) : (
                          <span className="text-muted">-</span>
                        )}
                      </td>
                      <td className="text-end">
                        ${record.monto_original?.toFixed(2) || record.monto_total.toFixed(2)}
                      </td>
                      <td className="text-center">
                        {record.descuento > 0 ? `${record.descuento}%` : '-'}
                      </td>
                      <td className="text-end">
                        <strong className="text-success">${record.monto_total.toFixed(2)}</strong>
                      </td>
                      <td><small>{record.administrativo || '-'}</small></td>
                      <td className="text-center">
                        {record.pdf_enviado ? (
                          <Badge bg="success">✓ Enviado</Badge>
                        ) : (
                          <Badge bg="warning">✗ No enviado</Badge>
                        )}
                        {record.email_status && (
                          <div><small className="text-muted">{record.email_status}</small></div>
                        )}
                      </td>
                      <td><small>{formatDateTime(record.created_at)}</small></td>
                    </tr>
                  ))
                )}
              </tbody>
            </Table>
          </div>

          {totalPages > 1 && (
            <div className="d-flex justify-content-center mt-4">
              <Pagination>
                <Pagination.First onClick={() => handlePageChange(1)} disabled={currentPage === 1} />
                <Pagination.Prev onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 1} />

                {[...Array(totalPages)].map((_, index) => {
                  const page = index + 1;
                  if (
                    page === 1 ||
                    page === totalPages ||
                    (page >= currentPage - 1 && page <= currentPage + 1)
                  ) {
                    return (
                      <Pagination.Item
                        key={page}
                        active={page === currentPage}
                        onClick={() => handlePageChange(page)}
                      >
                        {page}
                      </Pagination.Item>
                    );
                  } else if (page === currentPage - 2 || page === currentPage + 2) {
                    return <Pagination.Ellipsis key={page} disabled />;
                  }
                  return null;
                })}

                <Pagination.Next onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage === totalPages} />
                <Pagination.Last onClick={() => handlePageChange(totalPages)} disabled={currentPage === totalPages} />
              </Pagination>
            </div>
          )}
        </>
      )}
    </Container>
  );
};

export default AdminDBCashPayments;
