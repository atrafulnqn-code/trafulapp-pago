import React, { useEffect, useState } from 'react';
import { Container, Table, Form, Button, Pagination, Spinner, Alert, Badge } from 'react-bootstrap';
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

interface PayslipRequest {
    id: number;
    search_query: string;
    email: string;
    ip_address: string;
    success: boolean;
    created_at: string;
}

interface ApiResponse {
    data: PayslipRequest[];
    total: number;
    page: number;
    limit: number;
    total_pages: number;
}

const AdminDBHRPayslips: React.FC = () => {
    const navigate = useNavigate();
    const [requests, setRequests] = useState<PayslipRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [search, setSearch] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [total, setTotal] = useState(0);
    const limit = 10;

    const fetchRequests = async (page: number, searchTerm: string) => {
        setLoading(true);
        setError(null);
        try {
            const password = localStorage.getItem('adminPassword') || '';
            const response = await axios.get<ApiResponse>(`${API_BASE_URL}/admin/db/hr-payslip-requests`, {
                params: { page, limit, search: searchTerm },
                headers: { Authorization: `Bearer ${password}` }
            });

            setRequests(response.data.data);
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
        fetchRequests(1, '');
    }, []);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        setCurrentPage(1);
        fetchRequests(1, search);
    };

    const handlePageChange = (page: number) => {
        setCurrentPage(page);
        fetchRequests(page, search);
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
                    <h1 className="fw-bold text-primary">Tabla: Solicitud de Recibos</h1>
                    <p className="text-muted">Total de registros: {total}</p>
                </div>
                <Button variant="outline-danger" onClick={handleLogout}>Cerrar Sesión</Button>
            </div>

            <Form onSubmit={handleSearch} className="mb-4">
                <div className="d-flex gap-2">
                    <Form.Control
                        type="text"
                        placeholder="Buscar por query, email o IP..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                    <Button type="submit" variant="primary">Buscar</Button>
                    {search && (
                        <Button
                            variant="outline-secondary"
                            onClick={() => {
                                setSearch('');
                                fetchRequests(1, '');
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
                                    <th>Consulta</th>
                                    <th>Email</th>
                                    <th>IP Address</th>
                                    <th>Resultado</th>
                                    <th>Fecha</th>
                                </tr>
                            </thead>
                            <tbody>
                                {requests.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="text-center text-muted">
                                            No se encontraron registros
                                        </td>
                                    </tr>
                                ) : (
                                    requests.map((req) => (
                                        <tr key={req.id}>
                                            <td>{req.id}</td>
                                            <td>{req.search_query}</td>
                                            <td>{req.email}</td>
                                            <td><small className="font-monospace text-muted">{req.ip_address}</small></td>
                                            <td>
                                                <Badge bg={req.success ? 'success' : 'danger'}>
                                                    {req.success ? 'Encontrado' : 'No encontrado'}
                                                </Badge>
                                            </td>
                                            <td><small>{formatDate(req.created_at)}</small></td>
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

export default AdminDBHRPayslips;
