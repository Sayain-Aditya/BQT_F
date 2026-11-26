import { useState } from 'react';
import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, FilePlus, Wrench, ChevronLeft, ChevronRight, Menu } from 'lucide-react';
import Dashboard from './pages/Dashboard';
import NewInvoice from './pages/NewInvoice';
import EditInvoice from './pages/EditInvoice';
import InvoiceSplitView from './components/proforma/InvoiceSplitView';
import AdminPage from './pages/AdminPage';

const NAV_ITEMS = [
  { to: '/',         label: 'Dashboard',      Icon: LayoutDashboard },
  { to: '/proforma', label: 'New Quotation',  Icon: FilePlus },
  { to: '/admin',    label: 'Tyre Catalogue', Icon: Wrench },
];

const Sidebar = ({ open, setOpen }) => {
  const { pathname } = useLocation();
  return (
    <aside className={`hidden md:flex flex-col shrink-0 bg-green-900 h-screen sticky top-0 print:hidden transition-all duration-300 ${
      open ? 'w-56' : 'w-14'
    }`}>
      <div className={`flex items-center border-b border-green-800 h-14 ${ open ? 'px-5 justify-between' : 'justify-center' }`}>
        {open && (
          <Link to="/" className="text-lg font-bold text-white tracking-tight leading-tight">
            MKS Alliance
            <span className="block text-green-300 font-normal text-xs mt-0.5">Invoices & Quotations</span>
          </Link>
        )}
        <button onClick={() => setOpen(o => !o)} className="text-green-300 hover:text-white transition-colors p-1 rounded">
          {open ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
        </button>
      </div>
      <nav className="flex flex-col gap-1 p-2 flex-1">
        {NAV_ITEMS.map(({ to, label, Icon }) => (
          <Link key={to} to={to} title={!open ? label : undefined}
            className={`flex items-center gap-3 px-2.5 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              pathname === to ? 'bg-green-700 text-white' : 'text-green-100 hover:bg-green-700/50'
            } ${!open ? 'justify-center' : ''}`}>
            <Icon size={17} className="shrink-0" />
            {open && <span>{label}</span>}
          </Link>
        ))}
      </nav>
    </aside>
  );
};

// Mobile bottom tab bar
const BottomBar = () => {
  const { pathname } = useLocation();
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-green-900 flex border-t border-green-800 print:hidden z-50">
      {NAV_ITEMS.map(({ to, label, Icon }) => (
        <Link key={to} to={to}
          className={`flex-1 flex flex-col items-center py-2 text-[10px] font-semibold transition-colors ${
            pathname === to ? 'text-white' : 'text-green-300'
          }`}>
          <Icon size={20} className="mb-0.5" />
          {label}
        </Link>
      ))}
    </nav>
  );
};

const App = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gray-100 flex">
        <Sidebar open={sidebarOpen} setOpen={setSidebarOpen} />
        <div className="flex-1 flex flex-col min-h-screen">
          <main className="flex-1 pb-16 md:pb-0">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/new" element={<NewInvoice />} />
              <Route path="/edit/:id" element={<EditInvoice />} />
              <Route path="/proforma" element={<InvoiceSplitView />} />
              <Route path="/proforma/:id" element={<InvoiceSplitView />} />
              <Route path="/admin" element={<AdminPage />} />
            </Routes>
          </main>
          <BottomBar />
        </div>
      </div>
    </BrowserRouter>
  );
};

export default App;
