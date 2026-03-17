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
      glowColor: 'var(--glow-success)',
      icon: <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="currentColor" className="bi bi-house-door-fill text-success" viewBox="0 0 16 16"><path d="M6.5 14.5v-3.505c0-.245.25-.495.5-.495h2c.25 0 .5.25.5.5v3.505h4v-7a.5.5 0 0 0-.146-.354L13 5.793V2.5a.5.5 0 0 0-.5-.5h-1a.5.5 0 0 0-.5.5v1.293L8.354 1.146a.5.5 0 0 0-.708 0l-6 6A.5.5 0 0 0 1.5 7.5v7a.5.5 0 0 0 .5.5h4a.5.5 0 0 0 .5-.5z" /></svg> // Home icon
    },
    // NUEVA TARJETA DE AGUA
    {
      id: PaymentSystem.AGUA,
      title: 'Agua',
      description: 'Pague sus servicios de agua de forma rápida y segura.',
      variant: 'info',
      glowColor: 'var(--glow-info)',
      icon: <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="currentColor" className="bi bi-droplet-fill text-info" viewBox="0 0 16 16"><path fillRule="evenodd" d="M8 16a6 6 0 0 0 6-6c0-1.655-1.122-2.904-2.432-4.362C10.254 4.176 8.75 2.561 8 0c0 0-6 5.686-6 10a6 6 0 0 0 6 6Z" /></svg> // Water droplet icon
    },
    {
      id: PaymentSystem.OTRAS,
      title: 'Plan de Pago',
      description: 'Pague sus cuotas correspondiente al plan de pago solicitado previamente',
      variant: 'warning',
      glowColor: 'var(--glow-warning)',
      icon: <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="currentColor" className="bi bi-journal-check text-warning" viewBox="0 0 16 16"><path fillRule="evenodd" d="M10.854 6.146a.5.5 0 0 1 0 .708l-3 3a.5.5 0 0 1-.708 0l-1.5-1.5a.5.5 0 1 1 .708-.708L7.5 8.793l2.646-2.647a.5.5 0 0 1 .708 0z" /><path d="M3 0h10a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2v-1h1v1a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V2a1 1 0 0 0-1-1H3a1 1 0 0 0-1 1v1H1V2a2 2 0 0 1 2-2z" /><path d="M1 5v-.5a.5.5 0 0 1 1 0V5h.5a.5.5 0 0 1 0 1h-.5v.5a.5.5 0 0 1-1 0V6h-.5a.5.5 0 0 1 0-1H1z" /></svg> // Journal icon
    },
    {
      id: PaymentSystem.PATENTE,
      title: 'Patente Automotor',
      description: 'Consulte el estado de deuda y pague la patente de su vehículo ingresando su dominio.',
      variant: 'primary',
      glowColor: 'var(--glow-primary)',
      icon: <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="currentColor" className="bi bi-car-front-fill text-primary" viewBox="0 0 16 16"><path d="M7.834 11.378 10.27 7.618H9.35C8.36 7.618 7.33 8.35 6.78 9.3c-.76.1-.76.43-1.14.75-.58.48-1.57.17-2.1-.38a2 2 0 0 1-.36-.45V9.45c-.34-.58-.34-1.28 0-1.87l-.01-.02a.37.37 0 0 1 .1-.1c.36-.18.84-.44 1.1-.9-.12-.3-.25-.63-.3-.97-.24-.87.48-1.8 1.4-2.12.04-.02.09-.04.13-.06a2 2 0 0 1 2.08 1.63c.27 1.02.6 2.05 1 3.08l1.7-2.61.88.57-1.7 2.6c.02.04.05.08.07.12zM12.983 6H12v-.234c0-.622-.56-1.127-1.25-1.127h-8.5C1.56 4.639 1 5.144 1 5.766V6H.016a.2.2 0 0 0-.016.222l.749 2.997A.75.75 0 0 0 1.749 9.5h.211a.75.75 0 0 0 .615-.357l-.3-.797a.75.75 0 0 0-.616-1.09h-.18l-.4-.16V6.5h1.616c.453-.29.98-.445 1.516-.445h4.518c.683 0 1.25 1.127V6h1.017Zm-2.887 2.012a2.001 2.001 0 0 0-2.827-.087c-.64.44-1.166.86-1.55 1.139-.23.17-.4.29-.4.29H1.465l-.36-.615a.75.75 0 0 1-.02-.078l-.348-1.39A.25.25 0 0 1 1.016 6.5H12.984a.25.25 0 0 1 .016.222l-.749 2.997A.75.75 0 0 1 11.25 9.5h-.062c-.172-.045-.37-.1-.587-.197-.4-.18-.75-.383-1.07-.63Z" /></svg> // Car icon
    },
    {
      id: PaymentSystem.POLIDEPORTIVO,
      title: 'Polideportivo',
      description: 'Acceda al formulario de inscripción para actividades en el polideportivo municipal.',
      variant: 'primary',
      glowColor: 'var(--glow-primary)',
      externalUrl: 'https://geoarg.com/?ff_landing=25',
      icon: <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="currentColor" className="bi bi-person-walking text-primary" viewBox="0 0 16 16"><path d="M9.5 1.5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0M6.44 3.752A.75.75 0 0 1 7 3.5h1.445c.193 0 .38.074.52.206l2.365 2.22a.25.25 0 0 1 .01.353s-.308.342-.315.348l-1.815 1.63a.4.4 0 0 1-.54 0L7.433 7.218 5.755 11.2a.5.5 0 0 1-.916-.4l1.633-3.872a.4.4 0 0 1 .158-.19l.716-.474-.833-2.4a.4.4 0 0 1 .056-.328l.85-1.428a.4.4 0 0 1 .022-.032zM3.834 8.7a.5.5 0 0 1 .553.433l.4 4a.5.5 0 0 1-.986.098l-.4-4a.5.5 0 0 1 .433-.531m9.366-2.583a.4.4 0 0 1 .4.4V11.5a.5.5 0 0 1-1 0V6.517a.4.4 0 0 1 .4-.4z" /><path d="M7.42 14.73a.5.5 0 0 1-.42-.56l.4-4a.5.5 0 1 1 .99.1l-.4 4a.5.5 0 0 1-.57.46z" /></svg>
    }
  ];

  // Map to soft transparent background colors
  const softColors: Record<string, string> = {
    'success': 'rgba(34, 197, 94, 0.1)',
    'info': 'rgba(6, 182, 212, 0.1)',
    'warning': 'rgba(234, 179, 8, 0.1)',
    'primary': 'rgba(59, 130, 246, 0.1)'
  };
  const textColors: Record<string, string> = {
    'success': '#4ade80',
    'info': '#22d3ee',
    'warning': '#facc15',
    'primary': '#60a5fa'
  };

  // Hero Section Web3
  const Hero: React.FC = () => (
    <div className="text-center py-5 position-relative overflow-hidden" style={{ minHeight: '650px', display: 'flex', alignItems: 'center' }}>
      {/* Background Image - Original Colors */}
      <div style={{
        position: 'absolute',
        top: 0, left: 0, right: 0, bottom: 0,
        backgroundImage: 'url(https://images.unsplash.com/photo-1544084944-15269ec7b5a0?q=80&w=2070&auto=format&fit=crop)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        zIndex: 0,
      }}></div>

      {/* Dark overlay for readability */}
      <div style={{
        position: 'absolute',
        top: 0, left: 0, right: 0, bottom: 0,
        background: 'rgba(0, 0, 0, 0.5)',
        zIndex: 0,
      }}></div>

      {/* Dynamic Glow Sphere */}
      <div style={{
        position: 'absolute',
        top: '30%',
        left: '50%',
        transform: 'translateX(-50%)',
        width: '500px',
        height: '500px',
        background: 'radial-gradient(circle, rgba(59, 130, 246, 0.3) 0%, transparent 70%)',
        filter: 'blur(80px)',
        zIndex: 0
      }}></div>

      <Container style={{ zIndex: 1, position: 'relative', marginTop: '40px' }}>
        <div className="py-4">
          <h1 className="display-1 fw-bold mb-4 text-white" style={{ letterSpacing: '-0.04em', lineHeight: '1.1' }}>
            <span className="text-gradient">Gestión Tributaria</span> <br />
            <span style={{ color: '#60a5fa' }}>Digital</span>
          </h1>

          <div className="d-flex justify-content-center mb-5">
            <div className="badge rounded-pill bg-primary bg-opacity-10 text-primary px-4 py-2 border border-primary border-opacity-20" style={{ letterSpacing: '0.05em', fontWeight: 600 }}>
              Oficina Virtual 2026
            </div>
          </div>

          <p className="fs-5 text-white col-md-8 mx-auto mb-5 fw-light" style={{ lineHeight: '1.8', maxWidth: '700px', opacity: 0.9 }}>
            Plataforma oficial de la Comuna de Villa Traful. Realice sus pagos y trámites de forma ágil, segura y transparente bajo estándares de nueva generación.
          </p>
          <div className="d-flex justify-content-center gap-3">
            <Button variant="light" size="lg" className="rounded-pill px-5 fw-bold shadow-lg" onClick={() => document.getElementById('services')?.scrollIntoView({ behavior: 'smooth' })}>
              Comenzar Trámite
            </Button>
            <Button variant="outline-light" size="lg" className="rounded-pill px-4 fw-bold border-opacity-25" onClick={() => window.open('https://wa.me/5492944556151', '_blank')}>
              Contacto Directo
            </Button>
          </div>
        </div>
      </Container>
    </div>
  );

  return (
    <div className="pb-5">
      <Hero />

      <Container id="services" className="py-2 my-4" style={{ position: 'relative', zIndex: 10 }}>
        {/* Changed column sizing to ensure all cards fit well */}
        <Row xs={1} sm={2} md={3} lg={5} className="g-4 justify-content-center">
          {services.map((service: any) => (
            <Col key={service.id}>
              <div
                className={`glass-card p-2 h-100 d-flex flex-column border-0 glow-on-hover ${service.disabled ? 'opacity-50' : ''}`}
                style={{ '--glow-color': service.glowColor } as React.CSSProperties}
                onMouseMove={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const x = e.clientX - rect.left;
                  const y = e.clientY - rect.top;
                  e.currentTarget.style.setProperty('--x', `${x}px`);
                  e.currentTarget.style.setProperty('--y', `${y}px`);
                }}
              >
                <div className="p-4 flex-grow-1 text-center">
                  <div className={`mb-4 p-3 rounded-circle d-inline-block`} style={{ width: '64px', height: '64px', backgroundColor: softColors[service.variant] || softColors.primary, color: textColors[service.variant] || textColors.primary }}>
                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                      {service.icon}
                    </div>
                  </div>
                  {/* Adjusted font size for title and description */}
                  <h3 className="fw-bold h6 mb-3 text-dark letter-spacing-1">{service.title}</h3>
                  <p className="text-muted" style={{ fontSize: '0.8125rem', lineHeight: '1.5' }}>{service.description}</p>
                </div>
                <div className="p-4 pt-0">
                  <Button
                    variant="light"
                    className="w-100 py-2 fw-bold"
                    style={{
                      borderRadius: '10px',
                      backgroundColor: softColors[service.variant] || softColors.primary,
                      color: textColors[service.variant] || textColors.primary,
                      border: 'none',
                    }}
                    onClick={() => {
                      if (service.disabled) return;
                      if (service.externalUrl) {
                        window.open(service.externalUrl, '_blank');
                      } else if (service.id === PaymentSystem.OTRAS) {
                        navigate('/plan-de-pago');
                      } else {
                        navigate(`/pagar/${service.id.toLowerCase()}`);
                      }
                    }}
                    disabled={service.disabled}
                    onMouseOver={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.backgroundColor = textColors[service.variant] || textColors.primary;
                      (e.currentTarget as HTMLButtonElement).style.color = '#030712';
                    }}
                    onMouseOut={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.backgroundColor = softColors[service.variant] || softColors.primary;
                      (e.currentTarget as HTMLButtonElement).style.color = textColors[service.variant] || textColors.primary;
                    }}
                  >
                    {service.disabled ? 'Próximamente' : service.id === PaymentSystem.OTRAS ? 'Ver Plan' : 'Acceder'}
                  </Button>
                </div>
              </div>
            </Col>
          ))}
        </Row>
      </Container>

      <div className="mt-5 py-5 border-top border-bottom" style={{ background: 'rgba(0,0,0,0.03)', borderColor: 'rgba(0,0,0,0.1) !important' }}>
        <Container>
          <Row className="text-center g-4">
            <Col md={4}>
              <div className="text-primary mb-3">
                <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" fill="currentColor" className="bi bi-shield-check" viewBox="0 0 16 16"><path d="M5.338 1.59a61.44 61.44 0 0 0-2.837.856.481.481 0 0 0-.328.39c-.554 4.157.726 7.19 2.253 9.188a10.725 10.725 0 0 0 2.287 2.233c.346.244.652.42.893.533.12.057.218.095.293.118a.55.55 0 0 0 .101.025.615.615 0 0 0 .1-.025c.076-.023.174-.06.294-.118.24-.113.545-.29.893-.533a10.726 10.726 0 0 0 2.287-2.233c1.527-1.997 2.807-5.031 2.253-9.188a.48.48 0 0 0-.328-.39c-.651-.213-1.75-.56-2.837-.855C9.552 1.29 8.531 1.067 8 1.067c-.53 0-1.552.223-2.662.524zM5.072.56C6.157.265 7.31 0 8 0s1.843.265 2.928.56c1.11.3 2.229.655 2.887.87a1.54 1.54 0 0 1 1.044 1.262c.596 4.477-.787 7.795-2.46 9.99a11.775 11.775 0 0 1-2.517 2.453 7.016 7.016 0 0 1-1.048.625c-.28.132-.581.24-.829.24s-.548-.108-.829-.24a7.015 7.015 0 0 1-1.048-.625 11.777 11.777 0 0 1-2.517-2.453C1.928 10.487.545 7.169 1.141 2.692A1.54 1.54 0 0 1 2.185 1.43 62.456 62.456 0 0 1 5.072.56z" /><path d="M10.854 5.146a.5.5 0 0 1 0 .708l-3 3a.5.5 0 0 1-.708 0l-1.5-1.5a.5.5 0 1 1 .708-.708L7.5 7.793l2.646-2.647a.5.5 0 0 1 .708 0z" /></svg>
              </div>
              <h5 className="fw-bold text-dark h6">Pago Seguro</h5>
              <p className="text-muted small">Transacciones protegidas con estándares bancarios de última generación.</p>
            </Col>
            <Col md={4}>
              <div className="text-primary mb-3">
                <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" fill="currentColor" className="bi bi-lightning-charge" viewBox="0 0 16 16"><path d="M11.251.068a.5.5 0 0 1 .227.58L9.677 7.5H13.5a.5.5 0 0 1 .364.843l-8 8.5a.5.5 0 0 1-.842-.49L6.323 9.5H2.5a.5.5 0 0 1-.364-.843l8-8.5a.5.5 0 0 1 .615-.09z" /></svg>
              </div>
              <h5 className="fw-bold text-dark h6">Gestión Ágil</h5>
              <p className="text-muted small">Procesamiento inmediato y notificaciones en tiempo real.</p>
            </Col>
            <Col md={4}>
              <div className="text-primary mb-3">
                <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" fill="currentColor" className="bi bi-people" viewBox="0 0 16 16"><path d="M15 14s1 0 1-1-1-4-5-4-5 3-5 4 1 1 1 1h8zm-7.978-1A.261.261 0 0 1 7 12.996c.001-.264.167-1.03.76-1.72C8.312 10.629 9.282 10 11 10c1.717 0 2.687.63 3.24 1.276.593.69.758 1.457.76 1.72l-.008.002a.274.274 0 0 1-.014.002H7.022zM11 7a2 2 0 1 0 0-4 2 2 0 0 0 0 4zm3-2a3 3 0 1 1-6 0 3 3 0 0 1 6 0zM6.936 9.28a5.88 5.88 0 0 0-1.23-.247A7.35 7.35 0 0 0 5 9c-4 0-5 3-5 4 0 .667.333 1 1 1h4.216A2.238 2.238 0 0 1 5 13c0-1.01.677-2.041 1.03-2.927h.002c.361-.885.087-1.792-.096-2.793z" /></svg>
              </div>
              <h5 className="fw-bold text-dark h6">Soporte Continuo</h5>
              <p className="text-muted small">Atención personalizada y acompañamiento en cada paso.</p>
            </Col>
          </Row>
        </Container>
      </div>

      {/* Burbuja flotante de WhatsApp */}
      <Button
        variant="success"
        className="position-fixed shadow-lg rounded-circle d-flex align-items-center justify-content-center"
        style={{
          bottom: '30px',
          right: '30px',
          width: '60px',
          height: '60px',
          zIndex: 1000,
          animation: 'pulse 2s infinite',
          border: 'none',
          background: 'linear-gradient(135deg, #25D366 0%, #128C7E 100%)'
        }}
        onClick={() => {
          const message = encodeURIComponent('Hola, necesito consultar información.');
          window.open('https://wa.me/5492944556151?text=' + message, '_blank');
        }}
        title="Contactar por WhatsApp"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="white" viewBox="0 0 16 16">
          <path d="M13.601 2.326A7.854 7.854 0 0 0 7.994 0C3.627 0 .068 3.558.064 7.926c0 1.399.366 2.76 1.057 3.965L0 16l4.204-1.102a7.933 7.933 0 0 0 3.79.965h.004c4.368 0 7.926-3.558 7.93-7.93A7.898 7.898 0 0 0 13.6 2.326zM7.994 14.521a6.573 6.573 0 0 1-3.356-.92l-.24-.144-2.494.654.666-2.433-.156-.251a6.56 6.56 0 0 1-1.007-3.505c0-3.626 2.957-6.584 6.591-6.584a6.56 6.56 0 0 1 4.66 1.931 6.557 6.557 0 0 1 1.928 4.66c-.004 3.639-2.961 6.592-6.592 6.592zm3.615-4.934c-.197-.099-1.17-.578-1.353-.646-.182-.065-.315-.099-.445.099-.133.197-.513.646-.627.775-.114.133-.232.148-.43.05-.197-.1-.836-.308-1.592-.985-.59-.525-.985-1.175-1.103-1.372-.114-.198-.011-.304.088-.403.087-.088.197-.232.296-.346.1-.114.133-.198.198-.33.065-.134.034-.248-.015-.347-.05-.099-.445-1.076-.612-1.47-.16-.389-.323-.335-.445-.34-.114-.007-.247-.007-.38-.007a.729.729 0 0 0-.529.247c-.182.198-.691.677-.691 1.654 0 .977.71 1.916.81 2.049.098.133 1.394 2.132 3.383 2.992.47.205.84.326 1.129.418.475.152.904.129 1.246.08.38-.058 1.171-.48 1.338-.943.164-.464.164-.86.114-.943-.049-.084-.182-.133-.38-.232z" />
        </svg>
      </Button>

      <style>{`
        @keyframes pulse {
          0% {
            transform: scale(1);
            box-shadow: 0 0 0 0 rgba(37, 211, 102, 0.7);
          }
          70% {
            transform: scale(1.05);
            box-shadow: 0 0 0 10px rgba(37, 211, 102, 0);
          }
          100% {
            transform: scale(1);
            box-shadow: 0 0 0 0 rgba(37, 211, 102, 0);
          }
        }
      `}</style>
    </div>
  );
};

export default Home;