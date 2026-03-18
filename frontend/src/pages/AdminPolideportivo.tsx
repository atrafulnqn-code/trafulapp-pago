import React, { useEffect, useState } from 'react';
import { Container, Card, Table, Spinner, Alert, Button, Form, Row, Col } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';

const AdminPolideportivo: React.FC = () => {
  const navigate = useNavigate();
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredData, setFilteredData] = useState<any[]>([]);

  const SPREADSHEET_ID = '1Wnkvuux22wWLiUzk2x781xVRMaIp7U-uZeRw3tg-cnI';

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const apiUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:10000/api';
      const response = await fetch(`${apiUrl}/admin/polideportivo/data`);
      const result = await response.json();
      
      if (response.ok) {
        setData(result.data || []);
        setFilteredData(result.data || []);
      } else {
        setError(result.error || 'Error al cargar los datos');
      }
    } catch (err) {
      setError('Error de conexión. Verifique su conexión a internet.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (searchTerm) {
      const filtered = data.filter(row => 
        Object.values(row).some(val => 
          String(val).toLowerCase().includes(searchTerm.toLowerCase())
        )
      );
      setFilteredData(filtered);
    } else {
      setFilteredData(data);
    }
  }, [searchTerm, data]);

  const getHeaders = () => {
    if (data.length === 0) return [];
    return Object.keys(data[0]);
  };

  const formatValue = (value: any) => {
    if (value === null || value === undefined || value === '') return '-';
    if (typeof value === 'number' && value > 1000) {
      return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(value);
    }
    return String(value);
  };

  return (
    <Container className="py-5 mt-5" fluid>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div className="d-flex align-items-center">
          <Button variant="outline-secondary" size="sm" onClick={() => navigate('/admin/dashboard')} className="me-3">
            ← Volver
          </Button>
          <div>
            <h2 className="fw-bold mb-1">Pagos Polideportivo</h2>
            <p className="text-muted mb-0">Datos sincronizados desde Google Sheets</p>
          </div>
        </div>
        <div className="d-flex gap-2">
          <Button variant="primary" size="sm" onClick={fetchData}>
            🔄 Sincronizar
          </Button>
          <Button variant="outline-danger" size="sm" onClick={() => window.open(`https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/edit`, '_blank')}>
            📊 Ver Sheet
          </Button>
        </div>
      </div>

      {error && <Alert variant="danger">{error}</Alert>}

      <Card className="shadow-sm border-0">
        <Card.Body className="p-0">
          <div className="p-3 bg-light border-bottom">
            <Form.Group>
              <Form.Control
                type="text"
                placeholder="Buscar en todos los campos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </Form.Group>
          </div>

          {loading ? (
            <div className="text-center py-5">
              <Spinner animation="border" variant="primary" />
              <p className="mt-2 text-muted">Sincronizando datos...</p>
            </div>
          ) : (
            <>
              <div className="table-responsive">
                <Table striped bordered hover className="mb-0">
                  <thead className="bg-light">
                    <tr>
                      <th className="text-center" style={{ minWidth: '50px' }}>#</th>
                      {getHeaders().map((header, idx) => (
                        <th key={idx}>{header}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredData.length === 0 ? (
                      <tr>
                        <td colSpan={getHeaders().length + 1} className="text-center py-4 text-muted">
                          {data.length === 0 ? 'No hay datos disponibles' : 'No se encontraron resultados'}
                        </td>
                      </tr>
                    ) : (
                      filteredData.map((row, idx) => (
                        <tr key={idx}>
                          <td className="text-center text-muted">{idx + 1}</td>
                          {getHeaders().map((header, hIdx) => (
                            <td key={hIdx} style={{ 
                              fontWeight: header.toLowerCase().includes('total') || header.toLowerCase().includes('monto') || header.toLowerCase().includes('importe') 
                                ? '600' 
                                : '400',
                              color: header.toLowerCase().includes('total') || header.toLowerCase().includes('monto') || header.toLowerCase().includes('importe')
                                ? '#059669'
                                : 'inherit'
                            }}>
                              {formatValue(row[header])}
                            </td>
                          ))}
                        </tr>
                      ))
                    )}
                  </tbody>
                </Table>
              </div>
              
              <div className="p-3 border-top bg-light">
                <small className="text-muted">
                  <strong>Total de registros:</strong> {filteredData.length} de {data.length}
                </small>
              </div>
            </>
          )}
        </Card.Body>
      </Card>
    </Container>
  );
};

export default AdminPolideportivo;
