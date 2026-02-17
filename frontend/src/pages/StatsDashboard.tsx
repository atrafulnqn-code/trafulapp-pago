import React, { useEffect, useState } from 'react';
import { Container, Row, Col, Card, Spinner, Alert, Button } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

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

// Paleta de colores moderna
const GRADIENT_COLORS = {
  primary: { start: '#3B82F6', end: '#1D4ED8' },
  success: { start: '#10B981', end: '#059669' },
  warning: { start: '#F59E0B', end: '#D97706' },
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
        {payload[0].payload.cantidad && (
          <p className="text-gray-600 text-sm mt-1">
            {payload[0].payload.cantidad} registro{payload[0].payload.cantidad !== 1 ? 's' : ''}
          </p>
        )}
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

  const { recaudacion_tasas, daily_chart, monthly_chart, patentes, daily_chart_patentes, monthly_chart_patentes, planes_pago, daily_chart_planes, monthly_chart_planes, cobro_efectivo, daily_chart_rec_efectivo, daily_chart_pat_efectivo, monthly_chart_rec_efectivo, monthly_chart_pat_efectivo } = data;

  return (
    <Container className="py-5 mt-5" fluid style={{ background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)', minHeight: '100vh' }}>
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4 bg-white p-4 rounded-3 shadow-sm">
        <div>
          <h2 className="fw-bold text-dark mb-1">📊 Recaudación de Tasas y Derechos</h2>
          <p className="text-muted mb-0 small">Municipalidad de Villa Traful - Año 2026</p>
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

      {/* KPI Cards */}
      <Row className="g-4 mb-5">
        <Col md={6}>
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
                <div className="opacity-75 small fw-semibold">Total Registros</div>
                <div className="bg-white bg-opacity-25 rounded-circle p-2">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 16 16">
                    <path d="M1 2.5A1.5 1.5 0 0 1 2.5 1h3A1.5 1.5 0 0 1 7 2.5v3A1.5 1.5 0 0 1 5.5 7h-3A1.5 1.5 0 0 1 1 5.5v-3zM2.5 2a.5.5 0 0 0-.5.5v3a.5.5 0 0 0 .5.5h3a.5.5 0 0 0 .5-.5v-3a.5.5 0 0 0-.5-.5h-3zm6.5.5A1.5 1.5 0 0 1 10.5 1h3A1.5 1.5 0 0 1 15 2.5v3A1.5 1.5 0 0 1 13.5 7h-3A1.5 1.5 0 0 1 9 5.5v-3zm1.5-.5a.5.5 0 0 0-.5.5v3a.5.5 0 0 0 .5.5h3a.5.5 0 0 0 .5-.5v-3a.5.5 0 0 0-.5-.5h-3zM1 10.5A1.5 1.5 0 0 1 2.5 9h3A1.5 1.5 0 0 1 7 10.5v3A1.5 1.5 0 0 1 5.5 15h-3A1.5 1.5 0 0 1 1 13.5v-3zm1.5-.5a.5.5 0 0 0-.5.5v3a.5.5 0 0 0 .5.5h3a.5.5 0 0 0 .5-.5v-3a.5.5 0 0 0-.5-.5h-3zm6.5.5A1.5 1.5 0 0 1 10.5 9h3a1.5 1.5 0 0 1 1.5 1.5v3a1.5 1.5 0 0 1-1.5 1.5h-3A1.5 1.5 0 0 1 9 13.5v-3zm1.5-.5a.5.5 0 0 0-.5.5v3a.5.5 0 0 0 .5.5h3a.5.5 0 0 0 .5-.5v-3a.5.5 0 0 0-.5-.5h-3z" />
                  </svg>
                </div>
              </div>
              <div className="h2 fw-bold mb-0">{recaudacion_tasas.total_registros}</div>
              <div className="small opacity-75 mt-2">Registros completados</div>
            </Card.Body>
          </Card>
        </Col>

        <Col md={4}>
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
                <div className="opacity-75 small fw-semibold">Monto Total Recaudado</div>
                <div className="bg-white bg-opacity-25 rounded-circle p-2">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 16 16">
                    <path d="M4 10.781c.148 1.667 1.513 2.85 3.591 3.003V15h1.043v-1.216c2.27-.179 3.678-1.438 3.678-3.3 0-1.59-.947-2.51-2.956-3.028l-.722-.187V3.467c1.122.11 1.879.714 2.07 1.616h1.47c-.166-1.6-1.54-2.748-3.54-2.875V1H7.591v1.233c-1.939.23-3.27 1.472-3.27 3.156 0 1.454.966 2.483 2.661 2.917l.61.162v4.031c-1.149-.17-1.94-.8-2.131-1.718H4zm3.391-3.836c-1.043-.263-1.6-.825-1.6-1.616 0-.944.704-1.641 1.8-1.828v3.495l-.2-.05zm1.591 1.872c1.287.323 1.852.859 1.852 1.769 0 1.097-.826 1.828-2.2 1.939V8.73l.348.086z" />
                  </svg>
                </div>
              </div>
              <div className="h2 fw-bold mb-0">
                ${recaudacion_tasas.monto_total.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
              </div>
              <div className="small opacity-75 mt-2">Total año 2026</div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Gráfico de Barras - Recaudación por Día */}
      <Row className="g-4">
        <Col md={12}>
          <Card className="border-0 shadow-sm p-4">
            <div className="d-flex justify-content-between align-items-center mb-4">
              <h5 className="fw-bold text-dark mb-0">📅 Recaudación Diaria de Tasas y Derechos</h5>
              <span className="badge bg-primary">{daily_chart.length} días con actividad</span>
            </div>
            <div style={{ width: '100%', height: 450 }}>
              <ResponsiveContainer>
                <BarChart data={daily_chart} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                  <XAxis
                    dataKey="date"
                    fontSize={11}
                    angle={-45}
                    textAnchor="end"
                    height={80}
                    stroke="#6B7280"
                  />
                  <YAxis
                    fontSize={12}
                    stroke="#6B7280"
                    tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar
                    dataKey="total"
                    radius={[8, 8, 0, 0]}
                    animationDuration={1500}
                  >
                    {daily_chart.map((entry: any, index: number) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={`hsl(${220 + (index * 3) % 60}, 70%, ${50 + (index % 3) * 10}%)`}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-3 text-center text-muted small">
              Mostrando los últimos 60 días con actividad de recaudación
            </div>
          </Card>
        </Col>

        {/* Gráfico de Barras - Recaudación Mensual */}
        <Col md={12}>
          <Card className="border-0 shadow-sm p-4">
            <div className="d-flex justify-content-between align-items-center mb-4">
              <h5 className="fw-bold text-dark mb-0">📊 Recaudación Mensual de Tasas y Derechos</h5>
              <span className="badge bg-success">{monthly_chart.length} meses con actividad</span>
            </div>
            <div style={{ width: '100%', height: 400 }}>
              <ResponsiveContainer>
                <BarChart data={monthly_chart} margin={{ top: 20, right: 30, left: 20, bottom: 40 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                  <XAxis
                    dataKey="month"
                    fontSize={12}
                    stroke="#6B7280"
                  />
                  <YAxis
                    fontSize={12}
                    stroke="#6B7280"
                    tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar
                    dataKey="total"
                    radius={[8, 8, 0, 0]}
                    animationDuration={1500}
                  >
                    {monthly_chart.map((entry: any, index: number) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={`hsl(${140 + (index * 15) % 60}, 65%, ${45 + (index % 3) * 10}%)`}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-3 text-center text-muted small">
              Resumen mensual del año 2026
            </div>
          </Card>
        </Col>
      </Row>

      {/* ==================== SECCIÓN DE PAGO DE PATENTE ==================== */}
      <div className="mt-5 pt-4">
        <div className="d-flex justify-content-between align-items-center mb-4 bg-white p-4 rounded-3 shadow-sm">
          <div>
            <h2 className="fw-bold text-dark mb-1">🚗 Pago de Patente</h2>
            <p className="text-muted mb-0 small">Municipalidad de Villa Traful - Año 2026</p>
          </div>
        </div>

        {/* KPI Cards - Patentes */}
        <Row className="g-4 mb-5">
          <Col md={6}>
            <Card className="border-0 shadow-lg h-100 overflow-hidden position-relative"
              style={{
                background: `linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%)`,
                transform: 'translateY(0)',
                transition: 'transform 0.3s ease'
              }}
              onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-5px)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
            >
              <Card.Body className="text-white p-4">
                <div className="d-flex justify-content-between align-items-start mb-3">
                  <div className="opacity-75 small fw-semibold">Total Registros</div>
                  <div className="bg-white bg-opacity-25 rounded-circle p-2">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 16 16">
                      <path d="M3.5 0a.5.5 0 0 1 .5.5V1h8V.5a.5.5 0 0 1 1 0V1h1a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V3a2 2 0 0 1 2-2h1V.5a.5.5 0 0 1 .5-.5zM1 4v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V4H1z" />
                    </svg>
                  </div>
                </div>
                <div className="h2 fw-bold mb-0">{patentes.total_registros}</div>
                <div className="small opacity-75 mt-2">Registros de patentes</div>
              </Card.Body>
            </Card>
          </Col>

          <Col md={6}>
            <Card className="border-0 shadow-lg h-100 overflow-hidden"
              style={{
                background: `linear-gradient(135deg, #EC4899 0%, #DB2777 100%)`,
                transform: 'translateY(0)',
                transition: 'transform 0.3s ease'
              }}
              onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-5px)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
            >
              <Card.Body className="text-white p-4">
                <div className="d-flex justify-content-between align-items-start mb-3">
                  <div className="opacity-75 small fw-semibold">Monto Total Recaudado</div>
                  <div className="bg-white bg-opacity-25 rounded-circle p-2">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 16 16">
                      <path d="M4 10.781c.148 1.667 1.513 2.85 3.591 3.003V15h1.043v-1.216c2.27-.179 3.678-1.438 3.678-3.3 0-1.59-.947-2.51-2.956-3.028l-.722-.187V3.467c1.122.11 1.879.714 2.07 1.616h1.47c-.166-1.6-1.54-2.748-3.54-2.875V1H7.591v1.233c-1.939.23-3.27 1.472-3.27 3.156 0 1.454.966 2.483 2.661 2.917l.61.162v4.031c-1.149-.17-1.94-.8-2.131-1.718H4zm3.391-3.836c-1.043-.263-1.6-.825-1.6-1.616 0-.944.704-1.641 1.8-1.828v3.495l-.2-.05zm1.591 1.872c1.287.323 1.852.859 1.852 1.769 0 1.097-.826 1.828-2.2 1.939V8.73l.348.086z" />
                    </svg>
                  </div>
                </div>
                <div className="h2 fw-bold mb-0">
                  ${patentes.monto_total.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                </div>
                <div className="small opacity-75 mt-2">Total año 2026</div>
              </Card.Body>
            </Card>
          </Col>
        </Row>

        {/* Gráficos de Patentes */}
        <Row className="g-4">
          <Col md={12}>
            <Card className="border-0 shadow-sm p-4">
              <div className="d-flex justify-content-between align-items-center mb-4">
                <h5 className="fw-bold text-dark mb-0">📅 Pago de Patente Diario</h5>
                <span className="badge bg-primary">{daily_chart_patentes.length} días con actividad</span>
              </div>
              <div style={{ width: '100%', height: 450 }}>
                <ResponsiveContainer>
                  <BarChart data={daily_chart_patentes} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                    <XAxis
                      dataKey="date"
                      fontSize={11}
                      angle={-45}
                      textAnchor="end"
                      height={80}
                      stroke="#6B7280"
                    />
                    <YAxis
                      fontSize={12}
                      stroke="#6B7280"
                      tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar
                      dataKey="total"
                      radius={[8, 8, 0, 0]}
                      animationDuration={1500}
                    >
                      {daily_chart_patentes.map((entry: any, index: number) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={`hsl(${280 + (index * 3) % 60}, 70%, ${50 + (index % 3) * 10}%)`}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-3 text-center text-muted small">
                Mostrando los últimos 60 días con actividad de pago de patente
              </div>
            </Card>
          </Col>

          {/* Gráfico de Barras - Patentes Mensual */}
          <Col md={12}>
            <Card className="border-0 shadow-sm p-4">
              <div className="d-flex justify-content-between align-items-center mb-4">
                <h5 className="fw-bold text-dark mb-0">📊 Pago de Patente Mensual</h5>
                <span className="badge bg-success">{monthly_chart_patentes.length} meses con actividad</span>
              </div>
              <div style={{ width: '100%', height: 400 }}>
                <ResponsiveContainer>
                  <BarChart data={monthly_chart_patentes} margin={{ top: 20, right: 30, left: 20, bottom: 40 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                    <XAxis
                      dataKey="month"
                      fontSize={12}
                      stroke="##6B7280"
                    />
                    <YAxis
                      fontSize={12}
                      stroke="#6B7280"
                      tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar
                      dataKey="total"
                      radius={[8, 8, 0, 0]}
                      animationDuration={1500}
                    >
                      {monthly_chart_patentes.map((entry: any, index: number) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={`hsl(${280 + (index * 15) % 60}, 65%, ${45 + (index % 3) * 10}%)`}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-3 text-center text-muted small">
                Resumen mensual del año 2026
              </div>
            </Card>
          </Col>
        </Row>
      </div>

      {/* ==================== SECCIÓN DE PLANES DE PAGO COBRADOS ==================== */}
      <div className="mt-5 pt-4">
        <div className="d-flex justify-content-between align-items-center mb-4 bg-white p-4 rounded-3 shadow-sm">
          <div>
            <h2 className="fw-bold text-dark mb-1">💳 Planes de Pago Cobrados</h2>
            <p className="text-muted mb-0 small">Municipalidad de Villa Traful - Año 2026</p>
          </div>
        </div>

        {/* KPI Cards - Planes de Pago */}
        <Row className="g-4 mb-5">
          <Col md={6}>
            <Card className="border-0 shadow-lg h-100 overflow-hidden position-relative"
              style={{
                background: `linear-gradient(135deg, #F59E0B 0%, #D97706 100%)`,
                transform: 'translateY(0)',
                transition: 'transform 0.3s ease'
              }}
              onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-5px)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
            >
              <Card.Body className="text-white p-4">
                <div className="d-flex justify-content-between align-items-start mb-3">
                  <div className="opacity-75 small fw-semibold">Total Registros</div>
                  <div className="bg-white bg-opacity-25 rounded-circle p-2">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 16 16">
                      <path d="M1 3a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1H1zm7 8a2 2 0 1 0 0-4 2 2 0 0 0 0 4z" />
                      <path d="M0 5a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H1a1 1 0 0 1-1-1V5zm3 0a2 2 0 0 1-2 2v4a2 2 0 0 1 2 2h10a2 2 0 0 1 2-2V7a2 2 0 0 1-2-2H3z" />
                    </svg>
                  </div>
                </div>
                <div className="h2 fw-bold mb-0">{planes_pago.total_registros}</div>
                <div className="small opacity-75 mt-2">Cuotas cobradas</div>
              </Card.Body>
            </Card>
          </Col>

          <Col md={6}>
            <Card className="border-0 shadow-lg h-100 overflow-hidden"
              style={{
                background: `linear-gradient(135deg, #10B981 0%, #059669 100%)`,
                transform: 'translateY(0)',
                transition: 'transform 0.3s ease'
              }}
              onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-5px)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
            >
              <Card.Body className="text-white p-4">
                <div className="d-flex justify-content-between align-items-start mb-3">
                  <div className="opacity-75 small fw-semibold">Monto Total Recaudado</div>
                  <div className="bg-white bg-opacity-25 rounded-circle p-2">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 16 16">
                      <path d="M4 10.781c.148 1.667 1.513 2.85 3.591 3.003V15h1.043v-1.216c2.27-.179 3.678-1.438 3.678-3.3 0-1.59-.947-2.51-2.956-3.028l-.722-.187V3.467c1.122.11 1.879.714 2.07 1.616h1.47c-.166-1.6-1.54-2.748-3.54-2.875V1H7.591v1.233c-1.939.23-3.27 1.472-3.27 3.156 0 1.454.966 2.483 2.661 2.917l.61.162v4.031c-1.149-.17-1.94-.8-2.131-1.718H4zm3.391-3.836c-1.043-.263-1.6-.825-1.6-1.616 0-.944.704-1.641 1.8-1.828v3.495l-.2-.05zm1.591 1.872c1.287.323 1.852.859 1.852 1.769 0 1.097-.826 1.828-2.2 1.939V8.73l.348.086z" />
                    </svg>
                  </div>
                </div>
                <div className="h2 fw-bold mb-0">
                  ${planes_pago.monto_total.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                </div>
                <div className="small opacity-75 mt-2">Total año 2026</div>
              </Card.Body>
            </Card>
          </Col>
        </Row>

        {/* Gráficos de Planes de Pago */}
        <Row className="g-4">
          <Col md={12}>
            <Card className="border-0 shadow-sm p-4">
              <div className="d-flex justify-content-between align-items-center mb-4">
                <h5 className="fw-bold text-dark mb-0">📅 Planes de Pago Cobrados - Diario</h5>
                <span className="badge bg-primary">{daily_chart_planes.length} días con actividad</span>
              </div>
              <div style={{ width: '100%', height: 450 }}>
                <ResponsiveContainer>
                  <BarChart data={daily_chart_planes} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                    <XAxis
                      dataKey="date"
                      fontSize={11}
                      angle={-45}
                      textAnchor="end"
                      height={80}
                      stroke="#6B7280"
                    />
                    <YAxis
                      fontSize={12}
                      stroke="#6B7280"
                      tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar
                      dataKey="total"
                      radius={[8, 8, 0, 0]}
                      animationDuration={1500}
                    >
                      {daily_chart_planes.map((entry: any, index: number) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={`hsl(${30 + (index * 3) % 60}, 75%, ${50 + (index % 3) * 10}%)`}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-3 text-center text-muted small">
                Mostrando los últimos 60 días con actividad de planes de pago
              </div>
            </Card>
          </Col>

          {/* Gráfico de Barras - Planes de Pago Mensual */}
          <Col md={12}>
            <Card className="border-0 shadow-sm p-4">
              <div className="d-flex justify-content-between align-items-center mb-4">
                <h5 className="fw-bold text-dark mb-0">📊 Planes de Pago Cobrados - Mensual</h5>
                <span className="badge bg-success">{monthly_chart_planes.length} meses con actividad</span>
              </div>
              <div style={{ width: '100%', height: 400 }}>
                <ResponsiveContainer>
                  <BarChart data={monthly_chart_planes} margin={{ top: 20, right: 30, left: 20, bottom: 40 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                    <XAxis
                      dataKey="month"
                      fontSize={12}
                      stroke="#6B7280"
                    />
                    <YAxis
                      fontSize={12}
                      stroke="#6B7280"
                      tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar
                      dataKey="total"
                      radius={[8, 8, 0, 0]}
                      animationDuration={1500}
                    >
                      {monthly_chart_planes.map((entry: any, index: number) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={`hsl(${30 + (index * 15) % 60}, 70%, ${45 + (index % 3) * 10}%)`}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-3 text-center text-muted small">
                Resumen mensual del año 2026
              </div>
            </Card>
          </Col>
        </Row>
      </div>

      {/* ==================== SECCIÓN DE COBRO EFECTIVO ==================== */}
      <div className="mt-5 pt-4">
        <div className="d-flex justify-content-between align-items-center mb-4 bg-white p-4 rounded-3 shadow-sm">
          <div>
            <h2 className="fw-bold text-dark mb-1">💵 Cobro Efectivo</h2>
            <p className="text-muted mb-0 small">Municipalidad de Villa Traful - Año 2026</p>
          </div>
        </div>

        {/* KPI Cards - Cobro Efectivo */}
        <Row className="g-4 mb-5">
          <Col md={4}>
            <Card className="border-0 shadow-lg h-100 overflow-hidden position-relative"
              style={{
                background: `linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)`,
                transform: 'translateY(0)',
                transition: 'transform 0.3s ease'
              }}
              onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-5px)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
            >
              <Card.Body className="text-white p-4">
                <div className="d-flex justify-content-between align-items-start mb-3">
                  <div className="opacity-75 small fw-semibold">Recaudación Efectivo</div>
                  <div className="bg-white bg-opacity-25 rounded-circle p-2">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 16 16">
                      <path d="M1 3a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1H1zm7 8a2 2 0 1 0 0-4 2 2 0 0 0 0 4z" />
                      <path d="M0 5a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H1a1 1 0 0 1-1-1V5zm3 0a2 2 0 0 1-2 2v4a2 2 0 0 1 2 2h10a2 2 0 0 1 2-2V7a2 2 0 0 1-2-2H3z" />
                    </svg>
                  </div>
                </div>
                <div className="h2 fw-bold mb-0">
                  ${cobro_efectivo.recaudacion.monto_total.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                </div>
                <div className="small opacity-75 mt-2">{cobro_efectivo.recaudacion.total_registros} registros</div>
              </Card.Body>
            </Card>
          </Col>

          <Col md={4}>
            <Card className="border-0 shadow-lg h-100 overflow-hidden"
              style={{
                background: `linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%)`,
                transform: 'translateY(0)',
                transition: 'transform 0.3s ease'
              }}
              onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-5px)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
            >
              <Card.Body className="text-white p-4">
                <div className="d-flex justify-content-between align-items-start mb-3">
                  <div className="opacity-75 small fw-semibold">Patentes Efectivo</div>
                  <div className="bg-white bg-opacity-25 rounded-circle p-2">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 16 16">
                      <path d="M3 2.5A1.5 1.5 0 0 1 4.5 1h3.563a2 2 0 0 1 1.267.46l2.921 2.46A1.5 1.5 0 0 1 13 5.5v9a1.5 1.5 0 0 1-1.5 1.5h-7A1.5 1.5 0 0 1 3 14.5v-12z" />
                    </svg>
                  </div>
                </div>
                <div className="h2 fw-bold mb-0">
                  ${cobro_efectivo.patentes.monto_total.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                </div>
                <div className="small opacity-75 mt-2">{cobro_efectivo.patentes.total_registros} registros</div>
              </Card.Body>
            </Card>
          </Col>

          <Col md={4}>
            <Card className="border-0 shadow-lg h-100 overflow-hidden"
              style={{
                background: `linear-gradient(135deg, #10B981 0%, #059669 100%)`,
                transform: 'translateY(0)',
                transition: 'transform 0.3s ease'
              }}
              onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-5px)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
            >
              <Card.Body className="text-white p-4">
                <div className="d-flex justify-content-between align-items-start mb-3">
                  <div className="opacity-75 small fw-semibold">Total Efectivo</div>
                  <div className="bg-white bg-opacity-25 rounded-circle p-2">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 16 16">
                      <path d="M4 10.781c.148 1.667 1.513 2.85 3.591 3.003V15h1.043v-1.216c2.27-.179 3.678-1.438 3.678-3.3 0-1.59-.947-2.51-2.956-3.028l-.722-.187V3.467c1.122.11 1.879.714 2.07 1.616h1.47c-.166-1.6-1.54-2.748-3.54-2.875V1H7.591v1.233c-1.939.23-3.27 1.472-3.27 3.156 0 1.454.966 2.483 2.661 2.917l.61.162v4.031c-1.149-.17-1.94-.8-2.131-1.718H4zm3.391-3.836c-1.043-.263-1.6-.825-1.6-1.616 0-.944.704-1.641 1.8-1.828v3.495l-.2-.05zm1.591 1.872c1.287.323 1.852.859 1.852 1.769 0 1.097-.826 1.828-2.2 1.939V8.73l.348.086z" />
                    </svg>
                  </div>
                </div>
                <div className="h2 fw-bold mb-0">
                  ${cobro_efectivo.total.monto_total.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                </div>
                <div className="small opacity-75 mt-2">{cobro_efectivo.total.total_registros} registros totales</div>
              </Card.Body>
            </Card>
          </Col>
        </Row>

        {/* Gráficos de Cobro Efectivo */}
        <Row className="g-4">
          {/* Gráfico Diario - Recaudación Efectivo */}
          <Col md={6}>
            <Card className="border-0 shadow-sm p-4">
              <div className="d-flex justify-content-between align-items-center mb-4">
                <h5 className="fw-bold text-dark mb-0">📅 Recaudación Efectivo - Diario</h5>
                <span className="badge bg-primary">{daily_chart_rec_efectivo.length} días</span>
              </div>
              <div style={{ width: '100%', height: 350 }}>
                <ResponsiveContainer>
                  <BarChart data={daily_chart_rec_efectivo} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                    <XAxis
                      dataKey="date"
                      fontSize={10}
                      angle={-45}
                      textAnchor="end"
                      height={80}
                      stroke="#6B7280"
                    />
                    <YAxis
                      fontSize={12}
                      stroke="#6B7280"
                      tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar
                      dataKey="total"
                      fill="#3B82F6"
                      radius={[8, 8, 0, 0]}
                      animationDuration={1500}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </Col>

          {/* Gráfico Diario - Patentes Efectivo */}
          <Col md={6}>
            <Card className="border-0 shadow-sm p-4">
              <div className="d-flex justify-content-between align-items-center mb-4">
                <h5 className="fw-bold text-dark mb-0">📅 Patentes Efectivo - Diario</h5>
                <span className="badge bg-primary">{daily_chart_pat_efectivo.length} días</span>
              </div>
              <div style={{ width: '100%', height: 350 }}>
                <ResponsiveContainer>
                  <BarChart data={daily_chart_pat_efectivo} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                    <XAxis
                      dataKey="date"
                      fontSize={10}
                      angle={-45}
                      textAnchor="end"
                      height={80}
                      stroke="#6B7280"
                    />
                    <YAxis
                      fontSize={12}
                      stroke="#6B7280"
                      tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar
                      dataKey="total"
                      fill="#8B5CF6"
                      radius={[8, 8, 0, 0]}
                      animationDuration={1500}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </Col>

          {/* Gráfico Mensual - Recaudación Efectivo */}
          <Col md={6}>
            <Card className="border-0 shadow-sm p-4">
              <div className="d-flex justify-content-between align-items-center mb-4">
                <h5 className="fw-bold text-dark mb-0">📊 Recaudación Efectivo - Mensual</h5>
                <span className="badge bg-success">{monthly_chart_rec_efectivo.length} meses</span>
              </div>
              <div style={{ width: '100%', height: 350 }}>
                <ResponsiveContainer>
                  <BarChart data={monthly_chart_rec_efectivo} margin={{ top: 20, right: 30, left: 20, bottom: 40 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                    <XAxis
                      dataKey="month"
                      fontSize={12}
                      stroke="#6B7280"
                    />
                    <YAxis
                      fontSize={12}
                      stroke="#6B7280"
                      tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar
                      dataKey="total"
                      fill="#3B82F6"
                      radius={[8, 8, 0, 0]}
                      animationDuration={1500}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </Col>

          {/* Gráfico Mensual - Patentes Efectivo */}
          <Col md={6}>
            <Card className="border-0 shadow-sm p-4">
              <div className="d-flex justify-content-between align-items-center mb-4">
                <h5 className="fw-bold text-dark mb-0">📊 Patentes Efectivo - Mensual</h5>
                <span className="badge bg-success">{monthly_chart_pat_efectivo.length} meses</span>
              </div>
              <div style={{ width: '100%', height: 350 }}>
                <ResponsiveContainer>
                  <BarChart data={monthly_chart_pat_efectivo} margin={{ top: 20, right: 30, left: 20, bottom: 40 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                    <XAxis
                      dataKey="month"
                      fontSize={12}
                      stroke="#6B7280"
                    />
                    <YAxis
                      fontSize={12}
                      stroke="#6B7280"
                      tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar
                      dataKey="total"
                      fill="#8B5CF6"
                      radius={[8, 8, 0, 0]}
                      animationDuration={1500}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </Col>
        </Row>
      </div>
    </Container>
  );
};

export default StatsDashboard;