import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Container, Row, Col, Card, Table, Spinner, Alert, Button, Pagination } from 'react-bootstrap';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:10000/api';

interface PaymentRecord {
    id: string;
    estado: string;
    monto: number;
    detalle: string;
    mp_payment_id: string;
    timestamp: string;
    items_pagados_json: string;
    payment_type: string;
    contribuyente?: string; // Nuevo campo opcional
    contribuyente_dni?: string; // Nuevo campo opcional
}

const AdminPayments: React.FC = () => {
    const [payments, setPayments] = useState<PaymentRecord[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [currentPage, setCurrentPage] = useState<number>(1);
    const [perPage] = useState<number>(10); // Registros por página
    const [totalPages, setTotalPages] = useState<number>(0);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchPayments = async () => {
            setLoading(true);
            setError(null);
            try {
                const response = await fetch(`${API_BASE_URL}/admin/payments_history?page=${currentPage}&per_page=${perPage}`);
                const result = await response.json(); // La respuesta es un objeto con 'payments', 'total_records', etc.

                if (response.ok) {
                    setPayments(result.payments);
                    setTotalPages(Math.ceil(result.total_records / perPage));
                } else {
                    setError(result.error || 'Error al cargar los pagos. Inténtelo de nuevo.');
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

        fetchPayments();
    }, [navigate, currentPage, perPage]);

    const handlePageChange = (pageNumber: number) => {
        setCurrentPage(pageNumber);
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(amount);
    };

    const parseItemsPagados = (jsonString: string) => {
        try {
            const items = JSON.parse(jsonString);
            if (Array.isArray(items)) {
                return items.map(item => item.description).join(', ');
            }
        } catch (e) {
            console.error("Error parsing ItemsPagadosJSON:", e);
        }
        return jsonString; // Fallback
    }

    return (
        <Container className="py-5 mt-5">
            <Row className="justify-content-center">
                <Col lg={12}>
                    <Card className="shadow-lg border-0">
                        <Card.Body className="p-4">
                            <div className="d-flex justify-content-between align-items-center mb-4">
                                <div className="d-flex align-items-center">
                                    <Button variant="outline-secondary" size="sm" onClick={() => navigate('/admin/dashboard')} className="me-3">&larr; Volver</Button>
                                    <h4 className="fw-bold mb-0">Historial de Pagos</h4>
                                </div>
                                <Button variant="primary" size="sm" onClick={() => window.location.reload()}>Refrescar</Button>
                            </div>
                            
                            {error && <Alert variant="danger">{error}</Alert>}
                            <div className="text-end mb-3">
                                {/* ... other buttons if needed ... */}
                            </div>

                            {loading ? (
                                <div className="text-center">
                                    <Spinner animation="border" variant="primary" />
                                    <p>Cargando registros de pago...</p>
                                </div>
                            ) : (
                                <>
                                <div className="table-responsive">
                                <Table striped bordered hover size="sm" className="text-nowrap small mb-0">
                                    <thead className="bg-light">
                                        <tr>
                                            <th>Fecha</th><th>Estado</th><th>Tipo</th><th>Contribuyente</th><th>DNI</th><th>Detalle</th><th>Conceptos</th><th>ID MP</th><th className="text-end">Monto</th><th>Acción</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {payments.length === 0 ? (
                                            <tr>
                                                <td colSpan={10} className="text-center py-3">No se encontraron registros.</td>
                                            </tr>
                                        ) : (
                                            payments.map((payment) => (
                                                <tr key={payment.id}>
                                                    <td>
                                                        {payment.timestamp ? new Date(payment.timestamp).toLocaleString('es-AR') : '-'}
                                                    </td>
                                                    <td><span className={`badge bg-${payment.estado === 'approved' || payment.estado.includes('Exitoso') ? 'success' : 'secondary'}`}>{payment.estado}</span></td>
                                                    <td>{payment.payment_type}</td>
                                                    <td>{payment.contribuyente || '-'}</td>
                                                    <td>{payment.contribuyente_dni || '-'}</td>
                                                    <td className="text-truncate" style={{maxWidth: '200px'}} title={payment.detalle}>{payment.detalle}</td>
                                                    <td className="text-truncate" style={{maxWidth: '200px'}} title={parseItemsPagados(payment.items_pagados_json)}>{parseItemsPagados(payment.items_pagados_json)}</td>
                                                    <td className="font-monospace">{payment.mp_payment_id}</td>
                                                    <td className="text-end fw-bold">{formatCurrency(payment.monto)}</td>
                                                    <td>
                                                        {payment.mp_payment_id && payment.mp_payment_id.startsWith('SIM_') && (
                                                            <Button variant="outline-info" size="sm" className="py-0" onClick={() => navigate(`/exito`, { state: { paymentId: payment.mp_payment_id }})}>
                                                                Ver
                                                            </Button>
                                                        )}
                                                    </td>
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

export default AdminPayments;