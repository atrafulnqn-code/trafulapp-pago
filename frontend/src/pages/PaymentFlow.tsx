import React, { useState, useMemo, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { PaymentSystem, SearchResult, Debt } from '../types';
import { Container, Row, Col, Card, Form, Button, Breadcrumb, Table, Spinner, Alert, ButtonGroup, ListGroup } from 'react-bootstrap';

// Configuración de URL de API robusta:
// 1. Intenta usar window._env_ (Docker runtime). Se valida que no sea el placeholder sin reemplazar.
// 2. Si falla, usa import.meta.env (Vite build time).
// 3. Si falla, fallback a localhost.
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

function validateEmail(email: string) {
  const re = /\S+@\S+\.\S+/;
  return re.test(String(email).toLowerCase());
}

const transformData = (record: any, system: PaymentSystem, searchTerm: string): SearchResult | null => {
    if (!record) return null;
    const fields = record.fields;
    let taxpayerName = 'N/A';
    let referenceNumber = searchTerm;
    const debts: Debt[] = [];
    const meses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
    let originalRecordId = record.id;
    
    console.log("DEBUG_TRANSFORM: Iniciando transformData para sistema:", system); // Debugging
    console.log("DEBUG_TRANSFORM: Record completo:", record); // Debugging
    console.log("DEBUG_TRANSFORM: Campos (fields):", fields); // Debugging

    if (system === PaymentSystem.PATENTE || system === PaymentSystem.TASAS || system === PaymentSystem.AGUA) {
        taxpayerName = fields.titular || fields.contribuyente || 'N/A';
        referenceNumber = fields.patente || fields.lote || searchTerm;
        const deudaField = system === PaymentSystem.PATENTE ? 'Deuda patente' : 'deuda';
        
        // Handle monthly water/commercial debts
        if (system === PaymentSystem.AGUA) {
            console.log("DEBUG_TRANSFORM: Procesando sistema AGUA"); // Debugging
            for (const mes of meses) {
                // Capitalizar la primera letra del mes para que coincida con los campos de Airtable
                const mesCapitalized = mes.charAt(0).toUpperCase() + mes.slice(1);
                const aguaField = `${mesCapitalized} agua`;
                const comercialField = `${mesCapitalized} Comercial`;
                
                console.log(`DEBUG_TRANSFORM: Buscando campos: '${aguaField}' y '${comercialField}'`); // Debugging
                
                const valorAgua = fields[aguaField];
                const valorComercial = fields[comercialField];

                console.log(`DEBUG_TRANSFORM: Valor ${aguaField}: ${valorAgua}, Valor ${comercialField}: ${valorComercial}`); // Debugging

                if (valorAgua !== undefined && valorAgua !== null && parseFloat(valorAgua) > 0) {
                    debts.push({ id: `${mesCapitalized}-agua-${originalRecordId}`, period: `${mesCapitalized} (Agua)`, description: 'Cuota Agua', dueDate: 'N/A', amount: parseFloat(valorAgua), surcharge: 0 });
                    console.log(`DEBUG_TRANSFORM: Añadida deuda agua para ${mesCapitalized}: ${valorAgua}`); // Debugging
                }
                if (valorComercial !== undefined && valorComercial !== null && parseFloat(valorComercial) > 0) {
                    debts.push({ id: `${mesCapitalized}-comercial-${originalRecordId}`, period: `${mesCapitalized} (Comercial)`, description: 'Cuota Comercial', dueDate: 'N/A', amount: parseFloat(valorComercial), surcharge: 0 });
                    console.log(`DEBUG_TRANSFORM: Añadida deuda comercial para ${mesCapitalized}: ${valorComercial}`); // Debugging
                }
            }
        } else if (system === PaymentSystem.TASAS) { // Corrección para TASAS
            console.log("DEBUG_TRANSFORM: Procesando sistema TASAS"); // Debugging
            if (fields[deudaField] && parseFloat(fields[deudaField]) > 0) {
                debts.push({ id: `deuda-${originalRecordId}`, period: 'Deuda Acumulada', description: `Deuda ${system}`, dueDate: 'N/A', amount: parseFloat(fields[deudaField]), surcharge: 0 });
                console.log(`DEBUG_TRANSFORM: Añadida deuda acumulada (Tasas): ${fields[deudaField]}`); // Debugging
            }
            meses.forEach(mes => {
                // Para TASAS, los campos de los meses están en minúscula
                if (fields[mes] !== undefined && fields[mes] !== null && parseFloat(fields[mes]) > 0) {
                    debts.push({ id: `${mes}-${originalRecordId}`, period: mes.charAt(0).toUpperCase() + mes.slice(1), description: 'Cuota Mensual', dueDate: 'N/A', amount: parseFloat(fields[mes]), surcharge: 0 });
                    console.log(`DEBUG_TRANSFORM: Añadida cuota mensual para ${mes}: ${fields[mes]}`); // Debugging
                }
            });
        } else { // PATENTE logic
            console.log("DEBUG_TRANSFORM: Procesando sistema PATENTE"); // Debugging
            if (fields[deudaField] && parseFloat(fields[deudaField]) > 0) {
                debts.push({ id: `deuda-${originalRecordId}`, period: 'Deuda Acumulada', description: `Deuda ${system}`, dueDate: 'N/A', amount: parseFloat(fields[deudaField]), surcharge: 0 });
                console.log(`DEBUG_TRANSFORM: Añadida deuda acumulada (Patente): ${fields[deudaField]}`); // Debugging
            }
            meses.forEach(mes => { // Para Patente, los meses también deberían ser capitalizados si Airtable los tiene así
                 const mesCapitalized = mes.charAt(0).toUpperCase() + mes.slice(1);
                 if (fields[mesCapitalized] && parseFloat(fields[mesCapitalized]) > 0) {
                     debts.push({ id: `${mesCapitalized}-${originalRecordId}`, period: mesCapitalized, description: 'Cuota Mensual', dueDate: 'N/A', amount: parseFloat(fields[mesCapitalized]), surcharge: 0 });
                     console.log(`DEBUG_TRANSFORM: Añadida cuota mensual (Patente) para ${mesCapitalized}: ${fields[mesCapitalized]}`); // Debugging
                 }
             });
        }
    } else if (system === PaymentSystem.OTRAS) {
        console.log("DEBUG_TRANSFORM: Procesando sistema OTRAS"); // Debugging
        taxpayerName = fields['nombre y apellido'] || 'N/A';
        referenceNumber = searchTerm;
        if (fields['monto total deuda'] && parseFloat(fields['monto total deuda']) > 0) {
            debts.push({ id: record.id, period: 'Deuda General', description: record.fields['deuda en concepto de'] || 'Deuda General', dueDate: 'N/A', amount: parseFloat(record.fields['monto total deuda']), surcharge: 0 });
            console.log(`DEBUG_TRANSFORM: Añadida deuda general: ${fields['monto total deuda']}`); // Debugging
        }
    }
    console.log("DEBUG_TRANSFORM: Array de deudas final en transformData:", debts); // Debugging
    return { taxpayerName, referenceNumber, debts, originalRecordId };
};

const steps = [
  { id: 1, name: 'Identificación' },
  { id: 2, name: 'Deuda' },
  { id: 3, name: 'Confirmar y Pagar' }
];

const PaymentFlow: React.FC = () => {
    const { system } = useParams<{ system: string }>();
    const navigate = useNavigate();
    const [currentStep, setCurrentStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [inputValue, setInputValue] = useState('');
    const [result, setResult] = useState<SearchResult | null>(null);
    const [selectedDebts, setSelectedDebts] = useState<string[]>([]);
    const [email, setEmail] = useState('');
    const [isEmailValid, setIsEmailValid] = useState(false);
    const [multipleResults, setMultipleResults] = useState<any[] | null>(null);
    const [suggestions, setSuggestions] = useState<any[]>([]); // New state for suggestions
    const [showSuggestions, setShowSuggestions] = useState<boolean>(false); // New state to control suggestion visibility
    
    // NUEVO ESTADO: Controla si se muestran todos los meses o solo los adeudados/actuales
    const [showAllMonths, setShowAllMonths] = useState(false);

    const systemConfig = useMemo(() => {
        const systemKey = system?.toUpperCase().replace('-', '_') as PaymentSystem;
        switch (systemKey) {
            case PaymentSystem.PATENTE: return { name: 'Patente Automotor', endpoint: 'search/patente', searchParam: 'dni', inputLabel: 'DNI del Titular', inputPlaceholder: 'Ingrese su DNI sin puntos' };
            // MODIFIED: Changed searchParam to 'query' and updated labels for TASAS
            case PaymentSystem.TASAS: return { name: 'Tasas Retributivas', endpoint: 'search/contributivo', searchParam: 'query', inputLabel: 'DNI o Nombre del Contribuyente', inputPlaceholder: 'Ingrese DNI (sin puntos) o nombre completo' };
            case PaymentSystem.AGUA: return { name: 'Agua', endpoint: 'search/agua', searchParam: 'query', inputLabel: 'DNI o Nombre del Contribuyente', inputPlaceholder: 'Ingrese DNI (sin puntos) o nombre completo' }; // NUEVO
            case PaymentSystem.OTRAS: return { name: 'Plan de Pago', endpoint: 'search/deuda', searchParam: 'nombre', inputLabel: 'Nombre y Apellido', inputPlaceholder: 'Ingrese nombre y apellido' };
            default: navigate('/'); return null;
        }
    }, [system, navigate]);

    useEffect(() => { setIsEmailValid(validateEmail(email)); }, [email]);

    const handleSearch = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!inputValue || !systemConfig) return;
        setLoading(true);
        setError(null);
        setResult(null); // Clear previous results
        setMultipleResults(null); // Clear multiple results
        setSelectedDebts([]); // Clear selected debts
        try {
            // console.log("DEBUG: Calling API with URL:", `${API_BASE_URL}/${systemConfig.endpoint}?${systemConfig.searchParam}=${inputValue}`); // <-- ADDED DEBUG LOG
            const response = await fetch(`${API_BASE_URL}/${systemConfig.endpoint}?${systemConfig.searchParam}=${inputValue}`);
            const data = await response.json();
            // console.log("DEBUG: Respuesta del backend:", data); // Debugging
            if (!response.ok) throw new Error(data.error || 'Error en la búsqueda.');

            const systemKey = system?.toUpperCase().replace('-', '_') as PaymentSystem; // Get systemKey here

            if (data.length === 0) {
                setError('No se encontraron deudas para los datos ingresados. Verifique la información e intente nuevamente.');
            } else if (data.length === 1 || systemKey === PaymentSystem.OTRAS ) { // Direct to debt selection if one result or for 'otras'
                const transformed = transformData(data[0], systemKey, inputValue);
                if (!transformed || transformed.debts.length === 0) {
                    // console.log("DEBUG: transformData devolvió sin deudas o nulo."); // Debugging
                    setError('No se encontraron deudas para los datos ingresados. Verifique la información e intente nuevamente.');
                } else {
                    // console.log("DEBUG: transformData devolvió deudas. Estableciendo resultados y paso."); // Debugging
                    setResult(transformed);
                    if (systemKey === PaymentSystem.OTRAS) {
                        setSelectedDebts(transformed.debts.map(d => d.id));
                    }
                    // Reiniciar showAllMonths al cargar un nuevo resultado
                    setShowAllMonths(false); 
                    setCurrentStep(2);
                }
            } else { // Multiple results for patente, tasas or agua
                // console.log("DEBUG: Múltiples resultados. Estableciendo multipleResults y paso 1.5."); // Debugging
                setMultipleResults(data);
                // Reiniciar showAllMonths al cargar un nuevo resultado
                setShowAllMonths(false);
                setCurrentStep(1.5); // Intermediate step for selection
            }
        } catch (err: any) { 
            console.error("DEBUG: Error en handleSearch:", err); // Debugging
            setError(err.message); 
        } finally { 
            setLoading(false); 
        }
    };

    const toggleDebt = (id: string) => {
        if (system?.toUpperCase().replace('-', '_') as PaymentSystem === PaymentSystem.OTRAS) return;
        setSelectedDebts(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
    };
    
    // Meses para filtrar y mostrar
    const meses = useMemo(() => ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'], []);
    const currentMonthIndex = useMemo(() => new Date().getMonth(), []); // 0 for Jan, 1 for Feb...

    const filteredDebtsByMonth = useMemo(() => {
        if (!result) return [];
        
        const systemKey = system?.toUpperCase().replace('-', '_') as PaymentSystem;

        if (systemKey === PaymentSystem.OTRAS) { // "Plan de Pago" siempre muestra todo
            return result.debts;
        }

        // Si showAllMonths es true, mostrar todas las deudas, excepto las que no tienen monto (no se deberían generar)
        if (showAllMonths) {
            return result.debts;
        }
        
        // Lógica corregida: Mostrar si es el mes actual O (es un mes pasado Y tiene deuda)
        return result.debts.filter(debt => {
            // "Deuda Acumulada" o "Deuda General" siempre se muestran
            if (debt.period.includes('Deuda Acumulada') || debt.period.includes('General')) return true;

            const debtMonthName = debt.period.split(' ')[0].toLowerCase(); // "Enero (Agua)" -> "enero"
            const mesIndex = meses.indexOf(debtMonthName);

            if (mesIndex === -1) return false; // No es un mes válido, ocultarlo

            // Mostrar si es el mes actual O (es un mes pasado Y tiene un monto > 0)
            return (mesIndex === currentMonthIndex) || 
                   (mesIndex < currentMonthIndex && debt.amount > 0);
        });
    }, [result, showAllMonths, currentMonthIndex, meses, system]);


    const toggleAllDebts = () => {
        if (!result) return;
        // Usar filteredDebtsByMonth en lugar de result.debts directamente para la selección masiva
        if (selectedDebts.length === filteredDebtsByMonth.length && filteredDebtsByMonth.length > 0) { 
            setSelectedDebts([]); 
        } else { 
            setSelectedDebts(filteredDebtsByMonth.map(d => d.id) || []); 
        }
    };

    const totalAmount = filteredDebtsByMonth.filter(d => selectedDebts.includes(d.id)).reduce((acc, curr) => acc + curr.amount + curr.surcharge, 0) || 0;

    const getItemsToPay = () => {
        const selectedDebtDetails = result?.debts.filter(d => selectedDebts.includes(d.id)); // Usar result.debts, no filtered, para obtener todos los detalles
        const systemKey = system?.toUpperCase().replace('-', '_') as PaymentSystem;
        let itemTypeForBackend = '';
        if (systemKey === PaymentSystem.PATENTE) itemTypeForBackend = 'vehiculo';
        else if (systemKey === PaymentSystem.TASAS) itemTypeForBackend = 'lote';
        else if (systemKey === PaymentSystem.AGUA) itemTypeForBackend = 'agua'; // NUEVO
        else if (systemKey === PaymentSystem.OTRAS) itemTypeForBackend = 'deuda_general';

        return {
            record_id: result?.originalRecordId, item_type: itemTypeForBackend, dni: systemConfig?.searchParam === 'dni' ? inputValue : undefined,
            nombre_contribuyente: systemConfig?.searchParam === 'nombre' ? inputValue : undefined,
            email: email, total_amount: totalAmount,
            deuda: selectedDebts.some(id => id.includes('deuda')), deuda_monto: result?.debts.find(d => d.id.includes('deuda'))?.amount || 0,
            // Los meses enviados al backend deben reflejar los meses seleccionados, no necesariamente solo los filtrados
            meses: selectedDebtDetails?.filter(d => !d.id.includes('deuda')).reduce((acc, d) => ({ ...acc, [d.period.split(' ')[0].toLowerCase()]: true }), {}), // "Enero (Agua)" -> "enero"
            meses_montos: selectedDebtDetails?.filter(d => !d.id.includes('deuda')).reduce((acc, d) => ({ ...acc, [d.period.split(' ')[0].toLowerCase()]: d.amount }), {})
        };
    };

        const handleFinalPayment = async () => {

            if (!isEmailValid) { setError("Por favor, ingrese un email válido para continuar."); return; }

            setLoading(true);

            setError(null);

            try {

                const itemsToPay = getItemsToPay();

                const endpoint = '/create_preference'; // Solo Mercado Pago

                

                const response = await fetch(`${API_BASE_URL}${endpoint}`, { 

                    method: 'POST', 

                    headers: { 'Content-Type': 'application/json' }, // Corrected: application/json

                    body: JSON.stringify({ items_to_pay: itemsToPay, title: `Pago de ${systemConfig?.name}`, unit_price: totalAmount }) 

                });

                

                const data = await response.json();

                if (!response.ok) throw new Error(data.error || 'Falló la creación del pago.');

                

                if (data.preference_id) { 

                    // Priorizar Producción (init_point) sobre Sandbox

                    if (data.init_point) {

                        window.location.href = data.init_point;

                    } else if (data.sandbox_init_point) {

                        window.location.href = data.sandbox_init_point;

                    } else {

                        throw new Error("No se recibió una URL de inicio de pago de Mercado Pago.");

                    }

                } else { throw new Error("No se recibió un ID de preferencia de pago.") }

    

            } catch (err: any) { setError(`Error al procesar el pago: ${err.message}`); setCurrentStep(3); } finally { setLoading(false); }

        };

        
        const renderStepContent = () => {
        const systemKey = system?.toUpperCase().replace('-', '_') as PaymentSystem;

        return (
            <>
                {currentStep === 1 && ( // Identification
                    <div className="text-center">
                      <h3 className="mb-3 fw-bold">Comencemos</h3>
                      {/* Adjusted font size for the instruction text */}
                      <p className="text-muted mb-4" style={{fontSize: '0.9rem'}}>Por favor, ingrese su {systemConfig?.inputLabel?.toLowerCase()} para encontrar sus deudas.</p>
                      <Form onSubmit={handleSearch} className="mx-auto" style={{ maxWidth: '400px' }}>
                        <Form.Group className="mb-3" controlId="searchInput">
                          <Form.Control 
                            type="text" 
                            value={inputValue} 
                            onChange={(e) => { 
                                setInputValue(e.target.value); 
                                setShowSuggestions(true); // Always show suggestions when typing
                            }} 
                            placeholder={systemConfig?.inputPlaceholder} 
                            // Removed size="lg" to allow placeholder text to fit better
                            required 
                            list={systemConfig?.searchParam === 'nombre' ? "suggestions-list" : undefined}
                          />
                          {systemConfig?.searchParam === 'nombre' && showSuggestions && suggestions.length > 0 && (
                            <datalist id="suggestions-list">
                              {suggestions.map((s) => (
                                <option key={s.id} value={s.nombre_completo} />
                              ))}
                            </datalist>
                          )}
                        </Form.Group>
                        <Button type="submit" /* Changed text here */ disabled={!inputValue || loading} className="w-100">Buscar</Button>
                      </Form>
                    </div>
                )}

                {currentStep === 1.5 && ( // Multiple Results Selection for Patente OR Tasas OR Agua
                    (() => { // Usamos una IIFE para poder usar constantes y returns condicionales
                        if (!multipleResults) return null;
                        const isPatente = systemKey === PaymentSystem.PATENTE;
                        const isAgua = systemKey === PaymentSystem.AGUA;
                        let title = "Múltiples Propiedades Encontradas";
                        let instruction = "Seleccione la propiedad cuya deuda desea consultar.";

                        if (isPatente) {
                            title = "Múltiples Vehículos Encontrados";
                            instruction = "Seleccione el vehículo cuya deuda desea consultar.";
                        } else if (isAgua) {
                            title = "Múltiples Conexiones de Agua Encontradas";
                            instruction = "Seleccione la conexión de agua cuya deuda desea consultar.";
                        }

                        return (
                            <>
                              <h3 className="fw-bold mb-3 text-center">{title}</h3>
                              <p className="text-muted mb-4 text-center">{instruction}</p>
                              <ListGroup className="mb-4">
                                  {multipleResults.map((record, index) => (
                                      <ListGroup.Item 
                                        key={record.id} 
                                        action 
                                        onClick={() => {
                                            const transformed = transformData(record, systemKey, inputValue);
                                            if (!transformed || transformed.debts.length === 0) {
                                                setError('No se encontraron deudas para la selección. Intente con otra.');
                                                setMultipleResults(null); // Clear selection
                                                setCurrentStep(1); // Go back to search
                                            } else {
                                                setResult(transformed);
                                                // Seleccionar automáticamente deudas filtradas por mes
                                                const defaultSelectedDebts = transformed.debts.filter(debt => {
                                                    if (debt.period.includes('Deuda Acumulada') || debt.period.includes('General')) return true;
                                                    const debtMonthName = debt.period.split(' ')[0].toLowerCase();
                                                    const mesIndex = meses.indexOf(debtMonthName);
                                                    return (mesIndex === currentMonthIndex) || (mesIndex < currentMonthIndex && debt.amount > 0);
                                                }).map(d => d.id);
                                                setSelectedDebts(defaultSelectedDebts);
                                                setShowAllMonths(false); // Reiniciar estado
                                                setCurrentStep(2);
                                            }
                                        }}
                                        className="d-flex justify-content-between align-items-center"
                                      >
                                        <div>
                                            <h5 className="mb-1">
                                                {isPatente ? 
                                                    (record.fields.patente || 'Patente Desconocida') :
                                                    (isAgua ? `Conexión: ${record.fields.lote || 'Desconocida'}` : 
                                                    (record.fields.lote ? `Lote: ${record.fields.lote}` : 'Lote Desconocido'))
                                                }
                                            </h5>
                                            <small className="text-muted">
                                                {isPatente ? 
                                                    `Titular: ${record.fields.titular || record.fields.contribuyente || 'Desconocido'}` :
                                                    `Contribuyente: ${record.fields.contribuyente || 'Desconocido'}${record.fields.nomenclatura_catastral ? ` - Nomenclatura Catastral: ${record.fields.nomenclatura_catastral}` : ''}`
                                                }
                                            </small>
                                        </div>
                                        <div className="btn btn-outline-primary btn-sm">Seleccionar</div>
                                      </ListGroup.Item>
                                  ))}
                              </ListGroup>
                              <div className="text-center">
                                  <Button variant="outline-secondary" onClick={() => { setMultipleResults(null); setCurrentStep(1); setShowAllMonths(false); }}>&larr; Volver a buscar</Button>
                              </div>
                            </>
                        );
                    })() // Cierre de la IIFE
                )}

                {currentStep === 2 && ( // Debt Selection
                    (() => { // Usamos una IIFE para poder usar constantes y returns condicionales
                        if (!result) return null;
                        const systemKeyForDebts = system?.toUpperCase().replace('-', '_') as PaymentSystem;

                        return (
                            <>
                              <div className="d-flex justify-content-between align-items-start mb-4">
                                <div>
                                  <h3 className="fw-bold mb-1">Deudas Encontradas</h3>
                                  <p className="mb-0 text-muted">Contribuyente: <span className="fw-semibold text-dark">{result.taxpayerName}</span></p>
                                  <p className="text-muted">Referencia: <span className="fw-semibold text-dark">{result.referenceNumber}</span></p>
                                </div>
                                <Button variant="outline-secondary" size="sm" onClick={() => { setCurrentStep(1); setResult(null); setError(null); setShowAllMonths(false); }}>&larr; Volver a buscar</Button>
                              </div>

                              {/* Botones para mostrar/ocultar meses y seleccionar todo */}
                              {systemKeyForDebts !== PaymentSystem.OTRAS && ( // No mostrar para Plan de Pago
                                <div className="d-flex justify-content-end mb-3 gap-2">
                                    <Button variant="outline-primary" size="sm" onClick={() => setShowAllMonths(!showAllMonths)}>
                                        {showAllMonths ? 'Ocultar meses futuros' : 'Mostrar todo el año'}
                                    </Button>
                                    <Button variant="outline-success" size="sm" onClick={toggleAllDebts}>
                                        {selectedDebts.length === filteredDebtsByMonth.length && filteredDebtsByMonth.length > 0 ? 'Deseleccionar todo' : 'Seleccionar todo'}
                                    </Button>
                                </div>
                              )}

                              <Table striped bordered hover responsive>
                                <thead>
                                  <tr>
                                    <th><Form.Check type="checkbox" checked={selectedDebts.length === filteredDebtsByMonth.length && filteredDebtsByMonth.length > 0} onChange={toggleAllDebts} disabled={systemKeyForDebts === PaymentSystem.OTRAS} /></th>
                                    <th>Período</th>
                                    <th>Concepto</th>
                                    <th className="text-end">Monto</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {filteredDebtsByMonth.map((debt) => ( // Usar deudas filtradas aquí
                                    <tr key={debt.id}>
                                      <td><Form.Check type="checkbox" checked={selectedDebts.includes(debt.id)} onChange={() => toggleDebt(debt.id)} disabled={systemKeyForDebts === PaymentSystem.OTRAS} /></td>
                                      <td>{debt.period}</td>
                                      <td>{debt.description}</td>
                                      <td className="text-end fw-semibold">${debt.amount.toFixed(2)}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </Table>
                              <div className="mt-4 d-flex justify-content-end align-items-center">
                                <div className="text-end me-4">
                                  <p className="text-muted mb-0">Total a Pagar</p>
                                  <p className="h2 fw-bold">${totalAmount.toFixed(2)}</p>
                                </div>
                                <Button size="lg" variant="primary" onClick={() => setCurrentStep(3)} disabled={totalAmount === 0}>Continuar al Pago</Button>
                              </div>
                            </>
                        );
                    })() // Cierre de la IIFE
                )}

                {currentStep === 3 && ( // Confirmation
                    <div className="mx-auto" style={{ maxWidth: '500px' }}>
                        <h3 className="text-center fw-bold mb-3">Confirmar y Pagar</h3>
                        <p className="text-center text-muted mb-4">Revise el resumen y complete su email para generar el link de pago.</p>
                        <Card className="mb-4">
                            <Card.Header as="h5">Resumen de Pago</Card.Header>
                            <Card.Body>
                                {result?.debts.filter(d => selectedDebts.includes(d.id)).map(debt => (
                                   <div key={debt.id} className="d-flex justify-content-between mb-1"><span className="text-muted">{debt.period}</span><span>${debt.amount.toFixed(2)}</span></div>
                                ))}
                                <hr/>
                                <div className="d-flex justify-content-between h5 fw-bold"><span>Total</span><span>${totalAmount.toFixed(2)}</span></div>
                            </Card.Body>
                        </Card>
                        <Form>
                           <Form.Group className="mb-3" controlId="emailInput">
                             <Form.Label>Email para recibir el comprobante <span className="text-danger fw-bold ms-1" style={{fontSize: '0.8rem'}}>(OBLIGATORIO COMPLETAR CON EMAIL)</span></Form.Label>
                             <Form.Control type="email" value={email} onChange={(e) => { setEmail(e.target.value); setError(null); }} placeholder="ejemplo@email.com" isInvalid={!isEmailValid && email.length > 0} required size="lg"/>
                             <Form.Control.Feedback type="invalid">Por favor, ingrese un email válido.</Form.Control.Feedback>
                           </Form.Group>

                           <div className="d-grid gap-2">
                                <Button 
                                    size="lg" 
                                    onClick={handleFinalPayment} 
                                    disabled={!isEmailValid || loading || totalAmount === 0}
                                    style={{ backgroundColor: '#009EE3', borderColor: '#009EE3', color: 'white', fontWeight: 'bold', padding: '15px' }}
                                    className="d-flex align-items-center justify-content-center gap-2 shadow-sm"
                                >
                                    {loading ? (
                                        <div className="spinner-border spinner-border-sm text-light" role="status"></div>
                                    ) : (
                                        <>
                                            <span>Pagar con Mercado Pago</span>
                                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" className="bi bi-credit-card-2-back-fill" viewBox="0 0 16 16">
                                                <path d="M0 4a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v5H0V4zm11.5 1a.5.5 0 0 0-.5.5v1a.5.5 0 0 0 .5.5h2a.5.5 0 0 0 .5-.5v-1a.5.5 0 0 0-.5-.5h-2zM0 11v1a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-1H0z"/>
                                            </svg>
                                        </>
                                    )}
                                </Button>
                           </div>
                           <Button variant="outline-secondary" onClick={() => setCurrentStep(2)} className="w-100 mt-3">&larr; Volver a seleccionar</Button>
                        </Form>
                    </div>
                )}
            </>
        );
    };

    return (
        <Container className="py-5">
            <Row className="justify-content-center">
                <Col md={10} lg={8}>
                    <div className="text-center">
                        <h1 className="h2 fw-bold">Portal de Pagos</h1>
                        <p className="lead text-muted mb-4">"{systemConfig?.name}"</p>
                        <Button variant="outline-primary" size="sm" onClick={() => navigate('/')} className="mb-4">&larr; Volver al Inicio</Button>
                    </div>
                    
                    <Breadcrumb>
                        {steps.map(step => (
                            <Breadcrumb.Item key={step.id} active={currentStep === step.id} onClick={() => currentStep > step.id && setCurrentStep(step.id)} linkProps={{ role: 'button' }}>
                                {step.name}
                            </Breadcrumb.Item>
                        ))}
                    </Breadcrumb>
                    
                    <Card className="shadow-lg">
                        <Card.Body className="p-4 p-md-5 position-relative" style={{ minHeight: '400px' }}>
                            {loading && <div className="position-absolute top-0 start-0 w-100 h-100 d-flex justify-content-center align-items-center bg-white bg-opacity-75" style={{ zIndex: 10 }}><Spinner animation="border" variant="primary" /></div>}
                            {error && <Alert variant="danger" onClose={() => setError(null)} dismissible className="position-absolute top-0 start-0 end-0 mx-4 mt-4" style={{ zIndex: 11 }}>{error}</Alert>}
                            {renderStepContent()}
                        </Card.Body>
                    </Card>
                </Col>
            </Row>
        </Container>
    );
};

export default PaymentFlow;
