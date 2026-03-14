import { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import ImportadorModal from './components/ImportadorModal';
import TablaVentas from './components/TablaVentas';
import ModuloMaestro from './components/ModuloMaestro';
import Login from './components/Login';
import RegistroUsuarios from './components/RegistroUsuarios';
import { supabase } from './lib/supabaseClient';

function App() {
  const [session, setSession] = useState(null);
  const [perfil, setPerfil] = useState(null);
  const [vistaActual, setVistaActual] = useState('Ventas Total');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [ventas, setVentas] = useState([]);
  const [cargando, setCargando] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) obtenerPerfil(session.user.id);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) obtenerPerfil(session.user.id);
      else {
        setPerfil(null);
        setVentas([]);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const obtenerPerfil = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('perfiles')
        .select('*')
        .eq('id', userId)
        .single();
      
      if (error) throw error;
      setPerfil(data);
      console.log("Perfil cargado correctamente:", data);
    } catch (error) {
      console.error("Error obteniendo perfil:", error.message);
    }
  };

  useEffect(() => {
    // Solo intentamos traer ventas si el perfil ya cargó su DNI y ROL
    if (session && perfil && vistaActual === 'Ventas Total') {
      fetchVentas();
    }
  }, [vistaActual, session, perfil]);

  const fetchVentas = async () => {
    if (!perfil) return;
    setCargando(true);
    try {
      let query = supabase.from('gestion_ventas').select(`
        *,
        maestro_asesoras(nombre, dni_ruc),
        maestro_tecnicos(nombre),
        maestro_grupos(nombre_grupo, dni_ruc),
        maestro_observaciones_gen(descripcion_og)
      `);

      // FILTRADO POR DNI SEGÚN ROL
      if (perfil.rol === 'ASESORES') {
        const { data: asesora } = await supabase
          .from('maestro_asesoras')
          .select('id_asesora')
          .eq('dni_ruc', perfil.dni_ruc)
          .single();
          
        if (asesora) {
          query = query.eq('id_asesora', asesora.id_asesora);
        } else {
          setVentas([]);
          setCargando(false);
          return;
        }
      } 
      else if (perfil.rol === 'GRUPO_TECNICO') {
        const { data: grupo } = await supabase
          .from('maestro_grupos')
          .select('id_grupo')
          .eq('dni_ruc', perfil.dni_ruc)
          .single();
          
        if (grupo) {
          query = query.eq('id_grupo', grupo.id_grupo);
        } else {
          setVentas([]);
          setCargando(false);
          return;
        }
      }

      const { data, error } = await query.order('created_at', { ascending: false });
      if (error) throw error;
      setVentas(data || []);
    } catch (err) {
      console.error("Error en fetchVentas:", err.message);
    } finally {
      setCargando(false);
    }
  };

  if (!session) return <Login />;

  const esStaff = perfil?.rol === 'SISTEMAS' || perfil?.rol === 'ADMINISTRADOR';

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#f8fafc', width: '100%', overflowX: 'hidden' }}>
      <Sidebar vistaActual={vistaActual} setVistaActual={setVistaActual} userRole={perfil?.rol} />

      <main style={{ flex: 1, padding: '30px', display: 'flex', flexDirection: 'column', width: 'calc(100% - 280px)', overflowY: 'auto' }}>
        {vistaActual === 'Ventas Total' && (
          <div style={{ width: '100%' }}>
            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
              <div>
                <h1 style={{ fontSize: '1.8rem', color: '#1e293b', margin: 0, fontWeight: '800' }}>VENTAS TOTAL</h1>
                <p style={{ color: '#64748b', fontSize: '0.9rem' }}>
                  Usuario: {perfil?.dni_ruc || "Cargando..."} | Rol: <strong>{perfil?.rol || '...'}</strong>
                </p>
              </div>
              {esStaff && (
                <button onClick={() => setIsModalOpen(true)} style={btnImportarStyle}>
                  IMPORTAR PORTAL
                </button>
              )}
            </header>
            <TablaVentas datos={ventas} cargando={cargando} onRefresh={fetchVentas}/>
          </div>
        )}

        {/* PROTECCIÓN DE RUTAS EN EL RENDER */}
        {vistaActual === 'Usuarios' && perfil?.rol === 'SISTEMAS' && <RegistroUsuarios />}
        
        {esStaff && (
          <div style={{ width: '100%' }}>
            {vistaActual === 'Asesoras' && <ModuloMaestro tabla="maestro_asesoras" titulo="GESTIÓN DE ASESORAS" />}
            {vistaActual === 'Técnicos' && <ModuloMaestro tabla="maestro_tecnicos" titulo="GESTIÓN DE TÉCNICOS" />}
            {vistaActual === 'Grupos' && <ModuloMaestro tabla="maestro_grupos" titulo="GESTIÓN DE GRUPOS" />}
            {vistaActual === 'Observaciones' && <ModuloMaestro tabla="maestro_observaciones_gen" titulo="GESTIÓN DE OBSERVACIONES" />}
          </div>
        )}

        <ImportadorModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onRefresh={fetchVentas} />
      </main>
    </div>
  );
}

const btnImportarStyle = { 
  background: '#1e293b', 
  color: 'white', 
  border: 'none', 
  padding: '12px 24px', 
  borderRadius: '15px', 
  fontWeight: 'bold', 
  cursor: 'pointer', 
  boxShadow: '0 10px 15px -3px rgba(30, 41, 59, 0.3)' 
};

export default App;