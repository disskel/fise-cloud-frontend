import React from 'react';
import { 
  LayoutDashboard, 
  UserCog, 
  HardHat, 
  Wallet, 
  ClipboardList, 
  LogOut, 
  Users
} from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

const Sidebar = ({ vistaActual, setVistaActual, userRole }) => {
  
  // 1. Menú base para todos
  const menus = [
    { name: 'Ventas Total', icon: <LayoutDashboard size={20} /> },
  ];

  // 2. Visibilidad para STAFF (ADMINISTRADOR y SISTEMAS)
  const esStaff = userRole === 'SISTEMAS' || userRole === 'ADMINISTRADOR';

  if (esStaff) {
    menus.push(
      { name: 'Asesoras', icon: <UserCog size={20} /> },
      { name: 'Técnicos', icon: <HardHat size={20} /> },
      { name: 'Grupos', icon: <Wallet size={20} /> },
      { name: 'Observaciones', icon: <ClipboardList size={20} /> }
    );
  }

  // 3. Menú exclusivo para SISTEMAS
  if (userRole === 'SISTEMAS') {
    menus.push({ name: 'Usuarios', icon: <Users size={20} /> });
  }

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  return (
    <div style={sidebarStyle}>
      <div style={{ padding: '20px', textAlign: 'center', borderBottom: '1px solid #1e293b' }}>
        <h2 style={{ color: 'white', margin: 0, fontSize: '1.2rem', fontWeight: '800' }}>FISE CLOUD</h2>
        <span style={roleBadgeStyle}>{userRole || 'CARGANDO...'}</span>
      </div>

      <nav style={navStyle}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {menus.map((menu) => (
            <button
              key={menu.name}
              onClick={() => setVistaActual(menu.name)}
              style={{
                ...menuItemStyle,
                backgroundColor: vistaActual === menu.name ? '#22c55e' : 'transparent',
                color: vistaActual === menu.name ? 'white' : '#94a3b8',
              }}
            >
              {menu.icon}
              <span style={{ fontWeight: '600' }}>{menu.name}</span>
            </button>
          ))}
        </div>

        <div style={{ marginTop: 'auto', paddingTop: '20px', borderTop: '1px solid #1e293b' }}>
          <button onClick={handleLogout} style={btnLogoutStyle}>
            <LogOut size={20} />
            <span style={{ fontWeight: '600' }}>Cerrar Sesión</span>
          </button>
        </div>
      </nav>
    </div>
  );
};

const sidebarStyle = { width: '280px', backgroundColor: '#0f172a', color: 'white', display: 'flex', flexDirection: 'column', minHeight: '100vh' };
const navStyle = { padding: '20px', display: 'flex', flexDirection: 'column', flex: 1 };
const menuItemStyle = { display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 20px', borderRadius: '12px', border: 'none', cursor: 'pointer', textAlign: 'left', width: '100%' };
const roleBadgeStyle = { fontSize: '0.65rem', backgroundColor: '#1e293b', color: '#22c55e', padding: '2px 8px', borderRadius: '6px', fontWeight: 'bold', marginTop: '5px', display: 'inline-block' };
const btnLogoutStyle = { display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 20px', borderRadius: '12px', border: 'none', cursor: 'pointer', textAlign: 'left', width: '100%', backgroundColor: 'transparent', color: '#ef4444' };

export default Sidebar;