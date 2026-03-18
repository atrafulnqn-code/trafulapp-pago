import React, { useEffect, useState, useRef } from 'react';
import { Container, Card, Table, Spinner, Alert, Button, Form, Nav, Row, Col } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';

const AdminPolideportivo: React.FC = () => {
  const navigate = useNavigate();
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const [totalRecaudacion, setTotalRecaudacion] = useState(0);
  const [activeTab, setActiveTab] = useState<'datos' | 'graficos'>('datos');
  const [uploading, setUploading] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const limit = 20;
  const SPREADSHEET_ID = '1Wnkvuux22wWLiUzk2x781xVRMaIp7U-uZeRw3tg-cnI';

  const fetchData = async (page: number = 1, search: string = '') => {
    setLoading(true);
    setError(null);
    try {
      const apiUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:10000/api';
      const response = await fetch(`${apiUrl}/admin/polideportivo/data?page=${page}&limit=${limit}&search=${encodeURIComponent(search)}`);
      const result = await response.json();
      
      if (response.ok) {
        setData(result.data || []);
        setTotalRecords(result.total || 0);
        setTotalPages(result.total_pages || 1);
        setTotalRecaudacion(result.total_recaudacion || 0);
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
    fetchData(currentPage, searchTerm);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchData(1, searchTerm);
  };

  const handleFileUpload = async (rowIndex: string, file: File) => {
    setUploading(rowIndex);
    try {
      const apiUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:10000/api';
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await fetch(`${apiUrl}/admin/polideportivo/upload/${rowIndex}`, {
        method: 'POST',
        body: formData
      });
      
      if (response.ok) {
        fetchData(currentPage, searchTerm);
      } else {
        const result = await response.json();
        alert(result.error || 'Error al subir archivo');
      }
    } catch (err) {
      alert('Error al subir archivo');
    } finally {
      setUploading(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDownload = async (rowIndex: string) => {
    try {
      const apiUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:10000/api';
      const response = await fetch(`${apiUrl}/admin/polideportivo/download/${rowIndex}`);
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `comprobante_${rowIndex}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        alert('Comprobante no encontrado');
      }
    } catch (err) {
      alert('Error al descargar');
    }
  };

  const handleDelete = async (rowIndex: string) => {
    if (!confirm('¿Eliminar comprobante?')) return;
    
    try {
      const apiUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:10000/api';
      const response = await fetch(`${apiUrl}/admin/polideportivo/delete/${rowIndex}`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        fetchData(currentPage, searchTerm);
      }
    } catch (err) {
      alert('Error al eliminar');
    }
  };

  const getHeaders = () => {
    if (data.length === 0) return [];
    return Object.keys(data[0]).filter(k => !['row_index', 'tiene_comprobante', 'comprobante_filename'].includes(k));
  };

  const formatValue = (value: any) => {
    if (value === null || value === undefined || value === '') return '-';
    if (typeof value === 'number') {
      if (value > 1000) {
        return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(value);
      }
      return value;
    }
    return String(value);
  };

  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisible = 5;
    
    if (totalPages <= maxVisible + 2) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 3) pages.push('...');
      
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);
      
      for (let i = start; i <= end; i++) pages.push(i);
      
      if (currentPage < totalPages - 2) pages.push('...');
      pages.push(totalPages);
    }
    return pages;
  };

  const GraficoSimple = () => {
    const yesCount = data.filter(d => d.tiene_comprobante).length;
    const noCount = data.filter(d => !d.tiene_comprobante).length;
    
    return (
      <Row className="g-4 mt-3">
        <Col md={4}>
          <Card className="text-center h-100">
            <Card.Body>
              <h1 className="text-primary fw-bold">{totalRecords}</h1>
              <p className="text-muted mb-0">Total Pagos</p>
            </Card.Body>
          </Card>
        </Col>
        <Col md={4}>
          <Card className="text-center h-100">
            <Card.Body>
              <h1 className="text-success fw-bold">${totalRecaudacion.toLocaleString('es-AR')}</h1>
              <p className="text-muted mb-0">Total Recaudación ($15.000 c/u)</p>
            </Card.Body>
          </Card>
        </Col>
        <Col md={4}>
          <Card className="text-center h-100">
            <Card.Body>
              <h1 className="text-warning fw-bold">{yesCount}</h1>
              <p className="text-muted mb-0">Con Comprobante</p>
            </Card.Body>
          </Card>
        </Col>
        <Col md={6}>
          <Card className="h-100">
            <Card.Body>
              <h5 className="mb-3">Comprobantes</h5>
              <div className="d-flex justify-content-center align-items-center" style={{ height: '150px' }}>
                <div style={{ position: 'relative', width: '150px', height: '150px' }}>
                  <svg viewBox="0 0 36 36" style={{ width: '100%', height: '100%' }}>
                    <path
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none"
                      stroke="#e9ecef"
                      strokeWidth="3"
                    />
                    <path
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none"
                      stroke="#28a745"
                      strokeWidth="3"
                      strokeDasharray={`${(yesCount / (yesCount + noCount || 1)) * 100}, 100`}
                    />
                  </svg>
                  <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center' }}>
                    <strong>{Math.round((yesCount / (yesCount + noCount || 1)) * 100)}%</strong>
                  </div>
                </div>
              </div>
              <div className="d-flex justify-content-center gap-4 mt-2">
                <span><span className="badge bg-success me-1">{yesCount}</span> Con</span>
                <span><span className="badge bg-secondary me-1">{noCount}</span> Sin</span>
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col md={6}>
          <Card className="h-100">
            <Card.Body>
              <h5 className="mb-3">Últimos Registros</h5>
              <Table size="sm" className="mb-0">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Nombre</th>
                    <th>Comprobante</th>
                  </tr>
                </thead>
                <tbody>
                  {data.slice(0, 5).map((row, idx) => (
                    <tr key={idx}>
                      <td>{row.row_index}</td>
                      <td>{getHeaders().slice(0, 2).map(h => row[h]).join(' ')}</td>
                      <td>
                        {row.tiene_comprobante ? (
                          <span className="badge bg-success">Sí</span>
                        ) : (
                          <span className="badge bg-secondary">No</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    );
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
          <Button variant="primary" size="sm" onClick={() => fetchData(currentPage, searchTerm)}>
            🔄 Sincronizar
          </Button>
          <Button variant="outline-success" size="sm" onClick={() => window.open(`https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/edit`, '_blank')}>
            📊 Ver Sheet
          </Button>
        </div>
      </div>

      {error && <Alert variant="danger">{error}</Alert>}

      <Nav variant="tabs" className="mb-3">
        <Nav.Item>
          <Nav.Link active={activeTab === 'datos'} onClick={() => setActiveTab('datos')}>
            📋 Datos ({totalRecords} pagos)
          </Nav.Link>
        </Nav.Item>
        <Nav.Item>
          <Nav.Link active={activeTab === 'graficos'} onClick={() => setActiveTab('graficos')}>
            📈 Gráficos
          </Nav.Link>
        </Nav.Item>
      </Nav>

      {activeTab === 'graficos' ? (
        <GraficoSimple />
      ) : (
        <Card className="shadow-sm border-0">
          <Card.Body className="p-0">
            <div className="p-3 bg-light border-bottom">
              <Form onSubmit={handleSearch}>
                <div className="d-flex gap-2">
                  <Form.Control
                    type="text"
                    placeholder="Buscar (mayúsculas/minúsculas no importa)..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                  <Button type="submit" variant="primary">Buscar</Button>
                  {searchTerm && (
                    <Button variant="outline-secondary" onClick={() => { setSearchTerm(''); fetchData(1, ''); }}>
                      Limpiar
                    </Button>
                  )}
                </div>
              </Form>
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
                        <th>Comprobante</th>
                        <th>Adjuntar</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.length === 0 ? (
                        <tr>
                          <td colSpan={getHeaders().length + 3} className="text-center py-4 text-muted">
                            No se encontraron resultados
                          </td>
                        </tr>
                      ) : (
                        data.map((row, idx) => (
                          <tr key={idx}>
                            <td className="text-center text-muted">{row.row_index}</td>
                            {getHeaders().map((header, hIdx) => (
                              <td key={hIdx}>
                                {formatValue(row[header])}
                              </td>
                            ))}
                            <td>
                              {row.tiene_comprobante ? (
                                <Button 
                                  variant="success" 
                                  size="sm"
                                  onClick={() => handleDownload(row.row_index)}
                                >
                                  ✓ Descargar
                                </Button>
                              ) : (
                                <span className="badge bg-secondary">No</span>
                              )}
                            </td>
                            <td>
                              <div className="d-flex gap-2 align-items-center">
                                <input
                                  type="file"
                                  accept=".pdf,.jpg,.jpeg,.png"
                                  style={{ display: 'none' }}
                                  ref={fileInputRef}
                                  onChange={(e) => {
                                    if (e.target.files?.[0]) {
                                      handleFileUpload(row.row_index, e.target.files[0]);
                                    }
                                  }}
                                />
                                <Button
                                  variant="outline-primary"
                                  size="sm"
                                  disabled={uploading === row.row_index}
                                  onClick={() => fileInputRef.current?.click()}
                                >
                                  {uploading === row.row_index ? '⏳' : '📎'}
                                </Button>
                                {row.tiene_comprobante && (
                                  <Button
                                    variant="outline-danger"
                                    size="sm"
                                    onClick={() => handleDelete(row.row_index)}
                                  >
                                    🗑️
                                  </Button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </Table>
                </div>
                
                <div className="p-3 border-top bg-light d-flex justify-content-between align-items-center">
                  <small className="text-muted">
                    Mostrando {data.length} de {totalRecords} registros
                    {totalRecaudacion > 0 && ` | Total: $${totalRecaudacion.toLocaleString('es-AR')}`}
                  </small>
                  
                  <div className="d-flex gap-1">
                    <Button 
                      variant="outline-secondary" 
                      size="sm"
                      disabled={currentPage === 1}
                      onClick={() => { setCurrentPage(1); fetchData(1, searchTerm); }}
                    >
                      ««
                    </Button>
                    <Button 
                      variant="outline-secondary" 
                      size="sm"
                      disabled={currentPage === 1}
                      onClick={() => { setCurrentPage(currentPage - 1); fetchData(currentPage - 1, searchTerm); }}
                    >
                      «
                    </Button>
                    
                    {getPageNumbers().map((page, idx) => (
                      page === '...' ? (
                        <span key={`ellipsis-${idx}`} className="align-self-center px-2">...</span>
                      ) : (
                        <Button
                          key={page}
                          variant={page === currentPage ? 'primary' : 'outline-secondary'}
                          size="sm"
                          onClick={() => { setCurrentPage(page as number); fetchData(page as number, searchTerm); }}
                        >
                          {page}
                        </Button>
                      )
                    ))}
                    
                    <Button 
                      variant="outline-secondary" 
                      size="sm"
                      disabled={currentPage === totalPages}
                      onClick={() => { setCurrentPage(currentPage + 1); fetchData(currentPage + 1, searchTerm); }}
                    >
                      »
                    </Button>
                    <Button 
                      variant="outline-secondary" 
                      size="sm"
                      disabled={currentPage === totalPages}
                      onClick={() => { setCurrentPage(totalPages); fetchData(totalPages, searchTerm); }}
                    >
                      »»
                    </Button>
                  </div>
                </div>
              </>
            )}
          </Card.Body>
        </Card>
      )}
    </Container>
  );
};

export default AdminPolideportivo;
