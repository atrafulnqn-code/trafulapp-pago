
import React from 'react';
import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import Header from './components/Header';
import Footer from './components/Footer';
import Home from './pages/Home';
import PaymentFlow from './pages/PaymentFlow';
import Success from './pages/Success';
import AdminLogin from './pages/AdminLogin';
import AdminDashboard from './pages/AdminDashboard';
import AdminPayments from './pages/AdminPayments';
import AdminLogs from './pages/AdminLogs';
import AdminRecaudacion from './pages/AdminRecaudacion';
import AdminPatentes from './pages/AdminPatentes';
import AdminAccessLogs from './pages/AdminAccessLogs';
import StaffLogin from './pages/StaffLogin';
import StaffDashboard from './pages/StaffDashboard';
import RecaudacionForm from './pages/RecaudacionForm';
import PatenteForm from './pages/PatenteForm';
import LinkMPModule from './pages/LinkMPModule';
import PlanPagoForm from './pages/PlanPagoForm';
import PagosEfectivoDashboard from './pages/PagosEfectivoDashboard';
import RecaudacionEfectivo from './pages/RecaudacionEfectivo';
import PatenteEfectivo from './pages/PatenteEfectivo';
import StatsLogin from './pages/StatsLogin';
import StatsDashboard from './pages/StatsDashboard';
import PlanDePago from './pages/PlanDePago';
import { useLocation } from 'react-router-dom';

const AppContent: React.FC = () => {
  const location = useLocation();
  const isAdminPath = location.pathname.startsWith('/admin') || location.pathname.startsWith('/staff');

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Header />
      <main className="flex-grow">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/pagar/:system" element={<PaymentFlow />} />
          <Route path="/plan-de-pago" element={<PlanDePago />} />
          <Route path="/exito" element={<Success />} />
          <Route path="/admin" element={<AdminLogin />} />
          <Route path="/admin/dashboard" element={<AdminDashboard />} />
          <Route path="/admin/payments" element={<AdminPayments />} />
          <Route path="/admin/logs" element={<AdminLogs />} />
          <Route path="/admin/access_logs" element={<AdminAccessLogs />} />
          <Route path="/admin/recaudacion" element={<AdminRecaudacion />} />
          <Route path="/admin/patentes" element={<AdminPatentes />} />
          <Route path="/admin/stats-login" element={<StatsLogin />} />
          <Route path="/admin/stats" element={<StatsDashboard />} />
          <Route path="/staff/login" element={<StaffLogin />} />
          <Route path="/staff/dashboard" element={<StaffDashboard />} />
          <Route path="/staff/recaudacion" element={<RecaudacionForm />} />
          <Route path="/staff/patente" element={<PatenteForm />} />
          <Route path="/staff/link-mp" element={<LinkMPModule />} />
          <Route path="/staff/plan-pago" element={<PlanPagoForm />} />
          <Route path="/staff/pagos-efectivo" element={<PagosEfectivoDashboard />} />
          <Route path="/staff/pagos-efectivo/recaudacion" element={<RecaudacionEfectivo />} />
          <Route path="/staff/pagos-efectivo/patente" element={<PatenteEfectivo />} />
        </Routes>
      </main>
      {!isAdminPath && <Footer />}
    </div>
  );
};

const App: React.FC = () => {
  return (
    <Router>
      <AppContent />
    </Router>
  );
};

export default App;
