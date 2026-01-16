import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Container, Row, Col, Card, Form, Button, Alert } from 'react-bootstrap';

// Configuración de URL de API robusta:
// 1. Intenta usar window._env_ (Docker runtime). Se valida que no sea el placeholder sin reemplazar.
// 2. Si falla, usa import.meta.env (Vite build time).
// 3. Si falla, fallback a localhost.
// @ts-ignore
const getApiBaseUrl = () => {
    // @ts-ignore
    const runtimeUrl = window._env_?.VITE_API_BASE_URL;
    if (runtimeUrl && runtimeUrl !== '__VITE_API_BASE_URL__') {
        return runtimeUrl;
    }
    return import.meta.env.VITE_API_BASE_URL || 'http://localhost:10000/api';
};

const API_BASE_URL = getApiBaseUrl();

const StaffLogin: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // Usamos el mismo endpoint de validación de clave por ahora
      const response = await fetch(`${API_BASE_URL}/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });

      const data = await response.json();

      if (response.ok) {
        localStorage.setItem('staffUser', username); // Guardamos como STAFF
        // Registrar acceso en el servidor
        await fetch(`${API_BASE_URL}/staff/register_access`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username }),
        });
        navigate('/staff/dashboard');
      } else {
        setError('Clave incorrecta.');
      }
    } catch (err) {
      setError('Error de conexión.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container className="py-5 mt-5">
      <Row className="justify-content-center">
        <Col md={6} lg={4}>
          <Card className="shadow-lg border-0 rounded-3">
            <Card.Body className="p-4 p-md-5">
              <div className="text-center mb-4">
                <div className="bg-success text-white rounded-circle d-inline-flex align-items-center justify-content-center mb-3" style={{ width: '60px', height: '60px' }}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" fill="currentColor" className="bi bi-person-badge" viewBox="0 0 16 16">
                    <path d="M6.5 2a.5.5 0 0 0 0 1h3a.5.5 0 0 0 0-1h-3zM11 8a3 3 0 1 1-6 0 3 3 0 0 1 6 0z"/>
                    <path d="M4.5 0A2.5 2.5 0 0 0 2 2.5V14a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V2.5A2.5 2.5 0 0 0 11.5 0h-7zM3 2.5A1.5 1.5 0 0 1 4.5 1h7A1.5 1.5 0 0 1 13 2.5v10.795a4.2 4.2 0 0 0-.776-.492C11.392 12.387 10.063 12 8 12s-3.392.387-4.224.803a4.2 4.2 0 0 0-.776.492V2.5z"/>
                  </svg>
                </div>
                <h3 className="fw-bold">Acceso Personal</h3>
                <p className="text-muted">Plataforma de Gestión</p>
              </div>
              
              {error && <Alert variant="danger" className="text-center">{error}</Alert>}
              
              <Form onSubmit={handleSubmit}>
                <Form.Group className="mb-3" controlId="staffUsername">
                  <Form.Label>Nombre y Apellido</Form.Label>
                  <Form.Control
                    type="text"
                    placeholder="Ej: Maria Gonzalez"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    size="lg"
                    disabled={loading}
                  />
                </Form.Group>

                <Form.Group className="mb-4" controlId="staffPassword">
                  <Form.Label>Clave de Acceso</Form.Label>
                  <Form.Control
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    size="lg"
                    disabled={loading}
                  />
                </Form.Group>
                
                <Button variant="success" type="submit" className="w-100 py-3 fw-bold rounded-3" disabled={loading}>
                  {loading ? 'Verificando...' : 'Ingresar'}
                </Button>
              </Form>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default StaffLogin;