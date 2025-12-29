import { useState, useMemo, useEffect } from 'react';
import './App.css';

const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

// --- Componente de Checkout de Mercado Pago ---
const Checkout = ({ preferenceId }) => {
  useEffect(() => {
    // La instancia de `mp` ahora se crea una sola vez en el componente App.
    // Aquí solo usamos la instancia existente en window.mp
    if (preferenceId && window.mp) {
      // Limpiar el contenedor antes de renderizar un nuevo botón
      const container = document.querySelector('.checkout-btn-container');
      if(container) container.innerHTML = '';

      window.mp.checkout({
        preference: { id: preferenceId },
        render: {
          container: '.checkout-btn-container',
          label: 'Pagar con Mercado Pago',
        }
      });
    }
  }, [preferenceId]);

  return <div className="checkout-btn-container"></div>;
};

// --- Componente Base de Búsqueda ---
// ... (Este componente no necesita cambios, se mantiene igual)
function BaseSearchComponent({ 
  API_BASE_URL,
  searchEndpoint, 
  itemType,
  searchPlaceholder, 
  renderItems, 
  renderItemDetails,
  getDeudaField,
  getDeudaAmount,
  updateTableId
}) {
  const [dni, setDni] = useState('');
  const [items, setItems] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);
  const [selecciones, setSelecciones] = useState({ deuda: false, meses: {} });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [preferenceId, setPreferenceId] = useState(null);
  
  const logPayment = async (estado, monto, detalle) => { /* ... */ };

  const search = async () => {
    setLoading(true);
    setError(null);
    setSuccessMessage('');
    setItems([]);
    setSelectedItem(null);
    setSelecciones({ deuda: false, meses: {} });
    setPreferenceId(null);
    try {
      const response = await fetch(`${API_BASE_URL}/${searchEndpoint}?dni=${dni}`);
      if (!response.ok) throw new Error(`Error HTTP: ${response.status}`);
      const data = await response.json();
      setItems(data);
    } catch (err) {
      setError(`Error al buscar: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const selectItem = (item) => {
    setSelectedItem(item);
    setSuccessMessage('');
    setSelecciones({ deuda: false, meses: {} });
    setPreferenceId(null);
  };

  const handleSelectionChange = (tipo, valor) => {
    setPreferenceId(null);
    setSelecciones(prev => {
      if (tipo === 'deuda') return { ...prev, deuda: !prev.deuda };
      if (tipo === 'mes') {
        const nuevosMeses = { ...prev.meses, [valor]: !prev.meses[valor] };
        return { ...prev, meses: nuevosMeses };
      }
      return prev;
    });
  };

  const totalAPagar = useMemo(() => {
    let total = 0;
    if (!selectedItem) return 0;
    if (selecciones.deuda) {
      total += parseFloat(getDeudaAmount(selectedItem)) || 0;
    }
    for (const mes in selecciones.meses) {
      if (selecciones.meses[mes]) {
        total += parseFloat(selectedItem.fields[mes.toLowerCase()]) || 0;
      }
    }
    return total;
  }, [selecciones, selectedItem, getDeudaAmount]);

  const handleCreatePreference = async () => {
    if (totalAPagar <= 0) {
      setError("El total a pagar debe ser mayor a 0.");
      return;
    }
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`${API_BASE_URL}/create_preference`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: `Pago de ${itemType} DNI ${dni}`,
          unit_price: totalAPagar,
        }),
      });

      if (!response.ok) {
         const errorData = await response.json();
         throw new Error(errorData.error || 'Falló la creación de la preferencia de pago.');
      }
      
      const data = await response.json();
      setPreferenceId(data.preference_id);

    } catch (err) {
      setError(`Error al preparar el pago: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="search-flow">
       <div className="search-section">
        <input type="text" placeholder={searchPlaceholder} value={dni} onChange={(e) => setDni(e.target.value)} />
        <button onClick={search} disabled={loading}>{loading ? 'Buscando...' : 'Buscar'}</button>
      </div>
      {error && <p className="error-message">{error}</p>}
      {successMessage && <p className="success-message">{successMessage}</p>}
      {items.length > 0 && !selectedItem && renderItems(items, selectItem)}
      {selectedItem && (
        <div className="details-section">
          {renderItemDetails(selectedItem)}
          <hr />
          <h4>Seleccione los Ítems a Pagar</h4>
          <div className="payment-options">
            {getDeudaAmount(selectedItem) > 0 && (
              <div className="payment-option">
                <input type="checkbox" id={`deuda-${itemType}`} checked={!!selecciones.deuda} onChange={() => handleSelectionChange('deuda')} />
                <label htmlFor={`deuda-${itemType}`}>{getDeudaField()}: <strong>${getDeudaAmount(selectedItem)}</strong></label>
              </div>
            )}
            <h5>Meses Individuales</h5>
            {MESES.map(m => {
              const montoMes = selectedItem.fields[m.toLowerCase()];
              if (montoMes && parseFloat(montoMes) > 0) {
                return (
                  <div key={m} className="payment-option">
                    <input type="checkbox" id={`${itemType}-${m}`} checked={!!selecciones.meses[m]} onChange={() => handleSelectionChange('mes', m)} />
                    <label htmlFor={`${itemType}-${m}`}>{m}: <strong>${montoMes}</strong></label>
                  </div>
                );
              }
              return null;
            })}
          </div>
          {totalAPagar > 0 && (
            <div className="total-section">
              <h3>Total a Pagar: ${totalAPagar.toFixed(2)}</h3>
              {!preferenceId ? (
                <button onClick={handleCreatePreference} disabled={loading}>
                  {loading ? 'Generando...' : 'Preparar Pago'}
                </button>
              ) : (
                <Checkout preferenceId={preferenceId} />
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}


// --- Componente Principal ---
function App() {
  const [vista, setVista] = useState('menu');
  const API_BASE_URL = 'http://localhost:5000/api';
  
  // La Public Key ahora se lee desde el archivo .env.local
  const MERCADOPAGO_PUBLIC_KEY = import.meta.env.VITE_MERCADOPAGO_PUBLIC_KEY;
  
  useEffect(() => {
    if (MERCADOPAGO_PUBLIC_KEY) {
        const script = document.createElement('script');
        script.src = 'https://sdk.mercadopago.com/js/v2';
        script.async = true;
        script.onload = () => {
          // Inicializamos la instancia de MercadoPago en el objeto window
          // para que esté disponible globalmente para el componente Checkout
          window.mp = new window.MercadoPago(MERCADOPAGO_PUBLIC_KEY, { locale: 'es-AR' });
        };
        document.body.appendChild(script);

        return () => {
          if(document.body.contains(script)) {
            document.body.removeChild(script);
          }
        }
    }
  }, [MERCADOPAGO_PUBLIC_KEY]);


  const renderContributivos = () => (
    <BaseSearchComponent
      API_BASE_URL={API_BASE_URL}
      searchEndpoint="search/contributivo"
      updateTableId="tblKbSq61LU1XXco0"
      itemType="lote"
      searchPlaceholder="Ingrese DNI"
      renderItems={(items, selectItem) => (
        <div className="results-section">
          <h3>Haga clic en un lote para seleccionarlo:</h3>
          <ul>{items.map(item => <li key={item.id} onClick={() => selectItem(item)}>Lote: {item.fields.lote}</li>)}</ul>
        </div>
      )}
      renderItemDetails={item => (
        <>
          <h3>Detalles del Lote</h3>
          <p><strong>Lote:</strong> {item.fields.lote}</p>
          <p><strong>Contribuyente:</strong> {item.fields.contribuyente}</p>
        </>
      )}
      getDeudaField={() => 'Deuda Acumulada'}
      getDeudaAmount={item => item.fields.deuda || 0}
    />
  );

   const renderPatente = () => (
    <BaseSearchComponent
      API_BASE_URL={API_BASE_URL}
      searchEndpoint="search/patente"
      updateTableId="tbl3CMMwccWeo8XSG"
      itemType="vehiculo"
      searchPlaceholder="Ingrese DNI del titular"
      renderItems={(items, selectItem) => (
        <div className="results-section">
          <h3>Haga clic en un vehículo para seleccionarlo:</h3>
          <ul>{items.map(item => <li key={item.id} onClick={() => selectItem(item)}>Patente: {item.fields.patente}, Marca: {item.fields.marca}</li>)}</ul>
        </div>
      )}
      renderItemDetails={item => (
        <>
          <h3>Detalles del Vehículo</h3>
          <p><strong>Patente:</strong> {item.fields.patente}</p>
          <p><strong>Titular:</strong> {item.fields.titular}</p>
        </>
      )}
      getDeudaField={() => 'Deuda Patente'}
      getDeudaAmount={item => item.fields['Deuda patente'] || 0}
    />
  );

  return (
    <div className="App">
      <h1>Sistema de Pagos</h1>
      {vista !== 'menu' && (<button className="back-button" onClick={() => setVista('menu')}>← Volver al Menú</button>)}
      {vista === 'menu' && (
        <div className="main-menu">
          <h2>Seleccione un Tipo de Pago</h2>
          <button onClick={() => setVista('contributivos')}>Pagar Contributivos</button>
          <button onClick={() => setVista('patente')}>Pagar Patente</button>
          <button onClick={() => setVista('deudas')}>Pagar Deudas (No implementado)</button>
        </div>
      )}
      {vista === 'contributivos' && renderContributivos()}
      {vista === 'patente' && renderPatente()}
       {vista === 'deudas' && (
        <div className="placeholder-section">
          <h2>Pago de Deudas</h2>
          <p>Esta funcionalidad aún no ha sido implementada.</p>
        </div>
      )}
    </div>
  );
}

export default App;
