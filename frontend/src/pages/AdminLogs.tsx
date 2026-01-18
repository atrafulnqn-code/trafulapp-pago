import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Container, Row, Col, Card, Table, Spinner, Alert, Button, Pagination } from 'react-bootstrap';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:10000/api';

interface LogRecord {
    id: string;
    timestamp: string;
    level: string;
    source: string;
    message: string;
    related_id?: string;
    details?: string;
}

const AdminLogs: React.FC = () => {
    const [logs, setLogs] = useState<LogRecord[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [currentPage, setCurrentPage] = useState<number>(1);
    const [perPage] = useState<number>(10); // Registros por página
    const [totalPages, setTotalPages] = useState<number>(0);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchLogs = async () => {
            setLoading(true);
            setError(null);
            try {
                const response = await fetch(`${API_BASE_URL}/admin/access_logs?page=${currentPage}&per_page=${perPage}`);
                const result = await response.json(); // La respuesta es un objeto con 'logs', 'total_records', etc.

                if (response.ok) {
                    setLogs(result.logs);
                    setTotalPages(Math.ceil(result.total_records / perPage));
                } else {
                    setError(result.error || 'Error al cargar los logs. Inténtelo de nuevo.');
                    if (response.status === 401) {
                        navigate('/admin');
                    }
                }
            } catch (err) {
                setError('No se pudo conectar con el servidor. Verifique su conexión.');
            } finally {
                setLoading(false);
            }
        };

        fetchLogs();
    }, [navigate, currentPage, perPage]);

    const handlePageChange = (pageNumber: number) => {
        setCurrentPage(pageNumber);
    };

    return (
        <Container className="py-5 mt-5">
            <Row className="justify-content-center">
                <Col lg={12}>
                    <Card className="shadow-lg border-0">
                        <Card.Body className="p-4">
                            <div className="d-flex justify-content-between align-items-center mb-4">
                                <div className="d-flex align-items-center">
                                    <Button variant="outline-secondary" size="sm" onClick={() => navigate('/admin/dashboard')} className="me-3">&larr; Volver</Button>
                                    <h4 className="fw-bold mb-0">Logs del Sistema</h4>
                                </div>
                                <Button variant="primary" size="sm" onClick={() => window.location.reload()}>Refrescar</Button>
                            </div>

                            {error && <Alert variant="danger">{error}</Alert>}

                            {loading ? (
                                <div className="text-center">
                                    <Spinner animation="border" variant="primary" />
                                    <p>Cargando registros de logs...</p>
                                </div>
                            ) : (
                                <>
                                <div className="table-responsive">
                                <Table striped bordered hover size="sm" className="text-nowrap small mb-0">
                                    <thead className="bg-light">
                                        <tr>
                                            <th>Fecha/Hora</th><th>Nivel</th><th>Fuente</th><th>Mensaje</th><th>ID Relacionado</th><th>Detalles</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {logs.length === 0 ? (
                                            <tr>
                                                <td colSpan={6} className="text-center py-3">No se encontraron registros.</td>
                                            </tr>
                                        ) : (
                                            logs.map((log) => (
                                                <tr key={log.id}>
                                                    <td>{log.timestamp ? new Date(log.timestamp).toLocaleString('es-AR') : '-'}</td>
                                                    <td><span className={`badge bg-${log.level === 'ERROR' ? 'danger' : log.level === 'WARNING' ? 'warning' : 'info'}`}>{log.level}</span></td>
                                                    <td>{log.source}</td>
                                                    <td className="text-truncate" style={{maxWidth: '300px'}} title={log.message}>{log.message}</td>
                                                    <td className="font-monospace">{log.related_id || '-'}</td>
                                                    <td className="text-truncate" style={{ maxWidth: '150px' }} title={log.details}>{log.details ? '...' : '-'}</td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </Table>
                                </div>
                                {totalPages > 1 && (
                                    <div className="d-flex justify-content-center mt-3">
                                        <Pagination>
                                            <Pagination.First onClick={() => handlePageChange(1)} disabled={currentPage === 1} />
                                            <Pagination.Prev onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 1} />
                                            {[...Array(totalPages)].map((_, index) => (
                                                <Pagination.Item 
                                                    key={index + 1} 
                                                    active={index + 1 === currentPage} 
                                                    onClick={() => handlePageChange(index + 1)}
                                                >
                                                    {index + 1}
                                                </Pagination.Item>
                                            ))}
                                            <Pagination.Next onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage === totalPages} />
                                            <Pagination.Last onClick={() => handlePageChange(totalPages)} disabled={currentPage === totalPages} />
                                        </Pagination>
                                    </div>
                                )}
                                </>
                            )}
                        </Card.Body>
                    </Card>
                </Col>
            </Row>
        </Container>
    );
};

export default AdminLogs;