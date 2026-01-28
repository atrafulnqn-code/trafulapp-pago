import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Container, Row, Col, Card, Table, Spinner, Alert, Button, Pagination } from 'react-bootstrap';

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

interface PaymentRecord {
    id: string;
    fecha_transaccion: string;
    timestamp: string;
    estado: string;
    mp_payment_id: string;
    items_pagados_json: string;
    comprobante_status: string;
    link_comprobante: string;
    contribuyente: string;
    contribuyente_dni: string;
    monto: number;
    detalle: string;
    payment_type: string;
}

const AdminPayments: React.FC = () => {
    const [payments, setPayments] = useState<PaymentRecord[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [currentPage, setCurrentPage] = useState<number>(1);
    const [perPage] = useState<number>(20); // Registros por página
    const [totalPages, setTotalPages] = useState<number>(0);
    const navigate = useNavigate();

    const getPageNumbers = () => {
        const pages: (number | string)[] = [];
        const maxVisible = 7; // Máximo de números de página visibles

        if (totalPages <= maxVisible) {
            // Mostrar todas las páginas si son pocas
            for (let i = 1; i <= totalPages; i++) {
                pages.push(i);
            }
        } else {
            // Mostrar páginas alrededor de la actual
            const leftSide = currentPage - 2;
            const rightSide = currentPage + 2;

            // Siempre mostrar primera página
            pages.push(1);

            if (leftSide > 2) {
                pages.push('...');
            }

            // Páginas alrededor de la actual
            for (let i = Math.max(2, leftSide); i <= Math.min(totalPages - 1, rightSide); i++) {
                pages.push(i);
            }

            if (rightSide < totalPages - 1) {
                pages.push('...');
            }

            // Siempre mostrar última página
            if (totalPages > 1) {
                pages.push(totalPages);
            }
        }

        return pages;
    };

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
                                            <th>Fecha de Transacción</th>
                                            <th>Estado</th>
                                            <th>MP Payment ID</th>
                                            <th>Contribuyente</th>
                                            <th>DNI</th>
                                            <th>Conceptos Pagados</th>
                                            <th>Comprobante Status</th>
                                            <th className="text-end">Monto</th>
                                            <th>Acción</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {payments.length === 0 ? (
                                            <tr>
                                                <td colSpan={9} className="text-center py-3">No se encontraron registros.</td>
                                            </tr>
                                        ) : (
                                            payments.map((payment) => (
                                                <tr key={payment.id}>
                                                    <td>
                                                        {payment.fecha_transaccion ? new Date(payment.fecha_transaccion).toLocaleString('es-AR', {
                                                            year: 'numeric',
                                                            month: '2-digit',
                                                            day: '2-digit',
                                                            hour: '2-digit',
                                                            minute: '2-digit'
                                                        }) : (payment.timestamp ? new Date(payment.timestamp).toLocaleString('es-AR', {
                                                            year: 'numeric',
                                                            month: '2-digit',
                                                            day: '2-digit',
                                                            hour: '2-digit',
                                                            minute: '2-digit'
                                                        }) : '-')}
                                                    </td>
                                                    <td>
                                                        <span className={`badge bg-${payment.estado === 'approved' || payment.estado.includes('Exitoso') ? 'success' : payment.estado.includes('Fallido') ? 'danger' : 'secondary'}`}>
                                                            {payment.estado}
                                                        </span>
                                                    </td>
                                                    <td className="font-monospace small">{payment.mp_payment_id}</td>
                                                    <td>{payment.contribuyente !== 'N/A' ? payment.contribuyente : '-'}</td>
                                                    <td>{payment.contribuyente_dni !== 'N/A' ? payment.contribuyente_dni : '-'}</td>
                                                    <td className="text-truncate" style={{maxWidth: '250px'}} title={parseItemsPagados(payment.items_pagados_json)}>
                                                        {parseItemsPagados(payment.items_pagados_json) || '-'}
                                                    </td>
                                                    <td className="small">{payment.comprobante_status !== 'N/A' ? payment.comprobante_status : '-'}</td>
                                                    <td className="text-end fw-bold">{formatCurrency(payment.monto)}</td>
                                                    <td>
                                                        {payment.link_comprobante && payment.link_comprobante !== 'N/A' && (
                                                            <Button
                                                                variant="outline-primary"
                                                                size="sm"
                                                                className="py-0"
                                                                href={payment.link_comprobante}
                                                                target="_blank"
                                                            >
                                                                Ver Comprobante
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
                                            {getPageNumbers().map((page, index) => (
                                                page === '...' ? (
                                                    <Pagination.Ellipsis key={`ellipsis-${index}`} disabled />
                                                ) : (
                                                    <Pagination.Item
                                                        key={page}
                                                        active={page === currentPage}
                                                        onClick={() => handlePageChange(page as number)}
                                                    >
                                                        {page}
                                                    </Pagination.Item>
                                                )
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