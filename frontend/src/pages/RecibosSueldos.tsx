import React, { useState } from 'react';
import { Container, Row, Col, Card, Form, Button, Alert, Spinner } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';

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

const RecibosSueldos: React.FC = () => {
    const navigate = useNavigate();
    const [searchQuery, setSearchQuery] = useState('');
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'danger', text: string } | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setMessage(null);

        try {
            const response = await fetch(`${API_BASE_URL}/hr/payslip/send`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    query: searchQuery,
                    email: email,
                }),
            });

            const data = await response.json();

            if (response.ok) {
                setMessage({ type: 'success', text: 'Recibo encontrado exitosamente. Se ha enviado a tu email.' });
                // Limpiar campos después de éxito
                setSearchQuery('');
                setEmail('');
            } else {
                setMessage({ type: 'danger', text: data.error || 'Recibo no encontrado.' });
            }
        } catch (error) {
            console.error('Error:', error);
            setMessage({ type: 'danger', text: 'Error de conexión con el servidor.' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Container className="my-5 pt-5">
            <Row className="justify-content-center mb-4">
                <Col md={8} className="text-center">
                    <Button
                        variant="link"
                        onClick={() => navigate('/recursos-humanos')}
                        className="text-decoration-none text-secondary mb-3 d-flex align-items-center justify-content-center mx-auto"
                    >
                        <i className="bi bi-arrow-left me-2"></i> Volver a Recursos Humanos
                    </Button>
                    <h2 className="fw-bold text-primary mb-3">Recibos de Sueldos</h2>
                    <p className="lead text-secondary">Busca tu recibo por DNI o Nombre y recíbelo directamente en tu correo electrónico.</p>
                </Col>
            </Row>

            <Row className="justify-content-center">
                <Col md={6}>
                    <Card className="shadow-sm border-0">
                        <Card.Body className="p-4">
                            <Form onSubmit={handleSubmit}>
                                <Form.Group className="mb-3" controlId="searchQuery">
                                    <Form.Label className="fw-semibold">Nombre y Apellido o DNI</Form.Label>
                                    <Form.Control
                                        type="text"
                                        placeholder="Ej: Orlando Zannini o 23921087"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        required
                                        disabled={loading}
                                    />
                                    <Form.Text className="text-muted">
                                        Busca igual si escribes en minúsculas o mayúsculas.
                                    </Form.Text>
                                </Form.Group>

                                <Form.Group className="mb-4" controlId="email">
                                    <Form.Label className="fw-semibold">Tu Correo Electrónico</Form.Label>
                                    <Form.Control
                                        type="email"
                                        placeholder="ejemplo@correo.com"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        required
                                        disabled={loading}
                                    />
                                    <Form.Text className="text-muted">
                                        Aquí recibirás el archivo PDF de tu recibo.
                                    </Form.Text>
                                </Form.Group>

                                {message && (
                                    <Alert variant={message.type} className="mb-4">
                                        {message.text}
                                    </Alert>
                                )}

                                <Button
                                    variant="primary"
                                    type="submit"
                                    className="w-100 py-2 fw-bold"
                                    disabled={loading || !searchQuery || !email}
                                >
                                    {loading ? (
                                        <>
                                            <Spinner animation="border" size="sm" className="me-2" />
                                            Buscando y Enviando...
                                        </>
                                    ) : (
                                        'Enviar Recibo de Sueldo'
                                    )}
                                </Button>
                            </Form>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>
        </Container>
    );
};

export default RecibosSueldos;
