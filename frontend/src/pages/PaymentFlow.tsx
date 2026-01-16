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
    if (system === PaymentSystem.PATENTE || system === PaymentSystem.TASAS) {
        taxpayerName = fields.titular || fields.contribuyente || 'N/A';
        referenceNumber = fields.patente || fields.lote || searchTerm;
        const deudaField = system === PaymentSystem.PATENTE ? 'Deuda patente' : 'deuda';
        if (fields[deudaField] && parseFloat(fields[deudaField]) > 0) {
            debts.push({ id: `deuda-${originalRecordId}`, period: 'Deuda Acumulada', description: `Deuda ${system}`, dueDate: 'N/A', amount: parseFloat(fields[deudaField]), surcharge: 0 });
        }
        meses.forEach(mes => {
            if (fields[mes] && parseFloat(fields[mes]) > 0) {
                debts.push({ id: `${mes}-${originalRecordId}`, period: mes.charAt(0).toUpperCase() + mes.slice(1), description: 'Cuota Mensual', dueDate: 'N/A', amount: parseFloat(fields[mes]), surcharge: 0 });
            }
        });
    } else if (system === PaymentSystem.OTRAS) {
        console.log("DEBUG: Datos de deuda recibidos para DEUDAS:", record.fields);
        taxpayerName = fields['nombre y apellido'] || 'N/A';
        referenceNumber = searchTerm;
        if (fields['monto total deuda'] && parseFloat(fields['monto total deuda']) > 0) {
            debts.push({ id: record.id, period: 'Deuda General', description: record.fields['deuda en concepto de'] || 'Deuda General', dueDate: 'N/A', amount: parseFloat(record.fields['monto total deuda']), surcharge: 0 });
        }
    }
    console.log("DEBUG: Array de deudas final en transformData:", debts);
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

    const systemConfig = useMemo(() => {
        const systemKey = system?.toUpperCase().replace('-', '_') as PaymentSystem;
        switch (systemKey) {
            case PaymentSystem.PATENTE: return { name: 'Patente Automotor', endpoint: 'search/patente', searchParam: 'dni', inputLabel: 'DNI del Titular', inputPlaceholder: 'Ingrese su DNI sin puntos' };
            case PaymentSystem.TASAS: return { name: 'Tasas Retributivas', endpoint: 'search/contributivo', searchParam: 'dni', inputLabel: 'DNI del Contribuyente', inputPlaceholder: 'Ingrese su DNI sin puntos' };
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
            console.log("DEBUG: Calling API with URL:", `${API_BASE_URL}/${systemConfig.endpoint}?${systemConfig.searchParam}=${inputValue}`); // <-- ADDED DEBUG LOG
            const response = await fetch(`${API_BASE_URL}/${systemConfig.endpoint}?${systemConfig.searchParam}=${inputValue}`);
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Error en la búsqueda.');

            if (data.length === 0) {
                setError('No se encontraron deudas para los datos ingresados. Verifique la información e intente nuevamente.');
            } else if (data.length === 1 || (system?.toUpperCase().replace('-', '_') !== PaymentSystem.PATENTE)) {
                // If only one result, or if not patente system, proceed directly
                const transformed = transformData(data[0], system?.toUpperCase().replace('-', '_') as PaymentSystem, inputValue);
                if (!transformed || transformed.debts.length === 0) {
                    setError('No se encontraron deudas para los datos ingresados. Verifique la información e intente nuevamente.');
                } else {
                    setResult(transformed);
                    if (system?.toUpperCase().replace('-', '_') as PaymentSystem === PaymentSystem.OTRAS) {
                        setSelectedDebts(transformed.debts.map(d => d.id));
                    }
                    setCurrentStep(2);
                }
            } else { // Multiple results for patente
                setMultipleResults(data);
                setCurrentStep(1.5); // Intermediate step for selection
            }
        } catch (err: any) { setError(err.message); } finally { setLoading(false); }
    };

    const toggleDebt = (id: string) => {
        if (system?.toUpperCase().replace('-', '_') as PaymentSystem === PaymentSystem.OTRAS) return;
        setSelectedDebts(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
    };
    
    const toggleAllDebts = () => {
        if (selectedDebts.length === result?.debts.length) { setSelectedDebts([]); } 
        else { setSelectedDebts(result?.debts.map(d => d.id) || []); }
    };

    const totalAmount = result?.debts.filter(d => selectedDebts.includes(d.id)).reduce((acc, curr) => acc + curr.amount + curr.surcharge, 0) || 0;

    const getItemsToPay = () => {
        const selectedDebtDetails = result?.debts.filter(d => selectedDebts.includes(d.id));
        const systemKey = system?.toUpperCase().replace('-', '_') as PaymentSystem;
        let itemTypeForBackend = '';
        if (systemKey === PaymentSystem.PATENTE) itemTypeForBackend = 'vehiculo';
        else if (systemKey === PaymentSystem.TASAS) itemTypeForBackend = 'lote';
        else if (systemKey === PaymentSystem.OTRAS) itemTypeForBackend = 'deuda_general';

        return {
            record_id: result?.originalRecordId, item_type: itemTypeForBackend, dni: systemConfig?.searchParam === 'dni' ? inputValue : undefined,
            nombre_contribuyente: systemConfig?.searchParam === 'nombre' ? inputValue : undefined,
            email: email, total_amount: totalAmount,
            deuda: selectedDebts.some(id => id.includes('deuda')), deuda_monto: result?.debts.find(d => d.id.includes('deuda'))?.amount || 0,
            meses: selectedDebtDetails?.filter(d => !d.id.includes('deuda')).reduce((acc, d) => ({ ...acc, [d.period.toLowerCase()]: true }), {}),
            meses_montos: selectedDebtDetails?.filter(d => !d.id.includes('deuda')).reduce((acc, d) => ({ ...acc, [d.period.toLowerCase()]: d.amount }), {})
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

                    headers: { 'Content-Type': 'application/json' }, 

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
        switch (currentStep) {
            case 1: // Identification
                return (
                    <div className="text-center">
                      <h3 className="mb-3 fw-bold">Comencemos</h3>
                      <p className="text-muted mb-4">Por favor, ingrese su {systemConfig?.inputLabel?.toLowerCase()} para encontrar sus deudas.</p>
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
                            size="lg" 
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
                        <Button type="submit" size="lg" disabled={!inputValue || loading} className="w-100">Buscar Deuda</Button>
                      </Form>
                    </div>
                );
            case 1.5: // Vehicle Selection for Patente
                if (!multipleResults) return null;
                return (
                    <>
                      <h3 className="fw-bold mb-3 text-center">Múltiples Vehículos Encontrados</h3>
                      <p className="text-muted mb-4 text-center">Seleccione el vehículo cuya deuda desea consultar.</p>
                      <ListGroup className="mb-4">
                          {multipleResults.map((record, index) => (
                              <ListGroup.Item 
                                key={record.id} 
                                action 
                                onClick={() => {
                                    const transformed = transformData(record, system?.toUpperCase().replace('-', '_') as PaymentSystem, inputValue);
                                    if (transformed && transformed.debts.length > 0) {
                                        setResult(transformed);
                                        setCurrentStep(2);
                                    } else {
                                        setError('No se encontraron deudas para el vehículo seleccionado.');
                                        setMultipleResults(null); // Clear selection
                                        setCurrentStep(1); // Go back to search
                                    }
                                }}
                                className="d-flex justify-content-between align-items-center"
                              >
                                <div>
                                    <h5 className="mb-1">{record.fields.patente || 'Patente Desconocida'}</h5>
                                    <small className="text-muted">Titular: {record.fields.titular || record.fields.contribuyente || 'Desconocido'}</small>
                                </div>
                                <div className="btn btn-outline-primary btn-sm">Seleccionar</div>
                              </ListGroup.Item>
                          ))}
                      </ListGroup>
                      <div className="text-center">
                          <Button variant="outline-secondary" onClick={() => { setMultipleResults(null); setCurrentStep(1); }}>&larr; Volver a buscar</Button>
                      </div>
                    </>
                );
            case 2: // Debt Selection
                if (!result) return null;
                return (
                    <>
                      <div className="d-flex justify-content-between align-items-start mb-4">
                        <div>
                          <h3 className="fw-bold mb-1">Deudas Encontradas</h3>
                          <p className="mb-0 text-muted">Contribuyente: <span className="fw-semibold text-dark">{result.taxpayerName}</span></p>
                          <p className="text-muted">Referencia: <span className="fw-semibold text-dark">{result.referenceNumber}</span></p>
                        </div>
                        <Button variant="outline-secondary" size="sm" onClick={() => { setCurrentStep(1); setResult(null); setError(null); }}>&larr; Volver a buscar</Button>
                      </div>
                      <Table striped bordered hover responsive>
                        <thead>
                          <tr>
                            <th><Form.Check type="checkbox" checked={selectedDebts.length === result.debts.length && result.debts.length > 0} onChange={toggleAllDebts} disabled={system?.toUpperCase().replace('-', '_') === PaymentSystem.OTRAS} /></th>
                            <th>Período</th>
                            <th>Concepto</th>
                            <th className="text-end">Monto</th>
                          </tr>
                        </thead>
                        <tbody>
                          {result.debts.map((debt) => (
                            <tr key={debt.id}>
                              <td><Form.Check type="checkbox" checked={selectedDebts.includes(debt.id)} onChange={() => toggleDebt(debt.id)} disabled={system?.toUpperCase().replace('-', '_') === PaymentSystem.OTRAS} /></td>
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
                        <Button size="lg" variant="primary" onClick={() => setCurrentStep(3)} disabled={selectedDebts.length === 0}>Continuar al Pago</Button>
                      </div>
                    </>
                );
            case 3: // Confirmation
                return (
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
                );
            default: return null;
        }
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
