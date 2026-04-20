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
    // Generar un PDF usando la función de impresión nativa del navegador para mayor robustez
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert("Por favor habilita las ventanas emergentes para ver el PDF.");
      return;
    }

    let detalleRows = '';
    const details = typeof record.datos_adicionales === 'string' 
      ? JSON.parse(record.datos_adicionales) 
      : record.datos_adicionales;

    for (const [key, value] of Object.entries(details)) {
        if (typeof value === 'object' && value !== null) {
            detalleRows += `<tr><td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>${key}</strong></td><td style="padding: 8px; border-bottom: 1px solid #ddd;"><pre style="margin:0; font-size:10px;">${JSON.stringify(value, null, 2)}</pre></td></tr>`;
        } else {
            detalleRows += `<tr><td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>${key}</strong></td><td style="padding: 8px; border-bottom: 1px solid #ddd;">${value}</td></tr>`;
        }
    }

    const htmlContent = `
      <!DOCTYPE html>
      <html lang="es">
      <head>
          <meta charset="UTF-8">
          <title>Comprobante - ${record.id}</title>
          <style>
              body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 40px; color: #333; }
              .header { text-align: center; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 2px solid #0056b3; }
              .header h1 { margin: 0; color: #0056b3; }
              .header p { margin: 5px 0 0; color: #666; }
              .info-box { background: #f8f9fa; border: 1px solid #e9ecef; border-radius: 8px; padding: 20px; margin-bottom: 30px; }
              .info-row { display: flex; justify-content: space-between; margin-bottom: 10px; }
              .info-row span:first-child { font-weight: bold; color: #495057; }
              table { width: 100%; border-collapse: collapse; margin-top: 20px; }
              th { background-color: #0056b3; color: white; padding: 10px; text-align: left; }
              .footer { margin-top: 50px; text-align: center; font-size: 12px; color: #999; }
              @media print {
                  body { padding: 0; }
                  .no-print { display: none; }
              }
          </style>
      </head>
      <body>
          <div class="no-print" style="margin-bottom: 20px;">
              <button onclick="window.print()" style="padding: 10px 20px; background: #0056b3; color: white; border: none; border-radius: 5px; cursor: pointer; font-size: 16px;">Imprimir / Guardar PDF</button>
          </div>
          <div class="header">
              <h1>Comprobante Histórico</h1>
              <p>Período: 19 de Enero al 10 de Febrero 2026</p>
          </div>
          
          <div class="info-box">
              <div class="info-row"><span>ID Registro:</span> <span>#${record.id}</span></div>
              <div class="info-row"><span>Fecha:</span> <span>${record.fecha_registro}</span></div>
              <div class="info-row"><span>Origen de Datos:</span> <span>${record.origen} - ${record.tabla_origen}</span></div>
              <div class="info-row"><span>Tipo de Operación:</span> <span>${record.tipo_operacion}</span></div>
              <div class="info-row"><span>Responsable:</span> <span>${record.nombre_responsable || '-'}</span></div>
              <div class="info-row"><span>Monto:</span> <span style="font-size: 1.2em; color: #0056b3; font-weight: bold;">${record.monto ? '$' + record.monto : '-'}</span></div>
          </div>

          <h3>Detalles Completos (Datos Crudos)</h3>
          <table>
              <thead>
                  <tr>
                      <th>Campo</th>
                      <th>Valor</th>
                  </tr>
              </thead>
              <tbody>
                  ${detalleRows}
              </tbody>
          </table>

          <div class="footer">
              <p>Este comprobante fue generado automáticamente por el sistema de auditoría del Tablero Traful.</p>
              <p>Fecha de emisión: ${new Date().toLocaleString()}</p>
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
          <p className="text-muted">Total de registros unificados: {records.length}</p>
        </div>
        <Button variant="outline-danger" onClick={handleLogout}>Cerrar Sesión</Button>
      </div>

      {loading && (
        <div className="text-center py-5">
           <Spinner animation="border" variant="primary" />
           <p className="mt-3">Cargando 1.903 registros. Por favor, espera...</p>
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
                <th>Origen</th>
                <th>Tabla</th>
                <th>Fecha</th>
                <th>Tipo</th>
                <th>Monto</th>
                <th>Responsable</th>
                <th>Email</th>
                <th>Acción</th>
              </tr>
            </thead>
            <tbody>
              {records.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-4 text-muted">
                    No se encontraron registros históricos en la base de datos para estas fechas.
                  </td>
                </tr>
              ) : (
                records.map((record) => (
                  <tr key={record.id}>
                    <td><span className={`badge ${record.origen === 'Airtable' ? 'bg-info' : 'bg-secondary'}`}>{record.origen}</span></td>
                    <td>{record.tabla_origen}</td>
                    <td><small>{new Date(record.fecha_registro).toLocaleString()}</small></td>
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
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                          <path d="M14 14V4.5L9.5 0H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2zM9.5 3A1.5 1.5 0 0 0 11 4.5h2V14a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1h5.5v2z"/>
                          <path d="M4.603 14.087a.81.81 0 0 1-.438-.42c-.195-.388-.13-.776.08-1.102.198-.307.526-.568.897-.787a7.68 7.68 0 0 1 1.482-.645 19.697 19.697 0 0 0 1.062-2.227 7.269 7.269 0 0 1-.43-1.295c-.086-.4-.119-.796-.046-1.136.075-.354.274-.672.65-.823.192-.077.4-.12.602-.077a.7.7 0 0 1 .477.365c.088.164.12.356.127.538.007.188-.012.396-.047.614-.084.51-.27 1.134-.52 1.794a10.954 10.954 0 0 0 .98 1.686 5.753 5.753 0 0 1 1.334.05c.364.066.734.195.96.465.12.144.193.32.2.518.007.192-.047.382-.138.563a1.04 1.04 0 0 1-.354.416.856.856 0 0 1-.51.138c-.331-.014-.654-.196-.933-.417a5.712 5.712 0 0 1-.911-.95 11.651 11.651 0 0 0-1.997.406 11.307 11.307 0 0 1-1.02 1.51c-.292.35-.609.656-.927.787a.793.793 0 0 1-.58.029zm1.379-1.901c-.166.076-.32.156-.459.238-.328.194-.541.383-.647.547-.094.145-.096.25-.04.361.01.022.02.036.026.044a.266.266 0 0 0 .035-.012c.137-.056.355-.235.635-.572a8.18 8.18 0 0 0 .45-.606zm1.64-1.33a12.71 12.71 0 0 1 1.01-.193 11.744 11.744 0 0 1-.51-.858 20.801 20.801 0 0 1-.5 1.05zm2.446.45c.15.163.296.3.435.41.24.19.407.253.498.256a.107.107 0 0 0 .07-.015.307.307 0 0 0 .094-.125.436.436 0 0 0 .059-.2.095.095 0 0 0-.026-.063c-.052-.062-.2-.152-.518-.209a3.876 3.876 0 0 0-.612-.053zM8.078 7.8a6.7 6.7 0 0 0 .2-.828c.031-.188.043-.343.038-.465a.613.613 0 0 0-.032-.198.517.517 0 0 0-.145.04c-.087.035-.158.106-.196.283-.04.192-.03.469.046.822.024.111.054.227.09.346z"/>
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
      )}
    </Container>
  );
};

export default HistoricalJanFebData;
