
import React from 'react';
import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import Header from './components/Header';
import Footer from './components/Footer';
import Home from './pages/Home';
import PaymentFlow from './pages/PaymentFlow';
import Success from './pages/Success';
import AdminLogin from './pages/AdminLogin';
import AdminPayments from './pages/AdminPayments';
import AdminLogs from './pages/AdminLogs';

const App: React.FC = () => {
  return (
    <Router>
      <div className="min-h-screen flex flex-col bg-slate-50">
        <Header />
        <main className="flex-grow">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/pagar/:system" element={<PaymentFlow />} />
            <Route path="/exito" element={<Success />} />
            <Route path="/admin" element={<AdminLogin />} />
            <Route path="/admin/payments" element={<AdminPayments />} />
            <Route path="/admin/logs" element={<AdminLogs />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </Router>
  );
};

export default App;
