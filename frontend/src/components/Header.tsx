import React from 'react';
import { Link } from 'react-router-dom';
import { Navbar, Nav, Button, Container } from 'react-bootstrap';
import { LinkContainer } from 'react-router-bootstrap';

const Header: React.FC = () => {
  return (
    <Navbar expand="lg" className="fixed-top glass-header py-2">
      <Container>
        <LinkContainer to="/">
          <Navbar.Brand className="d-flex align-items-center">
            <div className="position-relative">
              <img
                src="/logo.png"
                alt="Villa Traful"
                style={{ height: '55px', width: 'auto', filter: 'drop-shadow(0 0 8px rgba(0,0,0,0.2))' }}
                className="me-3"
              />
            </div>
            <div>
              <h6 className="fw-bold text-dark mb-0 ls-tight" style={{ letterSpacing: '0.02em', fontSize: '0.95rem' }}>COMUNA DE VILLA TRAFUL</h6>
              <small className="text-muted text-uppercase" style={{ fontSize: '0.6rem', letterSpacing: '0.15em', fontWeight: 600 }}>Portal de Pagos Oficial</small>
            </div>
          </Navbar.Brand>
        </LinkContainer>
        <Navbar.Toggle aria-controls="basic-navbar-nav" className="border-0 shadow-none" />
        <Navbar.Collapse id="basic-navbar-nav">
          <Nav className="ms-auto align-items-center gap-2">
            <LinkContainer to="/">
              <Nav.Link className="nav-link-glass px-3">Inicio</Nav.Link>
            </LinkContainer>
            <LinkContainer to="/admin/stats-login">
              <Button variant="outline-dark" size="sm" className="rounded-pill px-4 fw-medium">Dashboard</Button>
            </LinkContainer>
            <LinkContainer to="/staff/login">
              <Button variant="outline-dark" size="sm" className="rounded-pill px-4 fw-medium">Acceso Personal</Button>
            </LinkContainer>
            <LinkContainer to="/recursos-humanos">
              <Button variant="outline-dark" size="sm" className="rounded-pill px-4 fw-medium">Recursos Humanos</Button>
            </LinkContainer>
          </Nav>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
};

export default Header;
