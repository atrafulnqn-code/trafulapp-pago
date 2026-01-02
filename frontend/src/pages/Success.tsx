import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Container, Row, Col, Card, Button, Spinner, Alert, ListGroup } from 'react-bootstrap';
import { CheckCircleFill } from 'react-bootstrap-icons';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:10000/api';

const Success: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [paymentDetails, setPaymentDetails] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  console.log("DEBUG Success Page - location.search:", location.search);
  console.log("DEBUG Success Page - location.state:", location.state);

  const paymentId = location.state?.paymentId || 
                  new URLSearchParams(location.search).get('payment_id') ||
                  new URLSearchParams(location.search).get('collection_id') ||
                  new URLSearchParams(location.search).get('preference_id');

  console.log("DEBUG Success Page - Derived paymentId:", paymentId);

  useEffect(() => {
    const fetchPaymentDetails = async () => {
      if (!paymentId) {
        setError("No se encontró el ID de pago.");
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(`${API_BASE_URL}/get_history_by_payment_id/${paymentId}`);
        if (!response.ok) throw new Error('Error al obtener los detalles del pago.');
        const data = await response.json();
        setPaymentDetails(data);
      } catch (err: any) {
        setError(err.message || "Error desconocido al cargar los detalles del pago.");
      } finally {
        setLoading(false);
      }
    };

    fetchPaymentDetails();
  }, [paymentId]);

  const handleDownloadReceipt = () => {
    if (paymentDetails?.id) {
      window.open(`${API_BASE_URL}/receipt/${paymentDetails.id}`, '_blank');
    } else {
      alert("No se pudo generar el comprobante. Intente más tarde.");
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(amount);
  };

  const paymentDate = paymentDetails?.fields?.Timestamp ? new Date(paymentDetails.fields.Timestamp).toLocaleString('es-AR') : 'N/A';
  const totalAmount = paymentDetails?.fields?.Monto ? formatCurrency(paymentDetails.fields.Monto) : formatCurrency(0);
  const mpPaymentId = paymentDetails?.fields?.MP_Payment_ID || '#N/A';
  const estado = paymentDetails?.fields?.Estado || 'Desconocido';

  const renderContent = () => {
    if (loading) {
      return (
        <div className="text-center">
          <Spinner animation="border" variant="primary" className="mb-3" />
          <p className="text-muted">Cargando detalles del pago...</p>
        </div>
      );
    }

    if (error || !paymentDetails) {
      return (
        <Alert variant="danger">
          <Alert.Heading>Error</Alert.Heading>
          <p>{error || "No se encontraron detalles para este pago."}</p>
          <hr />
          <div className="d-flex justify-content-end">
            <Button onClick={() => navigate('/')} variant="outline-danger">
              Volver al Inicio
            </Button>
          </div>
        </Alert>
      );
    }

    return (
        <Card className="shadow-lg text-center">
            <Card.Body className="p-4 p-md-5">
                <CheckCircleFill className="text-success mb-4" size={60} />
                <h1 className="h2 fw-bold text-dark mb-3">¡Pago Realizado con Éxito!</h1>
                <p className="text-muted mb-4">
                    El comprobante ha sido enviado a su correo. La deuda está acreditada en nuestros sistemas.
                </p>
                <Card className="text-start mb-4">
                    <ListGroup variant="flush">
                        <ListGroup.Item className="d-flex justify-content-between align-items-center">
                            <span className="text-muted">Estado</span>
                            <span className="fw-bold text-success">{estado}</span>
                        </ListGroup.Item>
                        <ListGroup.Item className="d-flex justify-content-between align-items-center">
                            <span className="text-muted">Nro. de Operación</span>
                            <span className="fw-mono fw-bold">{mpPaymentId}</span>
                        </ListGroup.Item>
                        <ListGroup.Item className="d-flex justify-content-between align-items-center">
                            <span className="text-muted">Fecha y Hora</span>
                            <span>{paymentDate}</span>
                        </ListGroup.Item>
                        <ListGroup.Item className="d-flex justify-content-between align-items-center">
                            <span className="text-muted">Entidad</span>
                            <span>Comuna de Villa Traful</span>
                        </ListGroup.Item>
                        <ListGroup.Item className="d-flex justify-content-between align-items-center">
                            <span className="h5 mb-0">Monto Total</span>
                            <span className="h4 fw-bold mb-0">{totalAmount}</span>
                        </ListGroup.Item>
                    </ListGroup>
                </Card>
                <div className="d-grid gap-2 d-sm-flex justify-content-sm-center">
                    <Button variant="primary" size="lg" onClick={handleDownloadReceipt}>
                        Descargar Comprobante
                    </Button>
                    <Button variant="outline-secondary" size="lg" onClick={() => navigate('/')}>
                        Volver al Inicio
                    </Button>
                </div>
            </Card.Body>
        </Card>
    );
  };
  
  return (
    <Container className="py-5">
      <Row className="justify-content-center">
        <Col md={10} lg={8}>
          {renderContent()}
        </Col>
      </Row>
    </Container>
  );
};

export default Success;