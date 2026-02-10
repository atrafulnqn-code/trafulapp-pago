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

interface Contact {
  id: number;
  email: string;
  dni: string | null;
  nombre_apellido: string | null;
  celular: string | null;
  origen: string | null;
  created_at: string;
  updated_at: string;
}

interface ApiResponse {
  data: Contact[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

const AdminDBContacts: React.FC = () => {
  const navigate = useNavigate();
  const [records, setRecords] = useState<Contact[]>([]);
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
      const response = await axios.get<ApiResponse>(`${API_BASE_URL}/admin/db/contacts`, {
        params: { page, limit, search: searchTerm },
        headers: { Authorization: `Bearer ${password}` }
      });

      setRecords(response.data.data);
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

  return (
    <Container className="py-5 mt-5">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <Button variant="outline-secondary" size="sm" onClick={() => navigate('/admin/dashboard')} className="mb-2">
            ← Volver al Panel
          </Button>
          <h1 className="fw-bold text-primary">Tabla: Contacts</h1>
          <p className="text-muted">Total de registros: {total}</p>
        </div>
        <Button variant="outline-danger" onClick={handleLogout}>Cerrar Sesión</Button>
      </div>

      <Form onSubmit={handleSearch} className="mb-4">
        <div className="d-flex gap-2">
          <Form.Control
            type="text"
            placeholder="Buscar por email, DNI, nombre, celular..."
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
        <Alert variant="danger">{error}</Alert>
      )}

      {!loading && !error && (
        <>
          <div className="table-responsive">
            <Table striped bordered hover>
              <thead className="table-dark">
                <tr>
                  <th>ID</th>
                  <th>Email</th>
                  <th>DNI</th>
                  <th>Nombre y Apellido</th>
                  <th>Celular</th>
                  <th>Origen</th>
                  <th>Creado</th>
                  <th>Actualizado</th>
                </tr>
              </thead>
              <tbody>
                {records.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center text-muted">
                      No se encontraron registros
                    </td>
                  </tr>
                ) : (
                  records.map((record) => (
                    <tr key={record.id}>
                      <td>{record.id}</td>
                      <td>{record.email}</td>
                      <td>{record.dni || '-'}</td>
                      <td>{record.nombre_apellido || '-'}</td>
                      <td>{record.celular || '-'}</td>
                      <td>
                        <small className="badge bg-secondary">{record.origen || 'N/A'}</small>
                      </td>
                      <td><small>{formatDate(record.created_at)}</small></td>
                      <td><small>{formatDate(record.updated_at)}</small></td>
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

export default AdminDBContacts;
