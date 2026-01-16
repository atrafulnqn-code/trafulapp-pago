import React from 'react';
import { Link } from 'react-router-dom';
import { Navbar, Nav, Button, Container } from 'react-bootstrap';
import { LinkContainer } from 'react-router-bootstrap';

const Header: React.FC = () => {
  return (
    <Navbar expand="lg" className="fixed-top glass-header py-3">
      <Container>
        <LinkContainer to="/">
          <Navbar.Brand className="d-flex align-items-center">
            <div className="bg-primary text-white rounded-circle p-2 me-3 d-flex align-items-center justify-content-center shadow-sm" style={{ width: '40px', height: '40px', fontSize: '1rem', background: 'var(--primary-color)' }}>
                <span className="fw-bold">VT</span>
            </div>
            <div>
                <h6 className="fw-bold text-dark mb-0 ls-tight">COMUNA DE VILLA TRAFUL</h6>
                <small className="text-muted text-uppercase" style={{ fontSize: '0.65rem', letterSpacing: '0.1em' }}>Portal de Pagos Oficial</small>
            </div>
          </Navbar.Brand>
        </LinkContainer>
        <Navbar.Toggle aria-controls="basic-navbar-nav" className="border-0 shadow-none" />
        <Navbar.Collapse id="basic-navbar-nav">
          <Nav className="ms-auto align-items-center gap-3">
            <LinkContainer to="/">
              <Nav.Link className="fw-medium text-secondary">Inicio</Nav.Link>
            </LinkContainer>
            <LinkContainer to="/staff/login">
              <Button variant="outline-primary" size="sm" className="rounded-pill px-4 fw-semibold border-2">Acceso Personal</Button>
            </LinkContainer>
          </Nav>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
};

export default Header;
