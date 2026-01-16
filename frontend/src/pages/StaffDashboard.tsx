import React, { useEffect, useState } from 'react';
import { Container, Row, Col, Card, Button } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';

const StaffDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<string>('Usuario');

  useEffect(() => {
    const storedUser = localStorage.getItem('staffUser');
    if (storedUser) {
      setUser(storedUser);
    } else {
      // Si no hay usuario, volver al login
      navigate('/staff/login');
    }
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('staffUser');
    navigate('/staff/login');
  };

  return (
    <Container className="py-5 mt-5">
      <div className="d-flex justify-content-between align-items-center mb-5 bg-white p-4 rounded-3 shadow-sm border">
        <div>
          <h2 className="fw-bold text-dark mb-0">Panel de Personal</h2>
          <p className="text-muted mb-0">Bienvenido/a, <span className="fw-bold text-success">{user}</span></p>
        </div>
        <Button variant="outline-danger" onClick={handleLogout}>Cerrar Sesión</Button>
      </div>

      <Row xs={1} md={2} lg={3} className="g-4">
        {/* Módulo Buscador de Patente */}
        <Col>
          <Card 
            className="h-100 shadow-sm border-0 hover-shadow transition-all" 
            style={{ cursor: 'pointer', transition: 'transform 0.2s' }} 
            onClick={() => window.open('https://buscador-patente-traful.streamlit.app/', '_blank')}
            onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
            onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
          >
            <Card.Body className="text-center p-4">
              <div className="text-success mb-3">
                <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" fill="currentColor" className="bi bi-search" viewBox="0 0 16 16">
                  <path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001c.03.04.062.078.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1.007 1.007 0 0 0-.115-.1zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0z"/>
                </svg>
              </div>
              <Card.Title className="fw-bold">Buscador de Patente</Card.Title>
              <Card.Text className="text-muted small">
                Acceder a la herramienta externa de consulta de patentes automotor.
              </Card.Text>
              <div className="mt-3">
                <Button variant="success" size="sm">Abrir Buscador</Button>
              </div>
            </Card.Body>
          </Card>
        </Col>

        {/* Módulo Recaudación */}
        <Col>
          <Card 
            className="h-100 shadow-sm border-0 hover-shadow transition-all" 
            style={{ cursor: 'pointer', transition: 'transform 0.2s' }} 
            onClick={() => navigate('/staff/recaudacion')}
            onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
            onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
          >
            <Card.Body className="text-center p-4">
              <div className="text-primary mb-3">
                <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" fill="currentColor" className="bi bi-cash-coin" viewBox="0 0 16 16">
                  <path fillRule="evenodd" d="M11 15a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm5-4a5 5 0 1 1-10 0 5 5 0 0 1 10 0z"/>
                  <path d="M9.438 11.944c.047.596.518 1.06 1.363 1.116v.44h.375v-.443c.875-.061 1.386-.529 1.386-1.207 0-.618-.39-.936-1.09-1.1l-.296-.07v-1.2c.376.043.614.248.671.532h.658c-.047-.575-.54-1.023-1.329-1.073V8.5h-.375v.45c-.747.073-1.255.522-1.255 1.158 0 .562.378.92 1.007 1.066l.248.061v1.272c-.384-.058-.639-.27-.696-.563h-.668zm1.36-1.354c-.369-.085-.569-.26-.569-.522 0-.294.216-.514.572-.578v1.1h-.003zm.432.746c.449.104.655.272.655.569 0 .339-.257.571-.709.614v-1.195l.054.012z"/>
                  <path d="M1 0a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h4.083c.058-.344.145-.678.258-1H3a2 2 0 0 0-2-2V3a2 2 0 0 0 2-2h10a2 2 0 0 0 2 2v3.528c.38.34.717.728 1 1.154V1a1 1 0 0 0-1-1H1z"/>
                  <path d="M9.998 5.083 10 5a2 2 0 1 0-3.132 1.65 5.982 5.982 0 0 1 3.13-1.567z"/>
                </svg>
              </div>
              <Card.Title className="fw-bold">Recaudación</Card.Title>
              <Card.Text className="text-muted small">
                Registro de Tasas y Derechos Municipales.
              </Card.Text>
              <div className="mt-3">
                <Button variant="primary" size="sm">Nuevo Registro</Button>
              </div>
            </Card.Body>
          </Card>
        </Col>

        {/* Módulo Pago de Patente */}
        <Col>
          <Card 
            className="h-100 shadow-sm border-0 hover-shadow transition-all" 
            style={{ cursor: 'pointer', transition: 'transform 0.2s' }} 
            onClick={() => navigate('/staff/patente')}
            onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
            onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
          >
            <Card.Body className="text-center p-4">
              <div className="text-info mb-3">
                <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" fill="currentColor" className="bi bi-car-front" viewBox="0 0 16 16">
                  <path d="M4 9a1 1 0 1 1-2 0 1 1 0 0 1 2 0Zm10 0a1 1 0 1 1-2 0 1 1 0 0 1 2 0z"/>
                  <path d="M6 8a1 1 0 0 0 0 2h4a1 1 0 0 0 0-2H6zM4.862 4.276 3.906 6.19a.51.51 0 0 0 .497.731c.91-.073 2.35-.17 3.597-.17 1.247 0 2.688.097 3.597.17a.51.51 0 0 0 .497-.731l-.956-1.913A.5.5 0 0 0 10.691 4H5.309a.5.5 0 0 0-.447.276z"/>
                  <path d="M2.52 3.515A2.5 2.5 0 0 1 4.82 2h6.362c1 0 1.904.596 2.298 1.515l.792 1.848c.075.175.21.319.38.404.5.25.855.715.965 1.262l.335 1.679c.033.161.049.325.049.49v.413c0 .814-.39 1.543-1 1.997V13.5a.5.5 0 0 1-.5.5h-2a.5.5 0 0 1-.5-.5v-1.338c-1.292.048-2.745.088-4 .088s-2.708-.04-4-.088V13.5a.5.5 0 0 1-.5.5h-2a.5.5 0 0 1-.5-.5v-1.892c-.61-.454-1-1.183-1-1.997v-.413a2.5 2.5 0 0 1 .049-.49l.335-1.68c.11-.546.465-1.012.964-1.261a.807.807 0 0 0 .381-.404l.792-1.848zM6.95 1a3.5 3.5 0 0 0-3.217 2.121L2.94 4.784A1.5 1.5 0 0 0 2 6.133V10.5a1.5 1.5 0 0 0 1.5 1.5h11a1.5 1.5 0 0 0 1.5-1.5V6.133a1.5 1.5 0 0 0-.94-1.35l-.792-1.663A3.5 3.5 0 0 0 9.05 1H6.95z"/>
                </svg>
              </div>
              <Card.Title className="fw-bold">Pago de Patente</Card.Title>
              <Card.Text className="text-muted small">
                Registro manual de pago de patente automotor.
              </Card.Text>
              <div className="mt-3">
                <Button variant="info" size="sm" className="text-white">Nuevo Registro</Button>
              </div>
            </Card.Body>
          </Card>
        </Col>

        {/* Módulo Mercado Pago Link */}
        <Col>
          <Card 
            className="h-100 shadow-sm border-0 hover-shadow transition-all" 
            style={{ cursor: 'pointer', transition: 'transform 0.2s' }} 
            onClick={() => navigate('/staff/link-mp')}
            onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
            onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
          >
            <Card.Body className="text-center p-4">
              <div className="text-primary mb-3">
                <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" fill="currentColor" className="bi bi-qr-code" viewBox="0 0 16 16">
                  <path d="M2 2h2v2H2V2Z"/>
                  <path d="M6 0v6H0V0h6ZM5 1H1v4h4V1ZM4 12H2v2h2v-2Z"/>
                  <path d="M6 10v6H0v-6h6Zm-5 1v4h4v-4H1Zm11-9h2v2h-2V2Z"/>
                  <path d="M10 0v6h6V0h-6Zm5 1v4h-4V1h4ZM8 1V0h1v2H8v2H7V1h1Zm0 5V4h1v2H8ZM6 8V7h1V6h1v2h1V7h5v1h-4v1H7V8H6Zm0 0v1H2V8H1v1H0V7h3v1h3Zm10 1h-1V7h1v2Zm-1 0h-1v2h2v-1h-1V9Zm-4 0h2v1h-1v1h-1V9Zm2 3v-1h-1v1h-1v1H9v1h3v-2h1Zm0 0h3v1h-3v-1Z"/>
                </svg>
              </div>
              <Card.Title className="fw-bold">Cobro Mercado Pago</Card.Title>
              <Card.Text className="text-muted small">
                Enviar link de pago y solicitar comprobante.
              </Card.Text>
              <div className="mt-3">
                <Button variant="primary" size="sm">Gestionar</Button>
              </div>
            </Card.Body>
          </Card>
        </Col>

        {/* Espacio para futuros módulos */}
        <Col>
          <Card className="h-100 border-2 border-dashed border-light bg-light d-flex align-items-center justify-content-center" style={{ minHeight: '200px' }}>
            <Card.Body className="text-center p-4 text-muted opacity-50">
              <div className="mb-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="currentColor" className="bi bi-plus-circle" viewBox="0 0 16 16">
                  <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/>
                  <path d="M8 4a.5.5 0 0 1 .5.5v3h3a.5.5 0 0 1 0 1h-3v3a.5.5 0 0 1-1 0v-3h-3a.5.5 0 0 1 0-1h3v-3A.5.5 0 0 1 8 4z"/>
                </svg>
              </div>
              <span className="small">Módulo adicional</span>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default StaffDashboard;