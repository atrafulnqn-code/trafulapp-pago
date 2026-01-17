import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Container, Row, Col, Card, Form, Button, Alert } from 'react-bootstrap';

const API_BASE_URL = (window as any)._env_?.VITE_API_BASE_URL || import.meta.env.VITE_API_BASE_URL || 'http://localhost:10000/api';

const StatsLogin: React.FC = () => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/admin/stats-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });

      if (response.ok) {
        localStorage.setItem('statsAuth', 'true');
        navigate('/admin/stats');
      } else {
        setError('Acceso denegado. Verifique la clave.');
      }
    } catch (err) {
      setError('Error de conexión con el servidor.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container className="py-5 mt-5">
      <Row className="justify-content-center py-5">
        <Col md={6} lg={4}>
          <div className="glass-card p-5 rounded-3 border-0 text-center">
            <div className="mb-4 text-primary">
                <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" fill="currentColor" className="bi bi-graph-up-arrow" viewBox="0 0 16 16">
                    <path fillRule="evenodd" d="M0 0h1v15h15v1H0V0Zm10 3.5a.5.5 0 0 1 .5-.5h4a.5.5 0 0 1 .5.5v4a.5.5 0 0 1-1 0V4.9l-3.613 4.417a.5.5 0 0 1-.74.037L7.06 6.767l-3.656 5.027a.5.5 0 0 1-.808-.574l4-5.5a.5.5 0 0 1 .73-.06l2.327 2.327L12.634 4.5H10.5a.5.5 0 0 1-.5-.5Z"/>
                </svg>
            </div>
            <h2 className="fw-bold mb-2">Panel Autorizado</h2>
            <p className="text-muted mb-4 small">Ingrese la clave de seguridad institucional</p>
            
            {error && <Alert variant="danger" className="py-2 small">{error}</Alert>}
            
            <Form onSubmit={handleSubmit}>
              <Form.Group className="mb-4">
                <Form.Control 
                  type="password" 
                  placeholder="••••••••" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="text-center bg-light border-0 py-3"
                  required
                />
              </Form.Group>
              <Button variant="primary" type="submit" className="w-100 py-3 fw-bold rounded-pill shadow-sm" disabled={loading}>
                {loading ? 'Verificando...' : 'Acceder al Dashboard'}
              </Button>
            </Form>
          </div>
        </Col>
      </Row>
    </Container>
  );
};

export default StatsLogin;