import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Container, Row, Col, Card, Table, Spinner, Alert, Button } from 'react-bootstrap';

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
    const navigate = useNavigate();

    useEffect(() => {
        const fetchLogs = async () => {
            setLoading(true);
            setError(null);
            try {
                const response = await fetch(`${API_BASE_URL}/admin/logs`);
                const data = await response.json();

                if (response.ok) {
                    setLogs(data);
                } else {
                    setError(data.error || 'Error al cargar los logs. Inténtelo de nuevo.');
                    // Si hay un error de autenticación (ej. 401), redirigir al login
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
    }, [navigate]);

    return (
        <Container className="py-5">
            <Row className="justify-content-center">
                <Col lg={12}>
                    <Card className="shadow-lg">
                        <Card.Body className="p-4 p-md-5">
                            <h3 className="text-center fw-bold mb-4">Panel de Logs Administrador</h3>
                            {error && <Alert variant="danger">{error}</Alert>}
                            <div className="text-end mb-3">
                                <Button variant="outline-secondary" onClick={() => navigate('/admin/payments')}>
                                    Volver a Pagos
                                </Button>
                            </div>

                            {loading ? (
                                <div className="text-center">
                                    <Spinner animation="border" variant="primary" />
                                    <p>Cargando registros de logs...</p>
                                </div>
                            ) : (
                                <Table striped bordered hover responsive className="text-nowrap">
                                    <thead>
                                        <tr>
                                            <th>Fecha/Hora</th><th>Nivel</th><th>Fuente</th><th>Mensaje</th><th>ID Relacionado</th><th>Detalles</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {logs.length === 0 ? (
                                            <tr>
                                                <td colSpan={6} className="text-center">No se encontraron registros de logs.</td>
                                            </tr>
                                        ) : (
                                            logs.map((log) => (
                                                <tr key={log.id}>
                                                    <td>{log.timestamp ? new Date(log.timestamp).toLocaleString('es-AR') : 'N/A'}</td>
                                                    <td>{log.level}</td>
                                                    <td>{log.source}</td>
                                                    <td>{log.message}</td>
                                                    <td>{log.related_id || 'N/A'}</td>
                                                    <td className="text-break" style={{ maxWidth: '200px' }}>{log.details ? JSON.stringify(JSON.parse(log.details), null, 2) : 'N/A'}</td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </Table>
                            )}
                        </Card.Body>
                    </Card>
                </Col>
            </Row>
        </Container>
    );
};

export default AdminLogs;