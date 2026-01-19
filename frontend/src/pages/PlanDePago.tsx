import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Container, Row, Col, Card, Button } from 'react-bootstrap';

const PlanDePago: React.FC = () => {
    const navigate = useNavigate();
    const whatsappNumber = '5492944556151'; // Formato internacional sin espacios ni guiones

    const handleWhatsAppClick = () => {
        const message = encodeURIComponent('Hola, quiero solicitar un plan de pago.');
        window.open(`https://wa.me/${whatsappNumber}?text=${message}`, '_blank');
    };

    return (
        <Container className="py-5 mt-5" style={{ minHeight: '70vh' }}>
            <Row className="justify-content-center">
                <Col lg={8} xl={6}>
                    <Card className="shadow-lg border-0">
                        <Card.Body className="p-5 text-center">
                            <div className="mb-4">
                                <div className="d-inline-block p-4 bg-warning bg-opacity-10 rounded-circle">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" fill="currentColor" className="bi bi-journal-check text-warning" viewBox="0 0 16 16">
                                        <path fillRule="evenodd" d="M10.854 6.146a.5.5 0 0 1 0 .708l-3 3a.5.5 0 0 1-.708 0l-1.5-1.5a.5.5 0 1 1 .708-.708L7.5 8.793l2.646-2.647a.5.5 0 0 1 .708 0z"/>
                                        <path d="M3 0h10a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2v-1h1v1a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V2a1 1 0 0 0-1-1H3a1 1 0 0 0-1 1v1H1V2a2 2 0 0 1 2-2z"/>
                                        <path d="M1 5v-.5a.5.5 0 0 1 1 0V5h.5a.5.5 0 0 1 0 1h-.5v.5a.5.5 0 0 1-1 0V6h-.5a.5.5 0 0 1 0-1H1z"/>
                                    </svg>
                                </div>
                            </div>

                            <h1 className="display-5 fw-bold mb-4">Solicitar Plan de Pago</h1>

                            <p className="lead text-muted mb-4">
                                Para solicitar un plan de pago personalizado, póngase en contacto con nosotros a través de WhatsApp.
                            </p>

                            <div className="alert alert-info mb-4" role="alert">
                                <strong>Horario de atención:</strong> Lunes a Viernes de 8:00 a 14:00 hs
                            </div>

                            <Button
                                variant="success"
                                size="lg"
                                className="rounded-pill px-5 py-3 fw-bold shadow-lg"
                                onClick={handleWhatsAppClick}
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" className="bi bi-whatsapp me-2" viewBox="0 0 16 16">
                                    <path d="M13.601 2.326A7.854 7.854 0 0 0 7.994 0C3.627 0 .068 3.558.064 7.926c0 1.399.366 2.76 1.057 3.965L0 16l4.204-1.102a7.933 7.933 0 0 0 3.79.965h.004c4.368 0 7.926-3.558 7.93-7.93A7.898 7.898 0 0 0 13.6 2.326zM7.994 14.521a6.573 6.573 0 0 1-3.356-.92l-.24-.144-2.494.654.666-2.433-.156-.251a6.56 6.56 0 0 1-1.007-3.505c0-3.626 2.957-6.584 6.591-6.584a6.56 6.56 0 0 1 4.66 1.931 6.557 6.557 0 0 1 1.928 4.66c-.004 3.639-2.961 6.592-6.592 6.592zm3.615-4.934c-.197-.099-1.17-.578-1.353-.646-.182-.065-.315-.099-.445.099-.133.197-.513.646-.627.775-.114.133-.232.148-.43.05-.197-.1-.836-.308-1.592-.985-.59-.525-.985-1.175-1.103-1.372-.114-.198-.011-.304.088-.403.087-.088.197-.232.296-.346.1-.114.133-.198.198-.33.065-.134.034-.248-.015-.347-.05-.099-.445-1.076-.612-1.47-.16-.389-.323-.335-.445-.34-.114-.007-.247-.007-.38-.007a.729.729 0 0 0-.529.247c-.182.198-.691.677-.691 1.654 0 .977.71 1.916.81 2.049.098.133 1.394 2.132 3.383 2.992.47.205.84.326 1.129.418.475.152.904.129 1.246.08.38-.058 1.171-.48 1.338-.943.164-.464.164-.86.114-.943-.049-.084-.182-.133-.38-.232z"/>
                                </svg>
                                Contactar por WhatsApp
                            </Button>

                            <div className="mt-4">
                                <Button
                                    variant="outline-secondary"
                                    onClick={() => navigate('/')}
                                >
                                    ← Volver al inicio
                                </Button>
                            </div>

                            <div className="mt-5 pt-4 border-top">
                                <p className="text-muted small mb-0">
                                    <strong>Teléfono:</strong> +54 9 2944 55-6151
                                </p>
                            </div>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>
        </Container>
    );
};

export default PlanDePago;
