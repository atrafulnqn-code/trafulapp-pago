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

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

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
      } else {
        setError(result.error || 'Error al cargar estadísticas');
      }
    } catch (err) {
      setError('Error de conexión');
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

  if (loading) return <div className="d-flex justify-content-center align-items-center vh-100"><Spinner animation="border" variant="primary" /></div>;
  if (error) return <Container className="mt-5 pt-5"><Alert variant="danger">{error}</Alert></Container>;

  const { summary, daily_chart, monthly_chart } = data;

  return (
    <Container className="py-5 mt-5" fluid>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="fw-bold text-dark">Dashboard de Recaudación 2026</h2>
        <div className="d-flex gap-2">
            <Button variant="outline-primary" size="sm" onClick={fetchStats}>Actualizar Datos</Button>
            <Button variant="outline-danger" size="sm" onClick={() => { localStorage.removeItem('statsAuth'); navigate('/'); }}>Cerrar</Button>
        </div>
      </div>

      {/* Contadores KPIs */}
      <Row className="g-4 mb-5">
        <Col md={3}>
          <Card className="border-0 shadow-sm bg-primary text-white p-3">
            <div className="small opacity-75">Recaudación Total Año</div>
            <div className="h2 fw-bold mb-0">${summary.total_anual.toLocaleString()}</div>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="border-0 shadow-sm bg-success text-white p-3">
            <div className="small opacity-75">Total Transacciones</div>
            <div className="h2 fw-bold mb-0">{summary.cantidad_operaciones.total}</div>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="border-0 shadow-sm bg-info text-white p-3">
            <div className="small opacity-75">Ingresos x Deudas</div>
            <div className="h2 fw-bold mb-0">${summary.totales_categoria.deudas.toLocaleString()}</div>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="border-0 shadow-sm bg-warning text-white p-3">
            <div className="small opacity-75">Ingresos x Recaudación</div>
            <div className="h2 fw-bold mb-0">${summary.totales_categoria.recaudacion.toLocaleString()}</div>
          </Card>
        </Col>
      </Row>

      <Row className="g-4">
        {/* Gráfico 1: Recaudación Diaria */}
        <Col lg={8}>
          <Card className="border-0 shadow-sm p-4">
            <h5 className="fw-bold mb-4">Tendencia de Recaudación Diaria ($)</h5>
            <div style={{ width: '100%', height: 300 }}>
              <ResponsiveContainer>
                <AreaChart data={daily_chart}>
                  <defs>
                    <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#8884d8" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
                  <XAxis dataKey="date" fontSize={12} tickMargin={10} />
                  <YAxis fontSize={12} />
                  <Tooltip />
                  <Area type="monotone" dataKey="total" stroke="#8884d8" fillOpacity={1} fill="url(#colorTotal)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </Col>

        {/* Gráfico 2: Cantidad de Pagadores por Categoría */}
        <Col lg={4}>
          <Card className="border-0 shadow-sm p-4 h-100">
            <h5 className="fw-bold mb-4">Operaciones por Tipo</h5>
            <div style={{ width: '100%', height: 300 }}>
              <ResponsiveContainer>
                <BarChart data={[
                    { name: 'Deudas', valor: summary.cantidad_operaciones.deudas },
                    { name: 'Tasas', valor: summary.cantidad_operaciones.contributivos },
                    { name: 'Manual', valor: summary.cantidad_operaciones.recaudacion },
                    { name: 'Patente', valor: summary.cantidad_operaciones.patente }
                ]}>
                  <XAxis dataKey="name" fontSize={10} />
                  <Tooltip />
                  <Bar dataKey="valor" fill="#82ca9d">
                    <Cell fill={COLORS[0]} />
                    <Cell fill={COLORS[1]} />
                    <Cell fill={COLORS[2]} />
                    <Cell fill={COLORS[3]} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </Col>

        {/* Gráfico 3: Recaudación por Mes */}
        <Col md={6}>
          <Card className="border-0 shadow-sm p-4">
            <h5 className="fw-bold mb-4">Cierre Mensual Progresivo</h5>
            <div style={{ width: '100%', height: 250 }}>
              <ResponsiveContainer>
                <BarChart data={monthly_chart}>
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="total" fill="#0f4c81" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </Col>

        {/* Gráfico 4: Distribución de Ingresos ($) */}
        <Col md={6}>
          <Card className="border-0 shadow-sm p-4">
            <h5 className="fw-bold mb-4">Ingresos por Categoría ($)</h5>
            <div style={{ width: '100%', height: 250 }}>
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
                    outerRadius={80}
                    fill="#8884d8"
                    paddingAngle={5}
                    dataKey="value"
                    label
                  >
                    {COLORS.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
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