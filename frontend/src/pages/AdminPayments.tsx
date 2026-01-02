import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Container, Row, Col, Card, Table, Spinner, Alert, Button } from 'react-bootstrap';
import { json } from 'stream/consumers';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:10000/api';

interface PaymentRecord {
    id: string;
    estado: string;
    monto: number;
    detalle: string;
    mp_payment_id: string;
    timestamp: string;
    items_pagados_json: string;
    payment_type: string; // Nuevo campo
}

const AdminPayments: React.FC = () => {
    const [payments, setPayments] = useState<PaymentRecord[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const navigate = useNavigate();

    // En una aplicación real, aquí se verificaría la sesión del administrador
    // Por ahora, solo se asume que si se llegó aquí, el login fue exitoso.
    // Podríamos usar sessionStorage o localStorage para un token simple.

    useEffect(() => {
        const fetchPayments = async () => {
            setLoading(true);
            setError(null);
            try {
                const response = await fetch(`${API_BASE_URL}/admin/payments`);
                const data = await response.json();

                if (response.ok) {
                    setPayments(data);
                } else {
                    setError(data.error || 'Error al cargar los pagos. Inténtelo de nuevo.');
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

        fetchPayments();
    }, [navigate]);

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
                            <h3 className="text-center fw-bold mb-4">Panel de Pagos Administrador</h3>
                            {error && <Alert variant="danger">{error}</Alert>}
                            <div className="text-end mb-3">
                                <Button variant="info" onClick={() => navigate('/admin/logs')} className="me-2">
                                    Ver Logs
                                </Button>
                                <Button variant="outline-secondary" onClick={() => navigate('/')}>
                                    Volver al Inicio
                                </Button>
                            </div>

                            {loading ? (
                                <div className="text-center">
                                    <Spinner animation="border" variant="primary" />
                                    <p>Cargando registros de pago...</p>
                                </div>
                            ) : (
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
                                                                                        <td>{payment.timestamp ? new Date(payment.timestamp).toLocaleString('es-AR') : 'N/A'}</td>
                                                                                        <td>{payment.estado}</td>
                                                                                        <td>{payment.payment_type}</td>
                                                                                        <td>{payment.detalle}</td>
                                                    <td>{parseItemsPagados(payment.items_pagados_json)}</td>
                                                    <td>{payment.mp_payment_id}</td>
                                                    <td className="text-end">{formatCurrency(payment.monto)}</td>
                                                    <td>
                                                        {/* Aquí se pueden añadir botones de acción como ver detalles, reenviar email, etc. */}
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
                            )}
                        </Card.Body>
                    </Card>
                </Col>
            </Row>
        </Container>
    );
};

export default AdminPayments;