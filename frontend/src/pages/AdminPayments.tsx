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
                const response = await fetch(`${API_BASE_URL}/admin/payments?page=${currentPage}&per_page=${perPage}`);
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
        <Container className="py-5">
            <Row className="justify-content-center">
                <Col lg={12}>
                    <Card className="shadow-lg">
                        <Card.Body className="p-4 p-md-5">
                            <div className="d-flex justify-content-between align-items-center mb-4">
                                <div className="d-flex align-items-center">
                                    <Button variant="outline-secondary" onClick={() => navigate('/admin/dashboard')} className="me-3">&larr; Volver</Button>
                                    <h3 className="fw-bold mb-0">Historial de Pagos</h3>
                                </div>
                                <Button variant="primary" onClick={() => window.location.reload()}>Refrescar</Button>
                            </div>
                            
                            {error && <Alert variant="danger">{error}</Alert>}

                            {loading ? (
                                <div className="text-center">
                                    <Spinner animation="border" variant="primary" />
                                    <p>Cargando registros de pago...</p>
                                </div>
                            ) : (
                                <>
                                <Table striped bordered hover responsive className="text-nowrap">
                                    <thead>
                                        <tr>
                                            <th>Fecha/Hora</th><th>Estado</th><th>Tipo de Pago</th><th>DNI/Nombre (Detalle)</th><th>Conceptos Pagados</th><th>ID MP</th><th className="text-end">Monto</th><th>Acciones</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {payments.length === 0 ? (
                                            <tr>
                                                <td colSpan={8} className="text-center">No se encontraron registros de pago.</td>
                                            </tr>
                                        ) : (
                                            payments.map((payment) => (
                                                <tr key={payment.id}>
                                                    <td>
                                                        {payment.timestamp ? new Date(payment.timestamp).toLocaleString('es-AR') : 'N/A'}
                                                    </td>
                                                    <td>{payment.estado}</td>
                                                    <td>{payment.payment_type}</td>
                                                    <td>{payment.detalle}</td>
                                                    <td>{parseItemsPagados(payment.items_pagados_json)}</td>
                                                    <td>{payment.mp_payment_id}</td>
                                                    <td className="text-end">{formatCurrency(payment.monto)}</td>
                                                    <td>
                                                        {payment.mp_payment_id && payment.mp_payment_id.startsWith('SIM_') && (
                                                            <Button variant="outline-info" size="sm" onClick={() => navigate(`/exito`, { state: { paymentId: payment.mp_payment_id }})}>
                                                                Ver Simulación
                                                            </Button>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </Table>
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