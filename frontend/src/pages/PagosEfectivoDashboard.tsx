import React from 'react';
import { Container, Row, Col, Card, Button } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';

const PagosEfectivoDashboard: React.FC = () => {
  const navigate = useNavigate();

  return (
    <Container className="py-5 mt-5">
      <div className="sticky-top bg-slate-50 py-3 mb-4 border-bottom" style={{ zIndex: 1020, top: '70px' }}>
        <div className="d-flex align-items-center">
          <Button variant="outline-secondary" size="sm" onClick={() => navigate('/staff/dashboard')} className="me-3">&larr; Volver</Button>
          <div>
            <h2 className="fw-bold mb-0 text-dark">Pagos en Efectivo</h2>
            <p className="text-muted mb-0 small">Registro de pagos presenciales sin procesamiento online</p>
          </div>
        </div>
      </div>

      <Row xs={1} md={2} className="g-4">
        {/* Módulo Recaudación Efectivo */}
        <Col>
          <Card
            className="h-100 shadow-sm border-0 hover-shadow transition-all"
            style={{ cursor: 'pointer', transition: 'transform 0.2s' }}
            onClick={() => navigate('/staff/pagos-efectivo/recaudacion')}
            onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
            onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
          >
            <Card.Body className="text-center p-4">
              <div className="text-success mb-3">
                <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" fill="currentColor" className="bi bi-cash-stack" viewBox="0 0 16 16">
                  <path d="M1 3a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1H1zm7 8a2 2 0 1 0 0-4 2 2 0 0 0 0 4z"/>
                  <path d="M0 5a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H1a1 1 0 0 1-1-1V5zm3 0a2 2 0 0 1-2 2v4a2 2 0 0 1 2 2h10a2 2 0 0 1 2-2V7a2 2 0 0 1-2-2H3z"/>
                </svg>
              </div>
              <Card.Title className="fw-bold h4">Recaudación</Card.Title>
              <Card.Text className="text-muted">
                Registro de Tasas y Derechos Municipales pagados en efectivo.
                <div className="mt-3 text-start">
                  <small className="d-block"><strong>✓</strong> Genera comprobante PDF</small>
                  <small className="d-block"><strong>✓</strong> Envía email al contribuyente</small>
                  <small className="d-block"><strong>✗</strong> Sin link de pago online</small>
                </div>
              </Card.Text>
              <div className="mt-4">
                <Button variant="success" size="lg">Registrar Pago</Button>
              </div>
            </Card.Body>
          </Card>
        </Col>

        {/* Módulo Patente Efectivo */}
        <Col>
          <Card
            className="h-100 shadow-sm border-0 hover-shadow transition-all"
            style={{ cursor: 'pointer', transition: 'transform 0.2s' }}
            onClick={() => navigate('/staff/pagos-efectivo/patente')}
            onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
            onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
          >
            <Card.Body className="text-center p-4">
              <div className="text-info mb-3">
                <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" fill="currentColor" className="bi bi-cash-coin" viewBox="0 0 16 16">
                  <path fillRule="evenodd" d="M11 15a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm5-4a5 5 0 1 1-10 0 5 5 0 0 1 10 0z"/>
                  <path d="M9.438 11.944c.047.596.518 1.06 1.363 1.116v.44h.375v-.443c.875-.061 1.386-.529 1.386-1.207 0-.618-.39-.936-1.09-1.1l-.296-.07v-1.2c.376.043.614.248.671.532h.658c-.047-.575-.54-1.023-1.329-1.073V8.5h-.375v.45c-.747.073-1.255.522-1.255 1.158 0 .562.378.92 1.007 1.066l.248.061v1.272c-.384-.058-.639-.27-.696-.563h-.668zm1.36-1.354c-.369-.085-.569-.26-.569-.522 0-.294.216-.514.572-.578v1.1h-.003zm.432.746c.449.104.655.272.655.569 0 .339-.257.571-.709.614v-1.195l.054.012z"/>
                  <path d="M1 0a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h4.083c.058-.344.145-.678.258-1H3a2 2 0 0 0-2-2V3a2 2 0 0 0 2-2h10a2 2 0 0 0 2 2v3.528c.38.34.717.728 1 1.154V1a1 1 0 0 0-1-1H1z"/>
                  <path d="M9.998 5.083 10 5a2 2 0 1 0-3.132 1.65 5.982 5.982 0 0 1 3.13-1.567z"/>
                </svg>
              </div>
              <Card.Title className="fw-bold h4">Pago de Patente</Card.Title>
              <Card.Text className="text-muted">
                Registro manual de pago de patente automotor en efectivo.
                <div className="mt-3 text-start">
                  <small className="d-block"><strong>✓</strong> Genera comprobante PDF</small>
                  <small className="d-block"><strong>✓</strong> Envía email al contribuyente</small>
                  <small className="d-block"><strong>✗</strong> Sin link de pago online</small>
                </div>
              </Card.Text>
              <div className="mt-4">
                <Button variant="info" size="lg" className="text-white">Registrar Pago</Button>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <div className="mt-5 p-4 bg-light rounded border">
        <h5 className="fw-bold text-dark mb-3">ℹ️ Información Importante</h5>
        <ul className="mb-0">
          <li className="mb-2">Estos formularios son para <strong>pagos ya realizados en efectivo</strong> en las oficinas municipales.</li>
          <li className="mb-2">Se genera un comprobante PDF con ID único que se envía por email al contribuyente.</li>
          <li className="mb-2"><strong>NO</strong> se genera ningún link de pago de Mercado Pago.</li>
          <li className="mb-0">El registro queda guardado en Airtable para auditoría y seguimiento.</li>
        </ul>
      </div>
    </Container>
  );
};

export default PagosEfectivoDashboard;
