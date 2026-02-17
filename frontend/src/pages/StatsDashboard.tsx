import React, { useEffect, useState } from 'react';
import { Container, Row, Col, Card, Spinner, Alert, Button } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend, Cell, PieChart, Pie } from 'recharts';

// Configuración de URL de API robusta
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

// Paleta de colores moderna y vibrante
const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];
const GRADIENT_COLORS = {
  primary: { start: '#3B82F6', end: '#1D4ED8' },
  success: { start: '#10B981', end: '#059669' },
  warning: { start: '#F59E0B', end: '#D97706' },
  danger: { start: '#EF4444', end: '#DC2626' },
  purple: { start: '#8B5CF6', end: '#7C3AED' },
};

// Tooltip personalizado con formato ARS
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-3 rounded-lg shadow-lg border border-gray-200">
        <p className="font-semibold text-gray-800 mb-1">{label}</p>
        <p className="text-blue-600 font-bold">
          ${payload[0].value.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </p>
      </div>
    );
  }
  return null;
};

const StatsDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/admin/stats`);
      const result = await response.json();
      if (response.ok) {
        setData(result);
        setError(null);
      } else {
        setError(result.error || 'Error al cargar estadísticas');
      }
    } catch (err) {
      setError('Error de conexión con el servidor');
      console.error('Error fetching stats:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (localStorage.getItem('statsAuth') !== 'true') {
      navigate('/admin/stats-login');
      return;
    }
    fetchStats();

    // Auto-actualización cada 5 minutos
    const interval = setInterval(fetchStats, 300000);
    return () => clearInterval(interval);
  }, [navigate]);

  if (loading) {
    return (
      <div className="d-flex flex-column justify-content-center align-items-center vh-100 bg-gradient-to-br from-blue-50 to-indigo-100">
        <Spinner animation="border" variant="primary" style={{ width: '3rem', height: '3rem' }} />
        <p className="mt-3 text-gray-600 fw-semibold">Cargando estadísticas...</p>
      </div>
    );
  }

  if (error) {
    return (
      <Container className="mt-5 pt-5">
        <Alert variant="danger" className="shadow-sm">
          <Alert.Heading>⚠️ Error</Alert.Heading>
          <p>{error}</p>
          <hr />
          <div className="d-flex gap-2">
            <Button variant="outline-danger" size="sm" onClick={fetchStats}>
              Reintentar
            </Button>
            <Button variant="outline-secondary" size="sm" onClick={() => navigate('/')}>
              Volver al inicio
            </Button>
          </div>
        </Alert>
      </Container>
    );
  }

  const { summary, daily_chart, monthly_chart } = data;

  return (
    <Container className="py-5 mt-5" fluid style={{ background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)', minHeight: '100vh' }}>
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4 bg-white p-4 rounded-3 shadow-sm">
        <div>
          <h2 className="fw-bold text-dark mb-1">📊 Dashboard de Recaudación 2026</h2>
          <p className="text-muted mb-0 small">Municipalidad de Villa Traful</p>
        </div>
        <div className="d-flex gap-2">
          <Button
            variant="outline-primary"
            size="sm"
            onClick={fetchStats}
            className="d-flex align-items-center gap-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
              <path fillRule="evenodd" d="M8 3a5 5 0 1 0 4.546 2.914.5.5 0 0 1 .908-.417A6 6 0 1 1 8 2v1z" />
              <path d="M8 4.466V.534a.25.25 0 0 1 .41-.192l2.36 1.966c.12.1.12.284 0 .384L8.41 4.658A.25.25 0 0 1 8 4.466z" />
            </svg>
            Actualizar
          </Button>
          <Button
            variant="outline-danger"
            size="sm"
            onClick={() => {
              localStorage.removeItem('statsAuth');
              navigate('/');
            }}
          >
            Cerrar
          </Button>
        </div>
      </div>

      {/* KPI Cards con animación */}
      <Row className="g-4 mb-5">
        <Col md={3}>
          <Card className="border-0 shadow-lg h-100 overflow-hidden position-relative"
            style={{
              background: `linear-gradient(135deg, ${GRADIENT_COLORS.primary.start} 0%, ${GRADIENT_COLORS.primary.end} 100%)`,
              transform: 'translateY(0)',
              transition: 'transform 0.3s ease'
            }}
            onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-5px)'}
            onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
          >
            <Card.Body className="text-white p-4">
              <div className="d-flex justify-content-between align-items-start mb-3">
                <div className="opacity-75 small fw-semibold">Recaudación Total Año</div>
                <div className="bg-white bg-opacity-25 rounded-circle p-2">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 16 16">
                    <path d="M4 10.781c.148 1.667 1.513 2.85 3.591 3.003V15h1.043v-1.216c2.27-.179 3.678-1.438 3.678-3.3 0-1.59-.947-2.51-2.956-3.028l-.722-.187V3.467c1.122.11 1.879.714 2.07 1.616h1.47c-.166-1.6-1.54-2.748-3.54-2.875V1H7.591v1.233c-1.939.23-3.27 1.472-3.27 3.156 0 1.454.966 2.483 2.661 2.917l.61.162v4.031c-1.149-.17-1.94-.8-2.131-1.718H4zm3.391-3.836c-1.043-.263-1.6-.825-1.6-1.616 0-.944.704-1.641 1.8-1.828v3.495l-.2-.05zm1.591 1.872c1.287.323 1.852.859 1.852 1.769 0 1.097-.826 1.828-2.2 1.939V8.73l.348.086z" />
                  </svg>
                </div>
              </div>
              <div className="h2 fw-bold mb-0">
                ${summary.total_anual.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
              </div>
            </Card.Body>
          </Card>
        </Col>

        <Col md={3}>
          <Card className="border-0 shadow-lg h-100 overflow-hidden"
            style={{
              background: `linear-gradient(135deg, ${GRADIENT_COLORS.success.start} 0%, ${GRADIENT_COLORS.success.end} 100%)`,
              transform: 'translateY(0)',
              transition: 'transform 0.3s ease'
            }}
            onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-5px)'}
            onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
          >
            <Card.Body className="text-white p-4">
              <div className="d-flex justify-content-between align-items-start mb-3">
                <div className="opacity-75 small fw-semibold">Total Transacciones</div>
                <div className="bg-white bg-opacity-25 rounded-circle p-2">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 16 16">
                    <path d="M1 2.5A1.5 1.5 0 0 1 2.5 1h3A1.5 1.5 0 0 1 7 2.5v3A1.5 1.5 0 0 1 5.5 7h-3A1.5 1.5 0 0 1 1 5.5v-3zM2.5 2a.5.5 0 0 0-.5.5v3a.5.5 0 0 0 .5.5h3a.5.5 0 0 0 .5-.5v-3a.5.5 0 0 0-.5-.5h-3zm6.5.5A1.5 1.5 0 0 1 10.5 1h3A1.5 1.5 0 0 1 15 2.5v3A1.5 1.5 0 0 1 13.5 7h-3A1.5 1.5 0 0 1 9 5.5v-3zm1.5-.5a.5.5 0 0 0-.5.5v3a.5.5 0 0 0 .5.5h3a.5.5 0 0 0 .5-.5v-3a.5.5 0 0 0-.5-.5h-3zM1 10.5A1.5 1.5 0 0 1 2.5 9h3A1.5 1.5 0 0 1 7 10.5v3A1.5 1.5 0 0 1 5.5 15h-3A1.5 1.5 0 0 1 1 13.5v-3zm1.5-.5a.5.5 0 0 0-.5.5v3a.5.5 0 0 0 .5.5h3a.5.5 0 0 0 .5-.5v-3a.5.5 0 0 0-.5-.5h-3zm6.5.5A1.5 1.5 0 0 1 10.5 9h3a1.5 1.5 0 0 1 1.5 1.5v3a1.5 1.5 0 0 1-1.5 1.5h-3A1.5 1.5 0 0 1 9 13.5v-3zm1.5-.5a.5.5 0 0 0-.5.5v3a.5.5 0 0 0 .5.5h3a.5.5 0 0 0 .5-.5v-3a.5.5 0 0 0-.5-.5h-3z" />
                  </svg>
                </div>
              </div>
              <div className="h2 fw-bold mb-0">{summary.cantidad_operaciones.total}</div>
            </Card.Body>
          </Card>
        </Col>

        <Col md={3}>
          <Card className="border-0 shadow-lg h-100 overflow-hidden"
            style={{
              background: `linear-gradient(135deg, ${GRADIENT_COLORS.warning.start} 0%, ${GRADIENT_COLORS.warning.end} 100%)`,
              transform: 'translateY(0)',
              transition: 'transform 0.3s ease'
            }}
            onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-5px)'}
            onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
          >
            <Card.Body className="text-white p-4">
              <div className="d-flex justify-content-between align-items-start mb-3">
                <div className="opacity-75 small fw-semibold">Ingresos x Deudas</div>
                <div className="bg-white bg-opacity-25 rounded-circle p-2">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 16 16">
                    <path d="M0 4a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V4zm2-1a1 1 0 0 0-1 1v1h14V4a1 1 0 0 0-1-1H2zm13 4H1v5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V7z" />
                    <path d="M2 10a1 1 0 0 1 1-1h1a1 1 0 0 1 1 1v1a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1v-1z" />
                  </svg>
                </div>
              </div>
              <div className="h2 fw-bold mb-0">
                ${summary.totales_categoria.deudas.toLocaleString('es-AR')}
              </div>
            </Card.Body>
          </Card>
        </Col>

        <Col md={3}>
          <Card className="border-0 shadow-lg h-100 overflow-hidden"
            style={{
              background: `linear-gradient(135deg, ${GRADIENT_COLORS.purple.start} 0%, ${GRADIENT_COLORS.purple.end} 100%)`,
              transform: 'translateY(0)',
              transition: 'transform 0.3s ease'
            }}
            onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-5px)'}
            onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
          >
            <Card.Body className="text-white p-4">
              <div className="d-flex justify-content-between align-items-start mb-3">
                <div className="opacity-75 small fw-semibold">Ingresos x Recaudación</div>
                <div className="bg-white bg-opacity-25 rounded-circle p-2">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 16 16">
                    <path d="M1 3a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1H1zm7 8a2 2 0 1 0 0-4 2 2 0 0 0 0 4z" />
                    <path d="M0 5a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H1a1 1 0 0 1-1-1V5zm3 0a2 2 0 0 1-2 2v4a2 2 0 0 1 2 2h10a2 2 0 0 1 2-2V7a2 2 0 0 1-2-2H3z" />
                  </svg>
                </div>
              </div>
              <div className="h2 fw-bold mb-0">
                ${summary.totales_categoria.recaudacion.toLocaleString('es-AR')}
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Gráficos */}
      <Row className="g-4">
        {/* Gráfico 1: Recaudación Diaria */}
        <Col lg={8}>
          <Card className="border-0 shadow-sm p-4 h-100">
            <h5 className="fw-bold mb-4 text-dark">📈 Tendencia de Recaudación Diaria</h5>
            <div style={{ width: '100%', height: 320 }}>
              <ResponsiveContainer>
                <AreaChart data={daily_chart}>
                  <defs>
                    <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.1} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                  <XAxis
                    dataKey="date"
                    fontSize={12}
                    tickMargin={10}
                    stroke="#6B7280"
                  />
                  <YAxis
                    fontSize={12}
                    stroke="#6B7280"
                    tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="total"
                    stroke="#3B82F6"
                    strokeWidth={3}
                    fillOpacity={1}
                    fill="url(#colorTotal)"
                    animationDuration={1500}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </Col>

        {/* Gráfico 2: Operaciones por Tipo */}
        <Col lg={4}>
          <Card className="border-0 shadow-sm p-4 h-100">
            <h5 className="fw-bold mb-4 text-dark">📊 Operaciones por Tipo</h5>
            <div style={{ width: '100%', height: 320 }}>
              <ResponsiveContainer>
                <BarChart data={[
                  { name: 'Deudas', valor: summary.cantidad_operaciones.deudas },
                  { name: 'Tasas', valor: summary.cantidad_operaciones.contributivos },
                  { name: 'Manual', valor: summary.cantidad_operaciones.recaudacion },
                  { name: 'Patente', valor: summary.cantidad_operaciones.patente }
                ]}>
                  <XAxis dataKey="name" fontSize={11} stroke="#6B7280" />
                  <YAxis fontSize={11} stroke="#6B7280" />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="valor" radius={[8, 8, 0, 0]} animationDuration={1500}>
                    {COLORS.map((color, index) => (
                      <Cell key={`cell-${index}`} fill={color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </Col>

        {/* Gráfico 3: Cierre Mensual */}
        <Col md={6}>
          <Card className="border-0 shadow-sm p-4">
            <h5 className="fw-bold mb-4 text-dark">📅 Cierre Mensual Progresivo</h5>
            <div style={{ width: '100%', height: 280 }}>
              <ResponsiveContainer>
                <BarChart data={monthly_chart}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                  <XAxis dataKey="month" stroke="#6B7280" />
                  <YAxis stroke="#6B7280" tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar
                    dataKey="total"
                    fill="#10B981"
                    radius={[8, 8, 0, 0]}
                    animationDuration={1500}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </Col>

        {/* Gráfico 4: Distribución de Ingresos */}
        <Col md={6}>
          <Card className="border-0 shadow-sm p-4">
            <h5 className="fw-bold mb-4 text-dark">💰 Ingresos por Categoría</h5>
            <div style={{ width: '100%', height: 280 }}>
              <ResponsiveContainer>
                <PieChart>
                  <Pie
                    data={[
                      { name: 'Deudas', value: summary.totales_categoria.deudas },
                      { name: 'Contributivos', value: summary.totales_categoria.contributivos },
                      { name: 'Recaudación', value: summary.totales_categoria.recaudacion },
                      { name: 'Patente', value: summary.totales_categoria.patente }
                    ]}
                    cx="50%" cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    animationDuration={1500}
                  >
                    {COLORS.map((color, index) => (
                      <Cell key={`cell-${index}`} fill={color} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                  <Legend
                    verticalAlign="bottom"
                    height={36}
                    formatter={(value, entry: any) => (
                      <span className="text-sm">
                        {value}: ${entry.payload.value.toLocaleString('es-AR')}
                      </span>
                    )}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default StatsDashboard;