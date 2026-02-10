import React, { useEffect, useState } from 'react';
import { Container, Table, Form, Button, Pagination, Spinner, Alert } from 'react-bootstrap';
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

interface PaymentHistory {
  id: number;
  payment_id: string;
  comprobante_numero: string | null;
  nombre_apellido: string;
  dni: string;
  email: string | null;
  monto: number;
  estado: string;
  fecha_hora: string;
  created_at: string;
}

interface ApiResponse {
  data: PaymentHistory[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

const AdminDBPaymentHistory: React.FC = () => {
  const navigate = useNavigate();
  const [records, setRecords] = useState<PaymentHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 10;

  const fetchRecords = async (page: number, searchTerm: string) => {
    setLoading(true);
    setError(null);
    try {
      const password = localStorage.getItem('adminPassword') || '';
      console.log('Fetching payment history with password:', password ? 'Password exists' : 'No password found');
      console.log('API URL:', `${API_BASE_URL}/admin/db/payment-history`);

      const response = await axios.get<ApiResponse>(`${API_BASE_URL}/admin/db/payment-history`, {
        params: { page, limit, search: searchTerm },
        headers: { Authorization: `Bearer ${password}` }
      });

      console.log('Response received:', response.data);
      setRecords(response.data.data);
      setTotal(response.data.total);
      setTotalPages(response.data.total_pages);
      setCurrentPage(response.data.page);
    } catch (err: any) {
      console.error('Error fetching payment history:', err);
      console.error('Error response:', err.response);

      if (err.response?.status === 401) {
        setError('Sesión expirada o no autorizada. Por favor, vuelve a iniciar sesión.');
        // Esperar 3 segundos antes de redirigir para que el usuario pueda ver el mensaje
        setTimeout(() => {
          navigate('/admin');
        }, 3000);
      } else {
        setError(err.response?.data?.error || err.message || 'Error al cargar los datos. Por favor, intenta de nuevo.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    console.log('AdminDBPaymentHistory mounted, checking authentication...');
    const password = localStorage.getItem('adminPassword');
    if (!password) {
      console.warn('No admin password found in localStorage');
      setError('No se encontró sesión activa. Por favor, inicia sesión nuevamente.');
      setTimeout(() => {
        navigate('/admin');
      }, 2000);
      return;
    }
    fetchRecords(1, '');
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchRecords(1, search);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    fetchRecords(page, search);
  };

  const handleLogout = () => {
    localStorage.removeItem('adminUser');
    localStorage.removeItem('adminPassword');
    navigate('/admin');
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('es-AR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getEstadoBadge = (estado: string) => {
    return estado === 'exitoso' ? 'success' : 'danger';
  };

  return (
    <Container className="py-5 mt-5">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <Button variant="outline-secondary" size="sm" onClick={() => navigate('/admin/dashboard')} className="mb-2">
            ← Volver al Panel
          </Button>
          <h1 className="fw-bold text-primary">Tabla: Payment History</h1>
          <p className="text-muted">Total de registros: {total}</p>
        </div>
        <Button variant="outline-danger" onClick={handleLogout}>Cerrar Sesión</Button>
      </div>

      <Form onSubmit={handleSearch} className="mb-4">
        <div className="d-flex gap-2">
          <Form.Control
            type="text"
            placeholder="Buscar por payment_id, nombre, DNI, email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Button type="submit" variant="primary">Buscar</Button>
          {search && (
            <Button
              variant="outline-secondary"
              onClick={() => {
                setSearch('');
                fetchRecords(1, '');
              }}
            >
              Limpiar
            </Button>
          )}
        </div>
      </Form>

      {loading && (
        <div className="text-center py-5">
          <Spinner animation="border" variant="primary" />
        </div>
      )}

      {error && (
        <Alert variant="danger" className="d-flex justify-content-between align-items-center">
          <span>{error}</span>
          {!error.includes('Sesión expirada') && !error.includes('No se encontró sesión') && (
            <Button
              variant="outline-danger"
              size="sm"
              onClick={() => fetchRecords(currentPage, search)}
            >
              Reintentar
            </Button>
          )}
        </Alert>
      )}

      {!loading && !error && (
        <>
          <div className="table-responsive">
            <Table striped bordered hover>
              <thead className="table-dark">
                <tr>
                  <th>ID</th>
                  <th>Payment ID</th>
                  <th>Comprobante</th>
                  <th>Nombre</th>
                  <th>DNI</th>
                  <th>Email</th>
                  <th>Monto</th>
                  <th>Estado</th>
                  <th>Fecha</th>
                </tr>
              </thead>
              <tbody>
                {records.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="text-center text-muted">
                      No se encontraron registros
                    </td>
                  </tr>
                ) : (
                  records.map((record) => (
                    <tr key={record.id}>
                      <td>{record.id}</td>
                      <td><small className="font-monospace">{record.payment_id}</small></td>
                      <td>{record.comprobante_numero || '-'}</td>
                      <td>{record.nombre_apellido}</td>
                      <td>{record.dni}</td>
                      <td>{record.email || '-'}</td>
                      <td className="text-end">
                        ${record.monto != null && !isNaN(record.monto) ? Number(record.monto).toFixed(2) : '0.00'}
                      </td>
                      <td>
                        <span className={`badge bg-${getEstadoBadge(record.estado)}`}>
                          {record.estado}
                        </span>
                      </td>
                      <td><small>{formatDate(record.fecha_hora)}</small></td>
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

export default AdminDBPaymentHistory;
