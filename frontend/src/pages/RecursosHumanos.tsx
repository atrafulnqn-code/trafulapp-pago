import React from 'react';
import { Container, Row, Col, Card, Button } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';

const RecursosHumanos: React.FC = () => {
  const navigate = useNavigate();
  return (
    <Container className="my-5 pt-5">
      <Row className="justify-content-center mb-4">
        <Col md={8} className="text-center">
          <h2 className="fw-bold text-primary mb-3">Recursos Humanos</h2>
          <p className="lead text-secondary">Aquí se gestionarán los módulos relacionados con el personal de la Comuna.</p>
        </Col>
      </Row>
      <Row className="justify-content-center g-4">
        <Col md={6} lg={3}>
          <Card className="shadow-sm h-100 text-center">
            <Card.Body className="d-flex flex-column justify-content-between py-4">
              <h5 className="card-title text-success fw-bold mb-2">Certificado Médico</h5>
              <Card.Text className="text-muted mb-3 flex-grow-1">
                Gestiona y solicita tus certificados de salud laboral.
              </Card.Text>
              <a href="https://geoarg.com/?ff_landing=21" target="_blank" rel="noopener noreferrer" className="btn btn-outline-success w-100 mt-3 fw-semibold">
                Acceder al formulario
              </a>
            </Card.Body>
          </Card>
        </Col>
        <Col md={6} lg={3}>
          <Card className="shadow-sm h-100 text-center hover:shadow-lg hover:scale-[1.02] transition-all duration-300">
            <Card.Body className="d-flex flex-column justify-content-between py-4">
              <h5 className="card-title text-info fw-bold mb-2">Solicitud de Licencia</h5>
              <Card.Text className="text-muted mb-3 flex-grow-1">
                Realiza tus pedidos de licencias laborales de forma ágil y sencilla.
              </Card.Text>
              <a href="https://geoarg.com/?ff_landing=20" target="_blank" rel="noopener noreferrer" className="btn btn-outline-info w-100 mt-3 fw-semibold">
                Acceder al formulario
              </a>
            </Card.Body>
          </Card>
        </Col>
        <Col md={6} lg={3}>
          <Card className="shadow-sm h-100 text-center hover:shadow-lg hover:scale-[1.02] transition-all duration-300">
            <Card.Body className="d-flex flex-column justify-content-between py-4">
              <h5 className="card-title text-warning fw-bold mb-2">Solicitud de Permiso - Artículo 81° Inciso –F-</h5>
              <Card.Text className="text-muted mb-3 flex-grow-1">
                Tramita permisos especiales según lo establecido en el Artículo 81° Inciso F.
              </Card.Text>
              <a href="https://geoarg.com/?ff_landing=19" target="_blank" rel="noopener noreferrer" className="btn btn-outline-warning w-100 mt-3 fw-semibold">
                Acceder al formulario
              </a>
            </Card.Body>
          </Card>
        </Col>
        <Col md={6} lg={3}>
          <Card className="shadow-sm h-100 text-center hover:shadow-lg hover:scale-[1.02] transition-all duration-300">
            <Card.Body className="d-flex flex-column justify-content-between py-4">
              <h5 className="card-title text-danger fw-bold mb-2">Solicitud de Permiso - Artículo 81° Inciso –D-</h5>
              <Card.Text className="text-muted mb-3 flex-grow-1">
                Gestiona permisos especiales conforme a lo indicado en el Artículo 81° Inciso D.
              </Card.Text>
              <a href="https://geoarg.com/?ff_landing=18" target="_blank" rel="noopener noreferrer" className="btn btn-outline-danger w-100 mt-3 fw-semibold">
                Acceder al formulario
              </a>
            </Card.Body>
          </Card>
        </Col>
        <Col md={6} lg={3}>
          <Card className="shadow-sm h-100 text-center hover:shadow-lg hover:scale-[1.02] transition-all duration-300">
            <Card.Body className="d-flex flex-column justify-content-between py-4">
              <h5 className="card-title text-primary fw-bold mb-2">Recibos de Sueldos</h5>
              <Card.Text className="text-muted mb-3 flex-grow-1">
                Consulta y envía tus recibos de sueldo directamente a tu email.
              </Card.Text>
              <Button onClick={() => navigate('/recursos-humanos/recibos')} variant="outline-primary" className="w-100 mt-3 fw-semibold">
                Acceder al buscador
              </Button>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default RecursosHumanos;
