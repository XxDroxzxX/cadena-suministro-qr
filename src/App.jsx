import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Products from './pages/Products';
import Categories from './pages/Categories';
import Stands from './pages/Stands';
import ScanStation from './pages/ScanStation';
import StockMovements from './pages/StockMovements';
import UsersPage from './pages/Users';
import Customers from './pages/Customers';
import SalesReport from './pages/SalesReport';
import Orders from './pages/Orders';
import Suppliers from './pages/Suppliers';
import Surveys from './pages/Surveys';
import PublicSurvey from './pages/PublicSurvey';

function RoleRoute({ children, roles }) {
  const { user } = useAuth();
  if (!user || !roles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }
  return children;
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<Layout />}>
            <Route index element={<Dashboard />} />
            <Route path="products" element={<Products />} />
            <Route path="categories" element={
              <RoleRoute roles={['admin']}><Categories /></RoleRoute>
            } />
            <Route path="stands" element={
              <RoleRoute roles={['admin']}><Stands /></RoleRoute>
            } />
            <Route path="scan" element={
              <RoleRoute roles={['admin', 'bodeguero']}><ScanStation /></RoleRoute>
            } />
            <Route path="movements" element={<StockMovements />} />
            <Route path="users" element={
              <RoleRoute roles={['admin']}><UsersPage /></RoleRoute>
            } />
            <Route path="customers" element={
              <RoleRoute roles={['admin', 'vendedor']}><Customers /></RoleRoute>
            } />
            <Route path="sales-report" element={
              <RoleRoute roles={['admin', 'vendedor']}><SalesReport /></RoleRoute>
            } />
            <Route path="orders" element={
              <RoleRoute roles={['admin', 'vendedor', 'bodeguero']}><Orders /></RoleRoute>
            } />
            <Route path="suppliers" element={
              <RoleRoute roles={['admin', 'bodeguero']}><Suppliers /></RoleRoute>
            } />
            <Route path="surveys" element={
              <RoleRoute roles={['admin', 'vendedor']}><Surveys /></RoleRoute>
            } />
          </Route>
          <Route path="/encuesta/:token" element={<PublicSurvey />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
