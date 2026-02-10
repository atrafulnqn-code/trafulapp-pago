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

interface Payment {
  id: number;
  payment_id: string;
  payment_id_external: string | null;
  status: string;
  amount: number;
  currency: string;
  payer_email: string | null;
  created_at: string;
  updated_at: string;
}

interface ApiResponse {
  data: Payment[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

const AdminDBPayments: React.FC = () => {
  const navigate = useNavigate();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 10;

  const fetchPayments = async (page: number, searchTerm: string) => {
    setLoading(true);
    setError(null);
    try {
      const password = localStorage.getItem('adminPassword') || '';
      const response = await axios.get<ApiResponse>(`${API_BASE_URL}/admin/db/payments`, {
        params: { page, limit, search: searchTerm },
        headers: { Authorization: `Bearer ${password}` }
      });

      setPayments(response.data.data);
      setTotal(response.data.total);
      setTotalPages(response.data.total_pages);
      setCurrentPage(response.data.page);
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
    fetchPayments(1, '');
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchPayments(1, search);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    fetchPayments(page, search);
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

  const getStatusBadge = (status: string) => {
    const statusMap: { [key: string]: string } = {
      approved: 'success',
      pending: 'warning',
      rejected: 'danger',
      cancelled: 'secondary'
    };
    return statusMap[status] || 'secondary';
  };

  return (
    <Container className="py-5 mt-5">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <Button variant="outline-secondary" size="sm" onClick={() => navigate('/admin/dashboard')} className="mb-2">
            ← Volver al Panel
          </Button>
          <h1 className="fw-bold text-primary">Tabla: Payments</h1>
          <p className="text-muted">Total de registros: {total}</p>
        </div>
        <Button variant="outline-danger" onClick={handleLogout}>Cerrar Sesión</Button>
      </div>

      <Form onSubmit={handleSearch} className="mb-4">
        <div className="d-flex gap-2">
          <Form.Control
            type="text"
            placeholder="Buscar por payment_id, email, status..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Button type="submit" variant="primary">Buscar</Button>
          {search && (
            <Button
              variant="outline-secondary"
              onClick={() => {
                setSearch('');
                fetchPayments(1, '');
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
        <Alert variant="danger">{error}</Alert>
      )}

      {!loading && !error && (
        <>
          <div className="table-responsive">
            <Table striped bordered hover>
              <thead className="table-dark">
                <tr>
                  <th>ID</th>
                  <th>Payment ID</th>
                  <th>External ID</th>
                  <th>Estado</th>
                  <th>Monto</th>
                  <th>Moneda</th>
                  <th>Email</th>
                  <th>Creado</th>
                </tr>
              </thead>
              <tbody>
                {payments.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center text-muted">
                      No se encontraron registros
                    </td>
                  </tr>
                ) : (
                  payments.map((payment) => (
                    <tr key={payment.id}>
                      <td>{payment.id}</td>
                      <td><small className="font-monospace">{payment.payment_id}</small></td>
                      <td><small className="font-monospace">{payment.payment_id_external || '-'}</small></td>
                      <td>
                        <span className={`badge bg-${getStatusBadge(payment.status)}`}>
                          {payment.status}
                        </span>
                      </td>
                      <td className="text-end">${payment.amount.toFixed(2)}</td>
                      <td>{payment.currency}</td>
                      <td>{payment.payer_email || '-'}</td>
                      <td><small>{formatDate(payment.created_at)}</small></td>
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

export default AdminDBPayments;
