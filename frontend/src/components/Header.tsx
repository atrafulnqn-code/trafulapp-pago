import React from 'react';
import { Link } from 'react-router-dom';
import { Navbar, Nav, Button, Container } from 'react-bootstrap';
import { LinkContainer } from 'react-router-bootstrap';

const Header: React.FC = () => {
  return (
    <Navbar bg="light" expand="lg" className="border-bottom shadow-sm sticky-top">
      <Container>
        <LinkContainer to="/">
          <Navbar.Brand className="d-flex align-items-center">
            <div className="bg-primary text-white rounded-3 p-2 me-2 d-flex align-items-center justify-content-center" style={{ width: '45px', height: '45px', fontSize: '1.2rem' }}>
                <span className="fw-bold">VT</span>
            </div>
            <div>
                <h4 className="fw-bold text-primary mb-0 me-0">Comuna de Villa Traful</h4>
                <small className="text-muted text-uppercase" style={{ fontSize: '0.7rem', letterSpacing: '0.05em' }}>Portal de Pagos Oficial</small>
            </div>
          </Navbar.Brand>
        </LinkContainer>
        <Navbar.Toggle aria-controls="basic-navbar-nav" />
        <Navbar.Collapse id="basic-navbar-nav">
          <Nav className="ms-auto align-items-center">
            <LinkContainer to="/">
              <Nav.Link className="me-3">Inicio</Nav.Link>
            </LinkContainer>
            <Button variant="primary" className="rounded-pill px-4">Mi Gestión</Button>
          </Nav>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
};

export default Header;
