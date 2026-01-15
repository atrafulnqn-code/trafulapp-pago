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

  // A more advanced Jumbotron with a semi-transparent overlay for better text contrast
  const Jumbotron: React.FC = () => (
    <div className="text-white" style={{
        position: 'relative',
        height: '500px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
    }}>
        <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundImage: 'url(https://images.unsplash.com/photo-1544084944-15269ec7b5a0?q=80&w=2070&auto=format&fit=crop)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            filter: 'brightness(50%)',
            zIndex: -1,
        }}></div>
        <Container>
            <h1 className="display-4 fw-bold">Gestione sus tributos con comodidad.</h1>
            <p className="fs-5 col-md-10 mx-auto">
                Plataforma digital de la Comuna de Villa Traful para el pago ágil de servicios y tasas municipales.
            </p>
            <Button variant="light" size="lg" onClick={() => document.getElementById('services')?.scrollIntoView({ behavior: 'smooth' })}>
                Comenzar Pago
            </Button>
        </Container>
    </div>
  );

  return (
    <>
      <style>{`
        .service-card {
          transition: transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out;
        }
        .service-card:hover {
          transform: translateY(-5px);
          box-shadow: 0 0.5rem 1rem rgba(0, 0, 0, 0.15) !important;
        }
        .btn-gradient-${PaymentSystem.TASAS} {
          background: linear-gradient(to right, #28a745, #218838); /* Green gradient */
          border-color: #28a745;
          color: white;
        }
        .btn-gradient-${PaymentSystem.TASAS}:hover {
          background: linear-gradient(to right, #218838, #1e7e34);
          border-color: #1e7e34;
        }
        .btn-gradient-${PaymentSystem.PATENTE} {
          background: linear-gradient(to right, #007bff, #0069d9); /* Blue gradient */
          border-color: #007bff;
          color: white;
        }
        .btn-gradient-${PaymentSystem.PATENTE}:hover {
          background: linear-gradient(to right, #0069d9, #0056b3);
          border-color: #0056b3;
        }
        .btn-gradient-${PaymentSystem.OTRAS} {
          background: linear-gradient(to right, #ffc107, #e0a800); /* Yellow gradient */
          border-color: #ffc107;
          color: white;
        }
        .btn-gradient-${PaymentSystem.OTRAS}:hover {
          background: linear-gradient(to right, #e0a800, #c69500);
          border-color: #e0a800;
        }
      `}</style>

      <Jumbotron />
      
      <Container id="services" className="py-5 my-4">
          <div className="text-center mb-5">
            <h2 className="display-6 fw-bold">Seleccione una Opción</h2>
            <p className="lead text-muted">
              Elija el sistema que desea consultar para proceder con la identificación y el pago correspondiente.
            </p>
          </div>

          <Row xs={1} md={3} className="g-4">
            {services.map((service) => (
              <Col key={service.id}>
                <Card className="h-100 shadow-lg service-card">
                  <Card.Header as="h5" className={`bg-${service.variant} text-white fw-bold d-flex align-items-center`}>
                    {service.icon}
                    <span className="ms-3">{service.title}</span>
                  </Card.Header>
                  <Card.Body className="d-flex flex-column p-4">
                    <Card.Text className="flex-grow-1">{service.description}</Card.Text>
                    <Button 
                      variant={service.variant}
                      className={`mt-4 ${service.disabled ? '' : `btn-gradient-${service.id}`}`}
                      onClick={() => !service.disabled && navigate(`/pagar/${service.id.toLowerCase()}`)}
                      disabled={service.disabled}
                    >
                      {service.disabled ? 'Próximamente' : 'Pagar Ahora'}
                    </Button>
                  </Card.Body>
                </Card>
              </Col>
            ))}
          </Row>
      </Container>

      <div className="bg-light">
        <Container className="py-5">
            <Row className="text-center g-4">
                <Col md={4}>
                    <div className="mb-3">
                        <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" fill="currentColor" className="bi bi-shield-check text-primary" viewBox="0 0 16 16"><path d="M5.338 1.59a61.44 61.44 0 0 0-2.837.856.481.481 0 0 0-.328.39c-.554 4.157.726 7.19 2.253 9.188a10.725 10.725 0 0 0 2.287 2.233c.346.244.652.42.893.533.12.057.218.095.293.118a.55.55 0 0 0 .101.025.615.615 0 0 0 .1-.025c.076-.023.174-.06.294-.118.24-.113.545-.29.893-.533a10.726 10.726 0 0 0 2.287-2.233c1.527-1.997 2.807-5.031 2.253-9.188a.48.48 0 0 0-.328-.39c-.651-.213-1.75-.56-2.837-.855C9.552 1.29 8.531 1.067 8 1.067c-.53 0-1.552.223-2.662.524zM5.072.56C6.157.265 7.31 0 8 0s1.843.265 2.928.56c1.11.3 2.229.655 2.887.87a1.54 1.54 0 0 1 1.044 1.262c.596 4.477-.787 7.795-2.46 9.99a11.775 11.775 0 0 1-2.517 2.453 7.016 7.016 0 0 1-1.048.625c-.28.132-.581.24-.829.24s-.548-.108-.829-.24a7.015 7.015 0 0 1-1.048-.625 11.777 11.777 0 0 1-2.517-2.453C1.928 10.487.545 7.169 1.141 2.692A1.54 1.54 0 0 1 2.185 1.43 62.456 62.456 0 0 1 5.072.56z"/><path d="M10.854 5.146a.5.5 0 0 1 0 .708l-3 3a.5.5 0 0 1-.708 0l-1.5-1.5a.5.5 0 1 1 .708-.708L7.5 7.793l2.646-2.647a.5.5 0 0 1 .708 0z"/></svg>
                    </div>
                    <h4 className="fw-semibold">Pago Seguro</h4>
                    <p className="text-muted">Transacciones encriptadas y validadas bajo estándares bancarios.</p>
                </Col>
                <Col md={4}>
                    <div className="mb-3">
                        <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" fill="currentColor" className="bi bi-lightning-charge-fill text-primary" viewBox="0 0 16 16"><path d="M11.251.068a.5.5 0 0 1 .227.58L9.677 7.5H13.5a.5.5 0 0 1 .364.843l-8 8.5a.5.5 0 0 1-.842-.49L6.323 9.5H2.5a.5.5 0 0 1-.364-.843l8-8.5a.5.5 0 0 1 .615-.09z"/></svg>
                    </div>
                    <h4 className="fw-semibold">Acreditación Inmediata</h4>
                    <p className="text-muted">Sus deudas se cancelan en el sistema de forma instantánea al pagar.</p>
                </Col>
                <Col md={4}>
                    <div className="mb-3">
                        <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" fill="currentColor" className="bi bi-headset text-primary" viewBox="0 0 16 16"><path d="M8 1a5 5 0 0 0-5 5v1h1a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V6a6 6 0 1 1 12 0v6a2.5 2.5 0 0 1-2.5 2.5H9.366a1 1 0 0 1-.866.5h-1a1 1 0 1 1 0-2h1a1 1 0 0 1 .866.5H11.5A1.5 1.5 0 0 0 13 12h-1a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1h1V6a5 5 0 0 0-5-5z"/></svg>
                    </div>
                    <h4 className="fw-semibold">Soporte Continuo</h4>
                    <p className="text-muted">Asistencia técnica y administrativa disponible en horario municipal.</p>
                </Col>
            </Row>
        </Container>
      </div>
    </>
  );
};

export default Home;