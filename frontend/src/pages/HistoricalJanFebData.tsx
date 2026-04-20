import React, { useEffect, useState } from 'react';
import { Container, Table, Button, Spinner, Alert } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const getApiBaseUrl = () => {
  // @ts-ignore
  const runtimeUrl = window._env_?.VITE_API_BASE_URL;
  if (runtimeUrl && runtimeUrl !== '__VITE_API_BASE_URL__') {
    return runtimeUrl;
  }
  return import.meta.env.VITE_API_BASE_URL || 'http://localhost:10000/api';
};

const API_BASE_URL = getApiBaseUrl();

interface HistoricalRecord {
  id: number;
  origen: string;
  tabla_origen: string;
  fecha_registro: string;
  tipo_operacion: string;
  monto: string;
  nombre_responsable: string;
  email: string;
  datos_adicionales: any;
}

const HistoricalJanFebData: React.FC = () => {
  const navigate = useNavigate();
  const [records, setRecords] = useState<HistoricalRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchRecords = async () => {
      try {
        const password = localStorage.getItem('adminPassword') || '';
        const response = await axios.get(`${API_BASE_URL}/historical-jan-feb`, {
          headers: { Authorization: `Bearer ${password}` }
        });
        setRecords(response.data.data);
      } catch (err: any) {
        if (err.response?.status === 401) {
          navigate('/admin');
        } else {
          setError(err.response?.data?.error || 'Error al cargar los datos históricos');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchRecords();
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('adminUser');
    localStorage.removeItem('adminPassword');
    navigate('/admin');
  };
  const generatePDF = (record: HistoricalRecord) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert("Por favor habilita las ventanas emergentes para ver el PDF.");
      return;
    }

    const details = typeof record.datos_adicionales === 'string' 
      ? JSON.parse(record.datos_adicionales) 
      : record.datos_adicionales;

    // Build items HTML for the table
    let itemsHtml = '';
    const montoDisplay = record.monto ? `$${record.monto}` : '-';
    
    // Description logic based on table origin
    let description = record.tipo_operacion;
    if (record.tabla_origen === 'Historial de Pagos' || record.tabla_origen === 'Plan_de_Pago') {
        description = `${record.tabla_origen} - ${record.tipo_operacion}`;
    }
    
    itemsHtml = `
        <tr>
            <td>${description}</td>
            <td>${details.Comentarios || details.detalles || details.detalle || '-'}</td>
            <td style="text-align: right;">${montoDisplay}</td>
        </tr>
    `;

    const htmlContent = `
      <!DOCTYPE html>
      <html lang="es">
      <head>
          <meta charset="UTF-8">
          <title>Comprobante de Pago - ${record.id}</title>
          <style>
              body { font-family: Arial, sans-serif; margin: 20px; color: #333; }
              .container { width: 100%; max-width: 800px; margin: 0 auto; border: 1px solid #eee; padding: 20px; box-shadow: 0 0 10px rgba(0, 0, 0, 0.05); }
              .header { text-align: center; border-bottom: 1px solid #eee; padding-bottom: 10px; margin-bottom: 20px; }
              .header h1 { color: #0056b3; margin: 0; font-size: 24px; }
              .details { margin-bottom: 20px; }
              .details p { margin: 5px 0; }
              .items { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
              .items th, .items td { border: 1px solid #eee; padding: 8px; text-align: left; }
              .items th { background-color: #f8f8f8; }
              .total { text-align: right; font-size: 18px; font-weight: bold; margin-top: 20px; }
              .footer { text-align: center; margin-top: 30px; font-size: 12px; color: #777; }
              .no-print { text-align: center; margin-bottom: 20px; }
              @media print { .no-print { display: none; } .container { border: none; box-shadow: none; } }
          </style>
      </head>
      <body>
          <div class="no-print">
              <button onclick="window.print()" style="padding: 10px 20px; background: #007bff; color: white; border: none; border-radius: 5px; cursor: pointer;">Imprimir Comprobante</button>
          </div>
          <div class="container">
              <div class="header">
                  <h1>Comprobante de Pago</h1>
                  <p><strong>Comuna de Villa Traful - Provincia de Neuquén</strong></p>
                  <p style="font-size: 12px; margin-top: 5px;">CUIT: 30-67297005-5. Laffitte 0 . Villa Traful.</p>
              </div>
              <div class="details">
                  <p><strong>ID de Comprobante:</strong> HIST-${record.id}</p>
                  <p><strong>Fecha de Registro:</strong> ${new Date(record.fecha_registro).toLocaleString('es-AR')}</p>
                  <p><strong>Estado:</strong> REGISTRADO</p>
                  <p><strong>Origen:</strong> ${record.origen} (${record.tabla_origen})</p>
                  <p><strong>Nombre del Pagador:</strong> ${record.nombre_responsable || '-'}</p>
                  <p><strong>Email:</strong> ${record.email || '-'}</p>
                  <p><strong>Medio de Pago:</strong> ${record.tipo_operacion}</p>
              </div>
              <table class="items">
                  <thead>
                      <tr>
                          <th>Descripción</th>
                          <th>Referencia / Nota</th>
                          <th>Monto</th>
                      </tr>
                  </thead>
                  <tbody>
                      ${itemsHtml}
                  </tbody>
              </table>
              <div class="total">
                  Total Pagado: ${montoDisplay}
              </div>
              <div class="footer">
                  <p>Gracias por tu pago.</p>
                  <p>Este es un comprobante histórico generado automáticamente para el período 19/01 al 10/02.</p>
              </div>
          </div>
      </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  return (
    <Container className="py-5 mt-5">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <Button variant="outline-secondary" size="sm" onClick={() => navigate('/admin/dashboard')} className="mb-2">
            ← Volver al Panel
          </Button>
          <h1 className="fw-bold text-primary">Datos Históricos (19 Ene - 10 Feb 2026)</h1>
          <p className="text-muted">Mostrando registros de cobros y pagos unificados.</p>
        </div>
        <Button variant="outline-danger" onClick={handleLogout}>Cerrar Sesión</Button>
      </div>

      {loading && (
        <div className="text-center py-5">
           <Spinner animation="border" variant="primary" />
           <p className="mt-3">Cargando registros. Por favor, espera...</p>
        </div>
      )}

      {error && (
        <Alert variant="danger">{error}</Alert>
      )}

      {!loading && !error && (
        <div className="table-responsive shadow-sm rounded">
          <Table striped bordered hover className="mb-0 bg-white">
            <thead className="table-dark">
              <tr>
                <th>ID</th>
                <th>Origen</th>
                <th>Tabla Original</th>
                <th>Fecha</th>
                <th>Tipo</th>
                <th>Monto</th>
                <th>Contribuyente</th>
                <th>Email</th>
                <th>Acción</th>
              </tr>
            </thead>
            <tbody>
              {records.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-4 text-muted">
                    No se encontraron registros históricos.
                  </td>
                </tr>
              ) : (
                records.map((record) => (
                  <tr key={record.id}>
                    <td><small className="text-muted">#{record.id}</small></td>
                    <td><span className={`badge ${record.origen === 'Airtable' ? 'bg-info' : 'bg-secondary'}`}>{record.origen}</span></td>
                    <td>{record.tabla_origen}</td>
                    <td><small>{new Date(record.fecha_registro).toLocaleString('es-AR')}</small></td>
                    <td>{record.tipo_operacion}</td>
                    <td className="text-end fw-bold">{record.monto ? `$${record.monto}` : '-'}</td>
                    <td>{record.nombre_responsable || '-'}</td>
                    <td>{record.email || '-'}</td>
                    <td>
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => generatePDF(record)}
                        className="d-flex align-items-center gap-1"
                      >
                        <i className="bi bi-file-earmark-pdf"></i> PDF
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </Table>
        </div>
      )}
    </Container>
  );
};

export default HistoricalJanFebData;
