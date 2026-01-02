import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Container, Row, Col, Card, Form, Button, Alert } from 'react-bootstrap';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:10000/api';

const AdminLogin: React.FC = () => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/admin/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ password }),
      });

      const data = await response.json();

      if (response.ok) {
        // En una aplicación real, aquí se guardaría el token o se gestionaría la sesión
        // Por ahora, simplemente redirigimos
        navigate('/admin/payments');
      } else {
        setError(data.message || 'Error al iniciar sesión. Inténtelo de nuevo.');
      }
    } catch (err) {
      setError('No se pudo conectar con el servidor. Verifique su conexión.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container className="py-5">
      <Row className="justify-content-center">
        <Col md={6} lg={4}>
          <Card className="shadow-lg">
            <Card.Body className="p-4 p-md-5">
              <h3 className="text-center fw-bold mb-4">Acceso Administrador</h3>
              {error && <Alert variant="danger">{error}</Alert>}
              <Form onSubmit={handleSubmit}>
                <Form.Group className="mb-3" controlId="adminPassword">
                  <Form.Label>Contraseña</Form.Label>
                  <Form.Control
                    type="password"
                    placeholder="Ingrese la contraseña de administrador"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    size="lg"
                    disabled={loading}
                  />
                </Form.Group>
                <Button variant="primary" type="submit" className="w-100" size="lg" disabled={loading}>
                  {loading ? 'Cargando...' : 'Iniciar Sesión'}
                </Button>
              </Form>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default AdminLogin;