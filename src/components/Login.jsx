import React, { useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { LogIn, Lock, Mail, AlertCircle, Loader2 } from 'lucide-react';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

const handleLogin = async (e) => {
  e.preventDefault();
  setLoading(true);
  setError(null);

  try {
    let emailParaLogin = email; // El usuario pudo escribir su correo real

    // Si el usuario escribió un DNI (solo números), buscamos su correo real
    // Reemplaza esta parte en tu handleLogin de Login.jsx

    // Si el usuario escribió un DNI (solo números), buscamos su correo real
    // Si el usuario escribió un DNI (solo números), buscamos su correo real
    if (/^\d+$/.test(email.trim())) {
      const { data: perfil, error: errorPerfil } = await supabase
        .from('perfiles')
        .select('correo_real')
        .eq('dni_ruc', email.trim())
        .maybeSingle();

      if (errorPerfil) {
        console.error("Error de RLS en perfiles:", errorPerfil.message);
        throw new Error("Error de comunicación con la base de datos.");
      }

      if (!perfil || !perfil.correo_real) {
        console.warn("No se encontró correo para el DNI:", email);
        throw new Error("El DNI no tiene un correo asociado o no existe.");
      }

      emailParaLogin = perfil.correo_real;
      console.log("Mapeo exitoso. Intentando login con:", emailParaLogin);
    }

    // Ahora nos logueamos con el correo real encontrado y la contraseña
    const { error: authError } = await supabase.auth.signInWithPassword({
      email: emailParaLogin,
      password: password,
    });

    if (authError) throw authError;

  } catch (err) {
    setError(err.message);
    setLoading(false);
  }
};

  return (
    <div style={containerStyle}>
      <div style={cardStyle}>
        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
          <h1 style={titleStyle}>FISE Cloud</h1>
          <p style={subtitleStyle}>Inicia sesión para gestionar tus ventas</p>
        </div>

        <form onSubmit={handleLogin} noValidate style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={inputGroupStyle}>
            <label style={labelStyle}><Mail size={14} /> Usuario (DNI o Correo)</label>
            <input 
              type="text" 
              name="username_login" // Evita que el navegador sugiera correos
              placeholder="Ingrese su DNI o Correo"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={inputStyle}
              required
            />
          </div>

          <div style={inputGroupStyle}>
            <label style={labelStyle}><Lock size={14} /> Contraseña</label>
            <input 
              type="password" 
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={inputStyle}
              required
            />
          </div>

          {error && (
            <div style={errorStyle}>
              <AlertCircle size={16} /> {error}
            </div>
          )}

          <button type="submit" disabled={loading} style={btnStyle}>
            {loading ? <Loader2 size={20} className="animate-spin" /> : <><LogIn size={20} /> INGRESAR</>}
          </button>
        </form>

        <div style={{ marginTop: '25px', textAlign: 'center' }}>
           <p style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
             Si olvidaste tu acceso, contacta con el administrador.
           </p>
        </div>
      </div>
    </div>
  );
};

// ESTILOS DE LOGIN
const containerStyle = { height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', background: '#0f172a' };
const cardStyle = { background: 'white', padding: '50px', borderRadius: '35px', width: '400px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)' };
const titleStyle = { fontSize: '2.2rem', fontWeight: '900', color: '#1e293b', margin: '0 0 5px 0' };
const subtitleStyle = { color: '#64748b', fontSize: '0.9rem' };
const inputGroupStyle = { display: 'flex', flexDirection: 'column', gap: '8px' };
const labelStyle = { fontSize: '0.75rem', fontWeight: 'bold', color: '#475569', display: 'flex', alignItems: 'center', gap: '5px' };
const inputStyle = { padding: '15px', borderRadius: '15px', border: '1px solid #e2e8f0', outline: 'none', background: '#f8fafc', fontSize: '1rem' };
const btnStyle = { padding: '16px', background: '#22c55e', color: 'white', border: 'none', borderRadius: '18px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', boxShadow: '0 10px 15px -3px rgba(34, 197, 94, 0.4)', transition: 'all 0.2s' };
const errorStyle = { background: '#fef2f2', color: '#ef4444', padding: '12px', borderRadius: '12px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '10px', border: '1px solid #fee2e2' };

export default Login;