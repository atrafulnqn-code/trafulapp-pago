import React from 'react';
import { useNavigate } from 'react-router-dom';
import { PaymentSystem } from '../types';
import { Container, Row, Col, Card, Button } from 'react-bootstrap';

const Home: React.FC = () => {
  const navigate = useNavigate();

  const services = [
    {
      id: PaymentSystem.TASAS,
      title: 'Tasas Retributivas',
      description: 'Pague sus impuestos retributivos y el agua de forma rápida y segura.',
      variant: 'success',
      icon: <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="currentColor" className="bi bi-house-door-fill text-success" viewBox="0 0 16 16"><path d="M6.5 14.5v-3.505c0-.245.25-.495.5-.495h2c.25 0 .5.25.5.5v3.505h4v-7a.5.5 0 0 0-.146-.354L13 5.793V2.5a.5.5 0 0 0-.5-.5h-1a.5.5 0 0 0-.5.5v1.293L8.354 1.146a.5.5 0 0 0-.708 0l-6 6A.5.5 0 0 0 1.5 7.5v7a.5.5 0 0 0 .5.5h4a.5.5 0 0 0 .5-.5z"/></svg> // Home icon
    },
    {
      id: PaymentSystem.OTRAS,
      title: 'Plan de Pago',
      description: 'Pague sus cuotas correspondiente al plan de pago solicitado previamente',
      variant: 'warning',
      icon: <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="currentColor" className="bi bi-journal-check text-warning" viewBox="0 0 16 16"><path fillRule="evenodd" d="M10.854 6.146a.5.5 0 0 1 0 .708l-3 3a.5.5 0 0 1-.708 0l-1.5-1.5a.5.5 0 1 1 .708-.708L7.5 8.793l2.646-2.647a.5.5 0 0 1 .708 0z"/><path d="M3 0h10a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2v-1h1v1a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V2a1 1 0 0 0-1-1H3a1 1 0 0 0-1 1v1H1V2a2 2 0 0 1 2-2z"/><path d="M1 5v-.5a.5.5 0 0 1 1 0V5h.5a.5.5 0 0 1 0 1h-.5v.5a.5.5 0 0 1-1 0V6h-.5a.5.5 0 0 1 0-1H1z"/></svg> // Journal icon
    },
    {
      id: PaymentSystem.PATENTE,
      title: 'Patente Automotor',
      description: 'Consulte el estado de deuda y pague la patente de su vehículo ingresando su dominio.',
      variant: 'secondary',
      disabled: true,
      icon: <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="currentColor" className="bi bi-car-front-fill text-secondary" viewBox="0 0 16 16"><path d="M7.834 11.378 10.27 7.618H9.35C8.36 7.618 7.33 8.35 6.78 9.3c-.76.1-.76.43-1.14.75-.58.48-1.57.17-2.1-.38a2 2 0 0 1-.36-.45V9.45c-.34-.58-.34-1.28 0-1.87l-.01-.02a.37.37 0 0 1 .1-.1c.36-.18.84-.44 1.1-.9-.12-.3-.25-.63-.3-.97-.24-.87.48-1.8 1.4-2.12.04-.02.09-.04.13-.06a2 2 0 0 1 2.08 1.63c.27 1.02.6 2.05 1 3.08l1.7-2.61.88.57-1.7 2.6c.02.04.05.08.07.12zM12.983 6H12v-.234c0-.622-.56-1.127-1.25-1.127h-8.5C1.56 4.639 1 5.144 1 5.766V6H.016a.2.2 0 0 0-.016.222l.749 2.997A.75.75 0 0 0 1.749 9.5h.211a.75.75 0 0 0 .615-.357l-.3-.797a.75.75 0 0 0-.616-1.09h-.18l-.4-.16V6.5h1.616c.453-.29.98-.445 1.516-.445h4.518c.683 0 1.25.505 1.25 1.127V6h1.017Zm-2.887 2.012a2.001 2.001 0 0 0-2.827-.087c-.64.44-1.166.86-1.55 1.139-.23.17-.4.29-.4.29H1.465l-.36-.615a.75.75 0 0 1-.02-.078l-.348-1.39A.25.25 0 0 1 1.016 6.5H12.984a.25.25 0 0 1 .016.222l-.749 2.997A.75.75 0 0 1 11.25 9.5h-.062c-.172-.045-.37-.1-.587-.197-.4-.18-.75-.383-1.07-.63Z"/></svg> // Car icon
    }
  ];

  // Hero Section Corporativo
  const Hero: React.FC = () => (
    <div className="text-center py-5 mb-5 position-relative overflow-hidden shadow-sm" style={{ minHeight: '500px', display: 'flex', alignItems: 'center', background: '#0f4c81' }}>
        {/* Imagen de fondo sutil */}
        <div style={{
            position: 'absolute',
            top: 0, left: 0, right: 0, bottom: 0,
            backgroundImage: 'url(https://images.unsplash.com/photo-1544084944-15269ec7b5a0?q=80&w=2070&auto=format&fit=crop)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            opacity: 0.4,
            mixBlendMode: 'overlay',
            zIndex: 0,
        }}></div>
        
        <Container style={{ zIndex: 1, position: 'relative' }}>
            <div className="py-4">
                <h1 className="display-3 fw-bold mb-3 text-white" style={{ letterSpacing: '-0.02em', textShadow: '0 2px 4px rgba(0,0,0,0.3)' }}>
                    Gestión Tributaria Digital
                </h1>
                <p className="fs-5 text-white col-md-8 mx-auto mb-5 opacity-90 fw-light">
                    Plataforma oficial de la Comuna de Villa Traful. Realice sus pagos y trámites de forma ágil, segura y transparente.
                </p>
                <div className="d-flex justify-content-center gap-3">
                    <Button variant="light" size="lg" className="rounded-pill px-5 fw-bold shadow-lg text-primary" onClick={() => document.getElementById('services')?.scrollIntoView({ behavior: 'smooth' })}>
                        Comenzar Trámite
                    </Button>
                </div>
            </div>
        </Container>
    </div>
  );

  return (
    <>
      <Hero />
      
      <Container id="services" className="py-5 my-5" style={{ position: 'relative', zIndex: 10 }}>
          <Row xs={1} md={3} className="g-5">
            {services.map((service) => (
              <Col key={service.id}>
                <div className={`glass-card p-2 h-100 d-flex flex-column border-0 ${service.disabled ? 'opacity-75' : ''}`}>
                  <div className="p-4 flex-grow-1 text-center">
                    <div className="mb-4 p-4 rounded-circle d-inline-block bg-light shadow-sm text-primary" style={{ width: '80px', height: '80px' }}>
                        {service.icon}
                    </div>
                    <h3 className="fw-bold h5 mb-3 text-dark text-uppercase letter-spacing-1">{service.title}</h3>
                    <p className="text-secondary small px-2">{service.description}</p>
                  </div>
                  <div className="p-4 pt-0">
                    <Button 
                      variant={service.variant === 'secondary' ? 'secondary' : 'primary'}
                      className="w-100 rounded-pill py-3 fw-bold shadow-sm"
                      onClick={() => !service.disabled && navigate(`/pagar/${service.id.toLowerCase()}`)}
                      disabled={service.disabled}
                    >
                      {service.disabled ? 'Próximamente' : 'ACCEDER'}
                    </Button>
                  </div>
                </div>
              </Col>
            ))}
          </Row>
      </Container>

      <div className="mt-5 py-5 bg-white border-top">
        <Container>
            <Row className="text-center g-4">
                <Col md={4}>
                    <div className="text-primary mb-3">
                        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="currentColor" className="bi bi-shield-check" viewBox="0 0 16 16"><path d="M5.338 1.59a61.44 61.44 0 0 0-2.837.856.481.481 0 0 0-.328.39c-.554 4.157.726 7.19 2.253 9.188a10.725 10.725 0 0 0 2.287 2.233c.346.244.652.42.893.533.12.057.218.095.293.118a.55.55 0 0 0 .101.025.615.615 0 0 0 .1-.025c.076-.023.174-.06.294-.118.24-.113.545-.29.893-.533a10.726 10.726 0 0 0 2.287-2.233c1.527-1.997 2.807-5.031 2.253-9.188a.48.48 0 0 0-.328-.39c-.651-.213-1.75-.56-2.837-.855C9.552 1.29 8.531 1.067 8 1.067c-.53 0-1.552.223-2.662.524zM5.072.56C6.157.265 7.31 0 8 0s1.843.265 2.928.56c1.11.3 2.229.655 2.887.87a1.54 1.54 0 0 1 1.044 1.262c.596 4.477-.787 7.795-2.46 9.99a11.775 11.775 0 0 1-2.517 2.453 7.016 7.016 0 0 1-1.048.625c-.28.132-.581.24-.829.24s-.548-.108-.829-.24a7.015 7.015 0 0 1-1.048-.625 11.777 11.777 0 0 1-2.517-2.453C1.928 10.487.545 7.169 1.141 2.692A1.54 1.54 0 0 1 2.185 1.43 62.456 62.456 0 0 1 5.072.56z"/><path d="M10.854 5.146a.5.5 0 0 1 0 .708l-3 3a.5.5 0 0 1-.708 0l-1.5-1.5a.5.5 0 1 1 .708-.708L7.5 7.793l2.646-2.647a.5.5 0 0 1 .708 0z"/></svg>
                    </div>
                    <h5 className="fw-bold text-dark">Pago Seguro</h5>
                    <p className="text-muted small">Transacciones protegidas con estándares bancarios.</p>
                </Col>
                <Col md={4}>
                    <div className="text-primary mb-3">
                        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="currentColor" className="bi bi-lightning-charge" viewBox="0 0 16 16"><path d="M11.251.068a.5.5 0 0 1 .227.58L9.677 7.5H13.5a.5.5 0 0 1 .364.843l-8 8.5a.5.5 0 0 1-.842-.49L6.323 9.5H2.5a.5.5 0 0 1-.364-.843l8-8.5a.5.5 0 0 1 .615-.09z"/></svg>
                    </div>
                    <h5 className="fw-bold text-dark">Gestión Ágil</h5>
                    <p className="text-muted small">Sus trámites se procesan al instante.</p>
                </Col>
                <Col md={4}>
                    <div className="text-primary mb-3">
                        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="currentColor" className="bi bi-people" viewBox="0 0 16 16"><path d="M15 14s1 0 1-1-1-4-5-4-5 3-5 4 1 1 1 1h8zm-7.978-1A.261.261 0 0 1 7 12.996c.001-.264.167-1.03.76-1.72C8.312 10.629 9.282 10 11 10c1.717 0 2.687.63 3.24 1.276.593.69.758 1.457.76 1.72l-.008.002a.274.274 0 0 1-.014.002H7.022zM11 7a2 2 0 1 0 0-4 2 2 0 0 0 0 4zm3-2a3 3 0 1 1-6 0 3 3 0 0 1 6 0zM6.936 9.28a5.88 5.88 0 0 0-1.23-.247A7.35 7.35 0 0 0 5 9c-4 0-5 3-5 4 0 .667.333 1 1 1h4.216A2.238 2.238 0 0 1 5 13c0-1.01.677-2.041 1.03-2.927h.002c.361-.885.087-1.792-.096-2.793z"/></svg>
                    </div>
                    <h5 className="fw-bold text-dark">Soporte Local</h5>
                    <p className="text-muted small">Atención personalizada en horario de oficina.</p>
                </Col>
            </Row>
        </Container>
      </div>
    </>
  );
};

export default Home;