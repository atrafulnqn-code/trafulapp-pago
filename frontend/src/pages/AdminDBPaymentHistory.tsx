import React, { useEffect, useState } from 'react';
import { Container, Table, Form, Button, Pagination, Spinner, Alert } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

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

interface PaymentHistory {
  id: number;
  payment_id: string;
  comprobante_numero: string | null;
  nombre_apellido: string;
  dni: string;
  email: string | null;
  monto: number;
  estado: string;
  items_pagados: any;
  detalles: string | null;
  observaciones: string | null;
  fecha_hora: string;
  created_at: string;
}

interface ApiResponse {
  data: PaymentHistory[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

const AdminDBPaymentHistory: React.FC = () => {
  const navigate = useNavigate();
  const [records, setRecords] = useState<PaymentHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [savingId, setSavingId] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editValues, setEditValues] = useState<Record<number, string>>({});
  const limit = 10;

  const fetchRecords = async (page: number, searchTerm: string) => {
    setLoading(true);
    setError(null);
    try {
      const password = localStorage.getItem('adminPassword') || '';
      console.log('Fetching payment history with password:', password ? 'Password exists' : 'No password found');
      console.log('API URL:', `${API_BASE_URL}/admin/db/payment-history`);

      const response = await axios.get<ApiResponse>(`${API_BASE_URL}/admin/db/payment-history`, {
        params: { page, limit, search: searchTerm },
        headers: { Authorization: `Bearer ${password}` }
      });

      console.log('Response received:', response.data);
      setRecords(response.data.data);
      setTotal(response.data.total);
      setTotalPages(response.data.total_pages);
      setCurrentPage(response.data.page);
    } catch (err: any) {
      console.error('Error fetching payment history:', err);
      console.error('Error response:', err.response);

      if (err.response?.status === 401) {
        setError('Sesión expirada o no autorizada. Por favor, vuelve a iniciar sesión.');
        // Esperar 3 segundos antes de redirigir para que el usuario pueda ver el mensaje
        setTimeout(() => {
          navigate('/admin');
        }, 3000);
      } else {
        setError(err.response?.data?.error || err.message || 'Error al cargar los datos. Por favor, intenta de nuevo.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    console.log('AdminDBPaymentHistory mounted, checking authentication...');
    const password = localStorage.getItem('adminPassword');
    if (!password) {
      console.warn('No admin password found in localStorage');
      setError('No se encontró sesión activa. Por favor, inicia sesión nuevamente.');
      setTimeout(() => {
        navigate('/admin');
      }, 2000);
      return;
    }
    fetchRecords(1, '');
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchRecords(1, search);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    fetchRecords(page, search);
  };

  const handleLogout = () => {
    localStorage.removeItem('adminUser');
    localStorage.removeItem('adminPassword');
    navigate('/admin');
  };

  const handleObservacionesChange = (id: number, value: string) => {
    setEditValues(prev => ({ ...prev, [id]: value }));
  };

  const handleSaveObservaciones = async (id: number, paymentId: string) => {
    const value = editValues[id] ?? '';
    setSavingId(id);
    try {
      const password = localStorage.getItem('adminPassword') || '';
      await axios.put(`${API_BASE_URL}/admin/db/payment-history/observaciones`, {
        payment_id: paymentId,
        observaciones: value
      }, {
        headers: { Authorization: `Bearer ${password}` }
      });
      setRecords(records.map(r => r.id === id ? { ...r, observaciones: value } : r));
      setEditingId(null);
    } catch (err) {
      console.error('Error guardando observaciones:', err);
      alert('Error al guardar observaciones');
    } finally {
      setSavingId(null);
    }
  };

  const handleDownloadPdf = async (id: number) => {
    try {
      const password = localStorage.getItem('adminPassword') || '';
      const response = await axios.get(`${API_BASE_URL}/admin/db/payment-history/${id}/pdf`, {
        headers: { Authorization: `Bearer ${password}` },
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `comprobante_${id}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error al descargar PDF:', err);
      alert('Error al descargar el comprobante PDF');
    }
  };

  const handleStartEdit = (id: number, currentValue: string) => {
    setEditingId(id);
    setEditValues(prev => ({ ...prev, [id]: currentValue || '' }));
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('es-AR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getEstadoBadge = (estado: string) => {
    return estado === 'exitoso' ? 'success' : 'danger';
  };

  const handleExport = async () => {
    try {
      const password = localStorage.getItem('adminPassword') || '';
      const response = await axios.get<ApiResponse>(`${API_BASE_URL}/admin/db/payment-history`, {
        params: { page: 1, limit: 10000, search: search },
        headers: { Authorization: `Bearer ${password}` }
      });

      const data = response.data.data;
      if (data.length === 0) {
        alert('No hay datos para exportar');
        return;
      }

      // Headers del CSV
      const headers = ['ID', 'Payment ID', 'Comprobante', 'Nombre', 'DNI', 'Email', 'Monto', 'Estado', 'Detalles', 'Observaciones', 'Fecha'];

      // Filas del CSV
      const rows = data.map(r => [
        r.id,
        r.payment_id,
        r.comprobante_numero || '',
        r.nombre_apellido,
        r.dni,
        r.email || '',
        r.monto,
        r.estado,
        r.detalles ? r.detalles.replace(/\n/g, ' ') : (r.items_pagados ? (typeof r.items_pagados === 'string' ? r.items_pagados : JSON.stringify(r.items_pagados)) : ''),
        r.observaciones || '',
        r.fecha_hora
      ]);

      const csvContent = [
        headers.join(';'),
        ...rows.map(row => row.join(';'))
      ].join('\n');

      const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `historial_pagos_${new Date().toISOString().slice(0, 10)}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('Error al exportar:', err);
      alert('Error al exportar los datos');
    }
  };

  return (
    <Container className="py-5 mt-5">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <Button variant="outline-secondary" size="sm" onClick={() => navigate('/admin/dashboard')} className="mb-2">
            ← Volver al Panel
          </Button>
          <h1 className="fw-bold text-primary">Tabla: Payment History</h1>
          <p className="text-muted">Total de registros: {total}</p>
        </div>
        <div className="d-flex gap-2">
          <Button variant="success" onClick={handleExport}>
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" className="bi bi-download me-2" viewBox="0 0 16 16">
              <path d="M.5 9.9a.5.5 0 0 1 .5.5v2.5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-2.5a.5.5 0 0 1 1 0v2.5a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2v-2.5a.5.5 0 0 1 .5-.5z" />
              <path d="M7.646 11.854a.5.5 0 0 0 .708 0l3-3a.5.5 0 0 0-.708-.708L8.5 10.293V1.5a.5.5 0 0 0-1 0v8.793L5.354 8.146a.5.5 0 1 0-.708.708l3 3z" />
            </svg>
            Exportar a Excel
          </Button>
          <Button variant="outline-danger" onClick={handleLogout}>Cerrar Sesión</Button>
        </div>
      </div>

      <Form onSubmit={handleSearch} className="mb-4">
        <div className="d-flex gap-2">
          <Form.Control
            type="text"
            placeholder="Buscar por payment_id, nombre, DNI, email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Button type="submit" variant="primary">Buscar</Button>
          {search && (
            <Button
              variant="outline-secondary"
              onClick={() => {
                setSearch('');
                fetchRecords(1, '');
              }}
            >
              Limpiar
            </Button>
          )}
        </div>
      </Form>

      {loading && (
        <div className="text-center py-5">
          <Spinner animation="border" variant="primary" />
        </div>
      )}

      {error && (
        <Alert variant="danger" className="d-flex justify-content-between align-items-center">
          <span>{error}</span>
          {!error.includes('Sesión expirada') && !error.includes('No se encontró sesión') && (
            <Button
              variant="outline-danger"
              size="sm"
              onClick={() => fetchRecords(currentPage, search)}
            >
              Reintentar
            </Button>
          )}
        </Alert>
      )}

      {!loading && !error && (
        <>
          <div className="table-responsive">
            <Table striped bordered hover>
              <thead className="table-dark">
                <tr>
                  <th>Fecha</th>
                  <th>Nombre</th>
                  <th>Monto</th>
                  <th>Detalles</th>
                  <th>Email</th>
                  <th>Estado</th>
                  <th>Observaciones</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {records.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center text-muted">
                      No se encontraron registros
                    </td>
                  </tr>
                ) : (
                  records.map((record) => (
                    <tr key={record.id}>
                      <td><small>{formatDate(record.fecha_hora)}</small></td>
                      <td>{record.nombre_apellido}</td>
                      <td className="text-end fw-bold">
                        ${record.monto != null && !isNaN(record.monto) ? Number(record.monto).toFixed(2) : '0.00'}
                      </td>
                      <td>
                        <small className="text-muted" style={{ maxWidth: '250px', display: 'inline-block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={record.detalles || (record.items_pagados ? (typeof record.items_pagados === 'string' ? record.items_pagados : JSON.stringify(record.items_pagados)) : '-')}>
                          {record.detalles || (record.items_pagados ? (typeof record.items_pagados === 'string' ? record.items_pagados : JSON.stringify(record.items_pagados)) : '-')}
                        </small>
                      </td>
                      <td>{record.email || '-'}</td>
                      <td>
                        <span className={`badge bg-${getEstadoBadge(record.estado)}`}>
                          {record.estado}
                        </span>
                      </td>
                      <td style={{ minWidth: '180px' }}>
                        {editingId === record.id ? (
                          <div className="d-flex gap-1">
                            <Form.Control
                              as="textarea"
                              rows={1}
                              size="sm"
                              value={editValues[record.id] ?? record.observaciones ?? ''}
                              placeholder="Observaciones..."
                              onChange={(e) => handleObservacionesChange(record.id, e.target.value)}
                              disabled={savingId === record.id}
                              style={{ resize: 'none' }}
                              autoFocus
                            />
                            <Button
                              variant="success"
                              size="sm"
                              onClick={() => handleSaveObservaciones(record.id, record.payment_id)}
                              disabled={savingId === record.id}
                            >
                              {savingId === record.id ? '...' : '✓'}
                            </Button>
                          </div>
                        ) : (
                          <div
                            onClick={() => handleStartEdit(record.id, record.observaciones || '')}
                            style={{ cursor: 'pointer', minHeight: '30px', padding: '6px', border: '1px solid #dee2e6', borderRadius: '4px' }}
                            title="Click para editar"
                          >
                            <small className="text-muted">
                              {record.observaciones || <em className="text-secondary">Click para agregar...</em>}
                            </small>
                          </div>
                        )}
                      </td>
                      <td>
                        <Button
                          variant="outline-primary"
                          size="sm"
                          onClick={() => handleDownloadPdf(record.id)}
                          className="d-flex align-items-center gap-1"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" className="bi bi-file-earmark-pdf" viewBox="0 0 16 16">
                            <path d="M14 14V4.5L9.5 0H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2zM9.5 3A1.5 1.5 0 0 0 11 4.5h2V14a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1h5.5v2z"/>
                            <path d="M4.603 12.087a.81.81 0 0 1-.438-.42c-.195-.388-.13-.776.08-1.102.166-.257.433-.418.756-.472.305-.052.786-.066 1.175-.026.113.012.217.025.32.039a10.761 10.761 0 0 1 .997-.906 19.135 19.135 0 0 1 1.147-1.157c.182-.227.38-.433.56-.617.073-.074.14-.142.202-.204.086-.23.16-.453.212-.653.074-.29.094-.555.034-.787-.058-.226-.22-.441-.444-.543a.622.622 0 0 0-.622.012c-.21.134-.366.38-.478.675-.11.289-.16.6-.145.897.01.2.044.382.09.54l-.04.03a6.407 6.407 0 0 0-.432.417 19.155 19.155 0 0 0-1.397 1.638c-.139.183-.27.345-.39.489a10.781 10.781 0 0 0-1.214.911 2.327 2.327 0 0 0-.317.311c-.1.114-.188.211-.26.305zm1.758-1.12c.382.023.639.055.856.108.176.043.277.094.341.156.09-.071.18-.163.26-.26.21-.252.34-.52.413-.778a10.755 10.755 0 0 0-1.137.937 2.333 2.333 0 0 0-.733.837zm2.46-3.716c-.03-.133-.042-.257-.033-.372.016-.2.072-.372.162-.48a.222.222 0 0 1 .157-.042c.07.009.136.059.186.136.054.083.08.195.074.34a1.889 1.889 0 0 1-.094.514 4.302 4.302 0 0 1-.452.836 1.64 1.64 0 0 1-.044-.044 4.414 4.414 0 0 1-.166-.2c-.04-.055-.078-.114-.114-.176zm.575 2.056c-.086.107-.171.211-.253.313a19.135 19.135 0 0 0-1.168 1.56c-.087.13-.17.259-.25.385a10.835 10.835 0 0 0 1.258-.851 16.594 16.594 0 0 0 .584-.668c-.056-.252-.1-.497-.13-.733l-.041-.006z"/>
                          </svg>
                          Ver PDF
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </Table>
          </div>

          {totalPages > 1 && (
            <div className="d-flex justify-content-center mt-4">
              <Pagination>
                <Pagination.First onClick={() => handlePageChange(1)} disabled={currentPage === 1} />
                <Pagination.Prev onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 1} />

                {[...Array(totalPages)].map((_, index) => {
                  const page = index + 1;
                  if (
                    page === 1 ||
                    page === totalPages ||
                    (page >= currentPage - 1 && page <= currentPage + 1)
                  ) {
                    return (
                      <Pagination.Item
                        key={page}
                        active={page === currentPage}
                        onClick={() => handlePageChange(page)}
                      >
                        {page}
                      </Pagination.Item>
                    );
                  } else if (page === currentPage - 2 || page === currentPage + 2) {
                    return <Pagination.Ellipsis key={page} disabled />;
                  }
                  return null;
                })}

                <Pagination.Next onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage === totalPages} />
                <Pagination.Last onClick={() => handlePageChange(totalPages)} disabled={currentPage === totalPages} />
              </Pagination>
            </div>
          )}
        </>
      )}
    </Container>
  );
};

export default AdminDBPaymentHistory;
