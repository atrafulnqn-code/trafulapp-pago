import { useState, useMemo, useEffect } from 'react';
import './App.css';

// ... (Componentes Checkout y BaseSearchComponent se mantienen igual pero se incluirán en el archivo final)

// --- Componente Principal ---
function App() {
  const [vista, setVista] = useState('menu');
  const [paymentResult, setPaymentResult] = useState(null); // Para guardar el resultado del pago

  const MERCADOPAGO_PUBLIC_KEY = import.meta.env.VITE_MERCADOPAGO_PUBLIC_KEY;
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

  // Efecto para detectar la vuelta desde Mercado Pago
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const status = urlParams.get('status');
    const paymentId = urlParams.get('payment_id');
    const externalReference = urlParams.get('external_reference');

    if (status && paymentId && externalReference) {
      // Parsear el external_reference para obtener el record_id del historial
      try {
        const refData = JSON.parse(externalReference);
        setPaymentResult({
          status: status,
          paymentId: paymentId,
          historialRecordId: refData.historialRecordId // Asumimos que pasaremos esto
        });
        setVista('pago_exitoso'); // Cambiar a la nueva vista de éxito
      } catch (e) {
        console.error("Error al parsear external_reference:", e);
      }
    }
  }, []);

  // ... (Efecto para la SDK de Mercado Pago se mantiene)


  // --- Vista de Pago Exitoso ---
  const PagoExitosoView = () => {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');

    const handleSendEmail = async () => {
        setLoading(true);
        setMessage('');
        try {
            const response = await fetch(`${API_BASE_URL}/send_receipt`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    record_id: paymentResult.historialRecordId,
                    email: email
                })
            });
            if (!response.ok) throw new Error("Error al enviar el email.");
            setMessage("¡Comprobante enviado exitosamente!");
        } catch (err) {
            setMessage(err.message);
        } finally {
            setLoading(false);
        }
    };

    if (!paymentResult) return <p>Cargando resultado del pago...</p>;

    return (
      <div className="details-section">
        <h2>¡Pago {paymentResult.status === 'approved' ? 'Aprobado' : 'Fallido'}!</h2>
        <p>Tu número de operación de Mercado Pago es: {paymentResult.paymentId}</p>
        
        {paymentResult.status === 'approved' && (
          <div className="receipt-actions">
            <hr/>
            <h4>Comprobante de Pago</h4>
            <a 
              href={`${API_BASE_URL}/receipt/${paymentResult.historialRecordId}`} 
              target="_blank" 
              rel="noopener noreferrer"
              className="button-like"
            >
              Descargar Comprobante
            </a>

            <div className="send-email-section">
              <input 
                type="email" 
                placeholder="Ingresa tu email para enviar el comprobante"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <button onClick={handleSendEmail} disabled={loading}>
                {loading ? 'Enviando...' : 'Enviar por Email'}
              </button>
            </div>
            {message && <p>{message}</p>}
          </div>
        )}
        <hr/>
        <button onClick={() => setVista('menu')}>Volver al Menú Principal</button>
      </div>
    );
  };


  // ... (El resto de los componentes y funciones de render se mantienen)
  
  return (
    <div className="App">
      <h1>Sistema de Pagos</h1>
      {vista !== 'menu' && vista !== 'pago_exitoso' && (<button className="back-button" onClick={() => setVista('menu')}>← Volver al Menú</button>)}
      
      {vista === 'menu' && (
        <div className="main-menu">
            {/* ... */}
        </div>
      )}
      
      {vista === 'pago_exitoso' && <PagoExitosoView />}

      {/* ... El resto de las vistas ... */}
    </div>
  );
}

export default App;