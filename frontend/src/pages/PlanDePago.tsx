import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Container, Row, Col, Card, Button, Form, Spinner, Alert, Table } from 'react-bootstrap';

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

interface Cuota {
    numero: number;
    monto: number;
    pagada: boolean;
    estado_texto?: string;
}

interface PlanPagoData {
    id: string;
    nombre_apellido: string;
    plan: string;
    periodo: string;
    monto_total_cuota: number;
    cantidad_cuotas: number;
    cuotas: Cuota[];
}

const PlanDePago: React.FC = () => {
    const navigate = useNavigate();
    const [nombreBusqueda, setNombreBusqueda] = useState('');
    const [loadingBusqueda, setLoadingBusqueda] = useState(false);
    const [errorBusqueda, setErrorBusqueda] = useState<string | null>(null);
    const [resultados, setResultados] = useState<PlanPagoData[]>([]);

    const [procesandoPago, setProcesandoPago] = useState<string | null>(null);
    const [cuotasSeleccionadas, setCuotasSeleccionadas] = useState<{[key: string]: number[]}>({});

    const toggleCuota = (planId: string, cuotaNumero: number) => {
        setCuotasSeleccionadas(prev => {
            const planCuotas = prev[planId] || [];
            if (planCuotas.includes(cuotaNumero)) {
                return { ...prev, [planId]: planCuotas.filter(c => c !== cuotaNumero) };
            } else {
                return { ...prev, [planId]: [...planCuotas, cuotaNumero] };
            }
        });
    };

    const seleccionarTodasPendientes = (plan: PlanPagoData) => {
        const cuotasPendientes = plan.cuotas.filter(c => !c.pagada).map(c => c.numero);
        setCuotasSeleccionadas(prev => ({ ...prev, [plan.id]: cuotasPendientes }));
    };

    const limpiarSeleccion = (planId: string) => {
        setCuotasSeleccionadas(prev => ({ ...prev, [planId]: [] }));
    };

    const buscarPlan = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoadingBusqueda(true);
        setErrorBusqueda(null);
        setResultados([]);

        try {
            const response = await fetch(`${API_BASE_URL}/search/plan_pago?nombre_apellido=${encodeURIComponent(nombreBusqueda)}`);
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'No se pudo obtener la información.');
            }

            setResultados(data.resultados);
        } catch (err: any) {
            setErrorBusqueda(err.message);
        } finally {
            setLoadingBusqueda(false);
        }
    };

    const iniciarPagoCuota = async (plan: PlanPagoData, cuota: Cuota) => {
        setProcesandoPago(`${plan.id}-${cuota.numero}`);
        setErrorBusqueda(null);

        try {
            const payoutData = {
                title: `Plan ${plan.plan} - Cuota ${cuota.numero}`,
                unit_price: cuota.monto,
                items_to_pay: {
                    item_type: 'plan_pago',
                    record_id: plan.id,
                    nombre_contribuyente: plan.nombre_apellido,
                    cuota_numero: cuota.numero,
                    periodo: plan.periodo,
                    plan: plan.plan
                }
            };

            const response = await fetch(`${API_BASE_URL}/create_pagotic_payment`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payoutData)
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Error al iniciar el pago.');
            }

            if (data.init_point) {
                window.location.href = data.init_point;
            } else {
                throw new Error('No se recibió enlace de pago.');
            }

        } catch (err: any) {
            setErrorBusqueda(`Error al procesar el pago: ${err.message}`);
            setProcesandoPago(null);
        }
    };

    const iniciarPagoMultiple = async (plan: PlanPagoData) => {
        const cuotas = cuotasSeleccionadas[plan.id] || [];
        if (cuotas.length === 0) return;

        const cuotasData = plan.cuotas.filter(c => cuotas.includes(c.numero));
        const totalMonto = cuotasData.reduce((sum, c) => sum + c.monto, 0);

        setProcesandoPago(`${plan.id}-multiple`);
        setErrorBusqueda(null);

        try {
            const payoutData = {
                title: `Plan ${plan.plan} - ${cuotas.length} Cuotas`,
                unit_price: totalMonto,
                items_to_pay: {
                    item_type: 'plan_pago_multiple',
                    record_id: plan.id,
                    nombre_contribuyente: plan.nombre_apellido,
                    cuota_numeros: cuotas,
                    periodo: plan.periodo,
                    plan: plan.plan
                }
            };

            const response = await fetch(`${API_BASE_URL}/create_pagotic_payment`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payoutData)
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Error al iniciar el pago.');
            }

            if (data.init_point) {
                window.location.href = data.init_point;
            } else {
                throw new Error('No se recibió enlace de pago.');
            }

        } catch (err: any) {
            setErrorBusqueda(`Error al procesar el pago: ${err.message}`);
            setProcesandoPago(null);
        }
    };

    return (
        <Container className="py-5 mt-5" style={{ minHeight: '70vh' }}>
            <Row className="justify-content-center">
                <Col lg={10} xl={8}>
                    <Card className="shadow-lg border-0 mb-4">
                        <Card.Body className="p-4 p-md-5">
                            <div className="text-center mb-4">
                                <div className="d-inline-block p-4 bg-primary bg-opacity-10 rounded-circle mb-3">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" fill="currentColor" className="bi bi-search text-primary" viewBox="0 0 16 16">
                                        <path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001c.03.04.062.078.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1.007 1.007 0 0 0-.115-.1zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0z" />
                                    </svg>
                                </div>
                                <h2 className="fw-bold">Consulta de Plan de Pago</h2>
                                <p className="text-muted">Ingrese su nombre y apellido para buscar sus planes de pago activos.</p>
                            </div>

                            <Form onSubmit={buscarPlan} className="mb-4">
                                <Row className="g-3 justify-content-center">
                                    <Col md={8}>
                                        <Form.Control
                                            type="text"
                                            size="lg"
                                            placeholder="Ej: Juan Perez"
                                            value={nombreBusqueda}
                                            onChange={(e) => setNombreBusqueda(e.target.value)}
                                            required
                                        />
                                    </Col>
                                    <Col md={4} className="d-grid">
                                        <Button variant="primary" size="lg" type="submit" disabled={loadingBusqueda}>
                                            {loadingBusqueda ? (
                                                <><Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" className="me-2" /> Buscando...</>
                                            ) : (
                                                'Buscar'
                                            )}
                                        </Button>
                                    </Col>
                                </Row>
                            </Form>

                            {errorBusqueda && (
                                <Alert variant="danger" className="mt-3">
                                    {errorBusqueda}
                                </Alert>
                            )}
                        </Card.Body>
                    </Card>

                    {resultados.length > 0 && (
                        <div className="mt-4">
                            <h3 className="h4 fw-bold mb-3">Resultados encontrados ({resultados.length})</h3>
                            {resultados.map((plan) => (
                                <Card key={plan.id} className="shadow-sm border-0 mb-4 border-start border-primary border-4">
                                    <Card.Header className="bg-white py-3">
                                        <div className="d-flex justify-content-between align-items-center flex-wrap">
                                            <div>
                                                <h4 className="h5 mb-1 text-primary">{plan.nombre_apellido}</h4>
                                                <span className="badge bg-secondary me-2">Plan: {plan.plan}</span>
                                                <span className="badge bg-light text-dark border">Periodo: {plan.periodo}</span>
                                            </div>
                                            <div className="text-md-end mt-2 mt-md-0">
                                                <small className="text-muted d-block">Cuotas totales: {plan.cantidad_cuotas}</small>
                                            </div>
                                        </div>
                                    </Card.Header>
                                    <Card.Body className="p-0">
                                        <div className="px-3 py-2 bg-light border-bottom d-flex justify-content-between align-items-center">
                                            <div>
                                                <Button 
                                                    variant="outline-primary" 
                                                    size="sm" 
                                                    className="me-2"
                                                    onClick={() => seleccionarTodasPendientes(plan)}
                                                >
                                                    Seleccionar todas pendientes
                                                </Button>
                                                <Button 
                                                    variant="outline-secondary" 
                                                    size="sm"
                                                    onClick={() => limpiarSeleccion(plan.id)}
                                                >
                                                    Limpiar selección
                                                </Button>
                                            </div>
                                            {(() => {
                                                const sel = cuotasSeleccionadas[plan.id] || [];
                                                const pendientes = plan.cuotas.filter(c => !c.pagada);
                                                const montoTotal = pendientes.filter(c => sel.includes(c.numero)).reduce((sum, c) => sum + c.monto, 0);
                                                if (sel.length > 0) {
                                                    return (
                                                        <div className="text-end">
                                                            <span className="me-3 fw-semibold">
                                                                {sel.length} cuota(s): ${montoTotal.toFixed(2)}
                                                            </span>
                                                            <Button
                                                                variant="success"
                                                                size="sm"
                                                                disabled={procesandoPago !== null}
                                                                onClick={() => iniciarPagoMultiple(plan)}
                                                            >
                                                                {procesandoPago === `${plan.id}-multiple` ? (
                                                                    <><Spinner as="span" animation="border" size="sm" aria-hidden="true" /> Procesando</>
                                                                ) : (
                                                                    'Pagar Seleccionadas'
                                                                )}
                                                            </Button>
                                                        </div>
                                                    );
                                                }
                                                return null;
                                            })()}
                                        </div>
                                        <Table responsive className="mb-0 align-middle">
                                            <thead className="bg-light">
                                                <tr>
                                                    <th className="px-4 py-3" style={{width: '50px'}}>✓</th>
                                                    <th className="py-3">Cuota #</th>
                                                    <th className="py-3">Monto</th>
                                                    <th className="py-3 text-center">Estado</th>
                                                    <th className="px-4 py-3 text-end">Acción</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {plan.cuotas.length > 0 ? (
                                                    plan.cuotas.map((cuota) => {
                                                        const isSelected = (cuotasSeleccionadas[plan.id] || []).includes(cuota.numero);
                                                        return (
                                                            <tr key={cuota.numero} className={`${cuota.pagada ? 'table-light' : ''} ${isSelected ? 'table-primary' : ''}`}>
                                                                <td className="px-4">
                                                                    {!cuota.pagada && (
                                                                        <Form.Check
                                                                            type="checkbox"
                                                                            checked={isSelected}
                                                                            onChange={() => toggleCuota(plan.id, cuota.numero)}
                                                                        />
                                                                    )}
                                                                </td>
                                                                <td className="fw-bold">Cuota {cuota.numero}</td>
                                                                <td className={cuota.pagada ? 'text-muted text-decoration-line-through' : 'fw-semibold text-success'}>
                                                                    ${cuota.monto.toFixed(2)}
                                                                </td>
                                                                <td className="text-center">
                                                                    {cuota.pagada ? (
                                                                        <span className="badge bg-success bg-opacity-10 text-success px-2 py-1">
                                                                            <i className="bi bi-check-circle me-1"></i> {cuota.estado_texto || 'Pagada'}
                                                                        </span>
                                                                    ) : (
                                                                        <span className="badge bg-warning bg-opacity-10 text-warning px-2 py-1">
                                                                            Pendiente
                                                                        </span>
                                                                    )}
                                                                </td>
                                                                <td className="px-4 text-end">
                                                                    <Button
                                                                        variant="outline-primary"
                                                                        size="sm"
                                                                        disabled={cuota.pagada || procesandoPago !== null}
                                                                        onClick={() => iniciarPagoCuota(plan, cuota)}
                                                                    >
                                                                        {procesandoPago === `${plan.id}-${cuota.numero}` ? (
                                                                            <><Spinner as="span" animation="border" size="sm" aria-hidden="true" /> Procesando</>
                                                                        ) : cuota.pagada ? (
                                                                            'Abonado'
                                                                        ) : (
                                                                            'Pagar Ahora'
                                                                        )}
                                                                    </Button>
                                                                </td>
                                                            </tr>
                                                        );
                                                    })
                                                ) : (
                                                    <tr>
                                                        <td colSpan={5} className="text-center py-4 text-muted">
                                                            No se encontraron cuotas registradas para este plan.
                                                        </td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </Table>
                                    </Card.Body>
                                </Card>
                            ))}
                        </div>
                    )}

                    <div className="text-center mt-4">
                        <Button variant="outline-secondary" onClick={() => navigate('/')}>
                            ← Volver al inicio
                        </Button>
                    </div>
                </Col>
            </Row>
        </Container>
    );
};

export default PlanDePago;
