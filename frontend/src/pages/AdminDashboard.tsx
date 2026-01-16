import React, { useEffect, useState } from 'react';
import { Container, Row, Col, Card, Button } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';

const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<string>('Administrador');

  useEffect(() => {
    const storedUser = localStorage.getItem('adminUser');
    if (storedUser) {
      setUser(storedUser);
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('adminUser');
    navigate('/admin');
  };

  return (
    <Container className="py-5 mt-5">
      <div className="d-flex justify-content-between align-items-center mb-5">
        <div>
          <h1 className="fw-bold text-primary">Panel de Control</h1>
          <p className="text-muted h5">Bienvenido, {user}</p>
        </div>
        <Button variant="outline-danger" onClick={handleLogout}>Cerrar Sesión</Button>
      </div>

      <Row xs={1} md={2} lg={3} className="g-4">
        {/* Módulo de Pagos */}
        <Col>
          <Card className="h-100 shadow-sm border-0 hover-shadow transition-all" style={{ cursor: 'pointer' }} onClick={() => navigate('/admin/payments')}>
            <Card.Body className="text-center p-4">
              <div className="text-primary mb-3">
                <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" fill="currentColor" className="bi bi-credit-card" viewBox="0 0 16 16">
                  <path d="M0 4a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V4zm2-1a1 1 0 0 0-1 1v1h14V4a1 1 0 0 0-1-1H2zm13 4H1v5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V7z"/>
                  <path d="M2 10a1 1 0 0 1 1-1h1a1 1 0 0 1 1 1v1a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1v-1z"/>
                </svg>
              </div>
              <Card.Title className="fw-bold">Historial de Pagos</Card.Title>
              <Card.Text className="text-muted small">
                Ver y gestionar los pagos recibidos de Mercado Pago y Payway.
              </Card.Text>
            </Card.Body>
          </Card>
        </Col>

        {/* Módulo de Logs */}
        <Col>
          <Card className="h-100 shadow-sm border-0 hover-shadow transition-all" style={{ cursor: 'pointer' }} onClick={() => navigate('/admin/logs')}>
            <Card.Body className="text-center p-4">
              <div className="text-secondary mb-3">
                <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" fill="currentColor" className="bi bi-journal-text" viewBox="0 0 16 16">
                  <path d="M5 10.5a.5.5 0 0 1 .5-.5h2a.5.5 0 0 1 0 1h-2a.5.5 0 0 1-.5-.5zm0-2a.5.5 0 0 1 .5-.5h5a.5.5 0 0 1 0 1h-5a.5.5 0 0 1-.5-.5zm0-2a.5.5 0 0 1 .5-.5h5a.5.5 0 0 1 0 1h-5a.5.5 0 0 1-.5-.5zm0-2a.5.5 0 0 1 .5-.5h5a.5.5 0 0 1 0 1h-5a.5.5 0 0 1-.5-.5z"/>
                  <path d="M3 0h10a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2v-1h1v1a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V2a1 1 0 0 0-1-1H3a1 1 0 0 0-1 1v1H1V2a2 2 0 0 1 2-2z"/>
                  <path d="M1 5v-.5a.5.5 0 0 1 1 0V5h.5a.5.5 0 0 1 0 1h-2a.5.5 0 0 1 0-1H1zm0 3v-.5a.5.5 0 0 1 1 0V8h.5a.5.5 0 0 1 0 1h-2a.5.5 0 0 1 0-1H1zm0 3v-.5a.5.5 0 0 1 1 0v.5h.5a.5.5 0 0 1 0 1h-2a.5.5 0 0 1 0-1H1z"/>
                </svg>
              </div>
              <Card.Title className="fw-bold">Logs del Sistema</Card.Title>
              <Card.Text className="text-muted small">
                Auditoría técnica y registros de errores del sistema.
              </Card.Text>
            </Card.Body>
          </Card>
        </Col>

        {/* Módulo Accesos de Personal */}
        <Col>
          <Card className="h-100 shadow-sm border-0 hover-shadow transition-all" style={{ cursor: 'pointer' }} onClick={() => navigate('/admin/access_logs')}>
            <Card.Body className="text-center p-4">
              <div className="text-info mb-3">
                <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" fill="currentColor" className="bi bi-people-fill" viewBox="0 0 16 16">
                  <path d="M7 14s-1 0-1-1 1-4 5-4 5 3 5 4-1 1-1 1H7Zm4-6a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z"/>
                  <path fillRule="evenodd" d="M5.216 14A2.238 2.238 0 0 1 5 13c0-1.355.68-2.75 1.936-3.72A6.325 6.325 0 0 0 5 9c-4 0-5 3-5 4s1 1 1 1h4.216Z"/>
                  <path d="M4.5 8a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z"/>
                </svg>
              </div>
              <Card.Title className="fw-bold">Accesos de Personal</Card.Title>
              <Card.Text className="text-muted small">
                Registro de inicios de sesión del equipo administrativo.
              </Card.Text>
            </Card.Body>
          </Card>
        </Col>

        {/* Módulo Reporte Recaudación */}
        <Col>
          <Card className="h-100 shadow-sm border-0 hover-shadow transition-all" style={{ cursor: 'pointer' }} onClick={() => navigate('/admin/recaudacion')}>
            <Card.Body className="text-center p-4">
              <div className="text-success mb-3">
                <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" fill="currentColor" className="bi bi-cash-stack" viewBox="0 0 16 16">
                  <path d="M1 3a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1H1zm7 8a2 2 0 1 0 0-4 2 2 0 0 0 0 4z"/>
                  <path d="M0 5a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H1a1 1 0 0 1-1-1V5zm3 0a2 2 0 0 1-2 2v4a2 2 0 0 1 2 2h10a2 2 0 0 1 2-2V7a2 2 0 0 1-2-2H3z"/>
                </svg>
              </div>
              <Card.Title className="fw-bold">Reporte Recaudación</Card.Title>
              <Card.Text className="text-muted small">
                Listado de cobros manuales de tasas y derechos.
              </Card.Text>
            </Card.Body>
          </Card>
        </Col>

        {/* Módulo Reporte Patentes */}
        <Col>
          <Card className="h-100 shadow-sm border-0 hover-shadow transition-all" style={{ cursor: 'pointer' }} onClick={() => navigate('/admin/patentes')}>
            <Card.Body className="text-center p-4">
              <div className="text-warning mb-3">
                <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" fill="currentColor" className="bi bi-car-front" viewBox="0 0 16 16">
                  <path d="M4 9a1 1 0 1 1-2 0 1 1 0 0 1 2 0Zm10 0a1 1 0 1 1-2 0 1 1 0 0 1 2 0z"/>
                  <path d="M6 8a1 1 0 0 0 0 2h4a1 1 0 0 0 0-2H6zM4.862 4.276 3.906 6.19a.51.51 0 0 0 .497.731c.91-.073 2.35-.17 3.597-.17 1.247 0 2.688.097 3.597.17a.51.51 0 0 0 .497-.731l-.956-1.913A.5.5 0 0 0 10.691 4H5.309a.5.5 0 0 0-.447.276z"/>
                  <path d="M2.52 3.515A2.5 2.5 0 0 1 4.82 2h6.362c1 0 1.904.596 2.298 1.515l.792 1.848c.075.175.21.319.38.404.5.25.855.715.965 1.262l.335 1.679c.033.161.049.325.049.49v.413c0 .814-.39 1.543-1 1.997V13.5a.5.5 0 0 1-.5.5h-2a.5.5 0 0 1-.5-.5v-1.338c-1.292.048-2.745.088-4 .088s-2.708-.04-4-.088V13.5a.5.5 0 0 1-.5.5h-2a.5.5 0 0 1-.5-.5v-1.892c-.61-.454-1-1.183-1-1.997v-.413a2.5 2.5 0 0 1 .049-.49l.335-1.68c.11-.546.465-1.012.964-1.261a.807.807 0 0 0 .381-.404l.792-1.848zM6.95 1a3.5 3.5 0 0 0-3.217 2.121L2.94 4.784A1.5 1.5 0 0 0 2 6.133V10.5a1.5 1.5 0 0 0 1.5 1.5h11a1.5 1.5 0 0 0 1.5-1.5V6.133a1.5 1.5 0 0 0-.94-1.35l-.792-1.663A3.5 3.5 0 0 0 9.05 1H6.95z"/>
                </svg>
              </div>
              <Card.Title className="fw-bold">Reporte Patentes</Card.Title>
              <Card.Text className="text-muted small">
                Listado de cobros manuales de patentes.
              </Card.Text>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default AdminDashboard;