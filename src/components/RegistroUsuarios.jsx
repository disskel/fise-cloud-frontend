import React, { useState } from 'react';
import { createClient } from '@supabase/supabase-js'; // Importación necesaria para el cliente temporal
import { supabase as supabaseOriginal } from '../lib/supabaseClient';
import { UserPlus, Mail, Lock, Shield, CreditCard, Loader2, User } from 'lucide-react';

const RegistroUsuarios = () => {
  const [formData, setFormData] = useState({ 
    nombre: '',
    email: '', 
    password: '', 
    dni_ruc: '', 
    rol: 'ASESORES'
  });
  const [loading, setLoading] = useState(false);
  const [mensaje, setMensaje] = useState({ tipo: '', texto: '' });

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMensaje({ tipo: '', texto: '' });

    try {
      // ARQUITECTURA: Creamos un cliente temporal que NO guarde sesión.
      // Esto evita que el registro de un tercero cierre tu sesión de SISTEMAS.
      const supabaseAdmin = createClient(
        import.meta.env.VITE_SUPABASE_URL,
        import.meta.env.VITE_SUPABASE_ANON_KEY,
        { auth: { persistSession: false } }
      );

      // 1. Registro en Supabase Auth usando el cliente temporal
      const { data, error: authError } = await supabaseAdmin.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: { 
          data: { 
            full_name: formData.nombre 
          } 
        }
      });

      if (authError) throw authError;

      if (data.user) {
        // PEQUEÑA PAUSA: Damos 1 segundo para que el Trigger de Supabase cree la fila en perfiles
        await new Promise(resolve => setTimeout(resolve, 1000));

        // 2. Actualizamos el perfil usando tu cliente ORIGINAL (que sigue logueado como SISTEMAS)
        const { error: profileError } = await supabaseOriginal
          .from('perfiles')
          .update({ 
            nombre_completo: formData.nombre,
            dni_ruc: formData.dni_ruc, 
            rol: formData.rol,
            correo_real: formData.email 
          })
          .eq('id', data.user.id);

        if (profileError) throw profileError;

        setMensaje({ tipo: 'success', texto: `Usuario ${formData.dni_ruc} registrado con éxito sin cerrar tu sesión.` });
        setFormData({ nombre: '', email: '', password: '', dni_ruc: '', rol: 'ASESORES' });
      }
    } catch (err) {
      console.error("Error en registro:", err);
      setMensaje({ tipo: 'error', texto: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={containerStyle}>
      <div style={titleStyle}>
        <UserPlus size={28} color="#22c55e" />
        <h2 style={{ margin: 0, fontSize: '1.5rem' }}>Registro de Personal</h2>
      </div>

      {mensaje.texto && (
        <div style={{
          padding: '12px',
          borderRadius: '10px',
          marginBottom: '20px',
          backgroundColor: mensaje.tipo === 'success' ? '#dcfce7' : '#fee2e2',
          color: mensaje.tipo === 'success' ? '#166534' : '#991b1b',
          fontSize: '0.85rem',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <Shield size={16} />
          {mensaje.texto}
        </div>
      )}

      <form onSubmit={handleCreateUser} style={formStyle} noValidate>
        <div style={inputGroupStyle}>
          <label style={labelStyle}><User size={14} /> Nombre Completo</label>
          <input 
            type="text" 
            placeholder="Ej. Maribel Lopez" 
            style={inputStyle} 
            value={formData.nombre}
            onChange={e => setFormData({...formData, nombre: e.target.value})} 
            required 
          />
        </div>

        <div style={inputGroupStyle}>
          <label style={labelStyle}><CreditCard size={14} /> DNI / RUC (Identificador de acceso)</label>
          <input 
            type="text" 
            name="dni_identificador"
            placeholder="Número de documento" 
            style={inputStyle} 
            value={formData.dni_ruc}
            onChange={e => setFormData({...formData, dni_ruc: e.target.value.replace(/\D/g, "")})} 
            required 
          />
        </div>

        <div style={inputGroupStyle}>
          <label style={labelStyle}><Mail size={14} /> Correo Electrónico Real</label>
          <input 
            type="email" 
            placeholder="maribel@gmail.com" 
            style={inputStyle} 
            value={formData.email}
            onChange={e => setFormData({...formData, email: e.target.value})} 
            required 
          />
        </div>

        <div style={inputGroupStyle}>
          <label style={labelStyle}><Lock size={14} /> Contraseña Provisional</label>
          <input 
            type="password" 
            placeholder="••••••••" 
            style={inputStyle} 
            value={formData.password}
            onChange={e => setFormData({...formData, password: e.target.value})} 
            required 
          />
        </div>

        <div style={inputGroupStyle}>
          <label style={labelStyle}><Shield size={14} /> Rol en el Sistema</label>
          <select 
            style={inputStyle} 
            value={formData.rol} 
            onChange={e => setFormData({...formData, rol: e.target.value})}
          >
            <option value="ASESORES">Asesor</option>
            <option value="GRUPO_TECNICO">Grupo Técnico</option>
            <option value="ADMINISTRADOR">Administrador</option>
            <option value="SISTEMAS">Sistemas</option>
          </select>
        </div>

        <button type="submit" disabled={loading} style={btnStyle}>
          {loading ? <Loader2 className="animate-spin" size={20} /> : "REGISTRAR USUARIO"}
        </button>
      </form>
    </div>
  );
};

const containerStyle = { background: 'white', padding: '30px', borderRadius: '20px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', maxWidth: '500px', margin: '20px auto' };
const titleStyle = { display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '25px', color: '#1e293b' };
const formStyle = { display: 'flex', flexDirection: 'column', gap: '18px' };
const inputGroupStyle = { display: 'flex', flexDirection: 'column', gap: '6px' };
const labelStyle = { fontSize: '0.75rem', fontWeight: 'bold', color: '#475569', display: 'flex', alignItems: 'center', gap: '5px' };
const inputStyle = { padding: '12px', borderRadius: '10px', border: '1px solid #e2e8f0', outline: 'none', fontSize: '0.9rem', background: '#f8fafc' };
const btnStyle = { padding: '14px', background: '#22c55e', color: 'white', border: 'none', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', justifyContent: 'center', marginTop: '10px' };

export default RegistroUsuarios;