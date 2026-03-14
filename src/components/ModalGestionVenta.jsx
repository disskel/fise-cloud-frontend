import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { X, Save, Info, User, HardHat, ClipboardList, Wallet, Settings, Calendar } from 'lucide-react';
import { formatearFechaVisual } from '../utils/dateUtils';

const ModalGestionVenta = ({ registro, onClose, onRefresh }) => {
  const [cargandoMaestros, setCargandoMaestros] = useState(true);
  const [maestros, setMaestros] = useState({ asesoras: [], tecnicos: [], grupos: [], observaciones: [] });
  
  // Estado local para los campos editables
  const [gestion, setGestion] = useState({
    id_asesora: registro.id_asesora || '',
    id_tecnico: registro.id_tecnico || '',
    id_grupo: registro.id_grupo || '',
    id_obs_gen: registro.id_obs_gen || '',
    va_ventas: registro.va_ventas || 0,
    vc_ventas: registro.vc_ventas || 0,
    observacion_especifica: registro.observacion_especifica || '',
    fecha_asignacion: registro.fecha_asignacion || '' // Dato de Supabase
  });

  useEffect(() => {
    cargarTablasMaestras();
  }, []);

  const cargarTablasMaestras = async () => {
    setCargandoMaestros(true);
    try {
      const [asesoras, tecnicos, grupos, observaciones] = await Promise.all([
        supabase.from('maestro_asesoras').select('id_asesora, nombre').order('nombre'),
        supabase.from('maestro_tecnicos').select('id_tecnico, nombre').order('nombre'),
        supabase.from('maestro_grupos').select('id_grupo, nombre_grupo').order('nombre_grupo'),
        supabase.from('maestro_observaciones_gen').select('id_obs_gen, descripcion_og').order('descripcion_og')
      ]);

      setMaestros({
        asesoras: asesoras.data || [],
        tecnicos: tecnicos.data || [],
        grupos: grupos.data || [],
        observaciones: observaciones.data || []
      });
    } catch (error) {
      console.error("Error cargando maestros:", error);
    } finally {
      setCargandoMaestros(false);
    }
  };

  const handleGuardar = async () => {
    try {
      const { error } = await supabase
        .from('gestion_ventas')
        .update({
          id_asesora: gestion.id_asesora || null,
          id_tecnico: gestion.id_tecnico || null,
          id_grupo: gestion.id_grupo || null,
          id_obs_gen: gestion.id_obs_gen || null,
          va_ventas: parseFloat(gestion.va_ventas) || 0,
          vc_ventas: parseFloat(gestion.vc_ventas) || 0,
          observacion_especifica: gestion.observacion_especifica,
          fecha_asignacion: gestion.fecha_asignacion || null // Guardado efectivo
        })
        .eq('num_solicitud', registro.num_solicitud);

      if (error) throw error;
      alert("¡Gestión actualizada correctamente!");
      onRefresh();
      onClose();
    } catch (err) {
      alert("Error al actualizar: " + err.message);
    }
  };

  if (!registro) return null;

  return (
    <div style={modalOverlayStyle}>
      <div style={modalContentStyle}>
        {/* Cabecera */}
        <div style={headerStyle}>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.4rem', color: '#1e293b' }}>GESTIÓN DE SOLICITUD</h2>
            <span style={badgeSolicitudStyle}>N° {registro.num_solicitud}</span>
          </div>
          <button onClick={onClose} style={btnCloseStyle}><X size={24} /></button>
        </div>

        <div style={mainLayoutStyle}>
          {/* COLUMNA IZQUIERDA: DATOS DEL PORTAL (Solo Lectura) */}
          <div style={columnaPortalStyle}>
            <h3 style={sectionTitleStyle}><ClipboardList size={18} /> Datos del Portal</h3>
            <div style={gridInfoStyle}>
              <InfoItem etiqueta="Cliente" valor={registro.nombre_solicitante} />
              <InfoItem etiqueta="DNI" valor={registro.dni_solicitante} />
              <InfoItem etiqueta="Distrito" valor={registro.distrito} />
              <InfoItem etiqueta="Dirección" valor={registro.direccion} />
              <InfoItem etiqueta="Estado Portal" valor={registro.estado_portal} />
              <InfoItem etiqueta="F. Registro" valor={formatearFechaVisual(registro.fecha_registro_portal)} />
              <InfoItem etiqueta="F. Aprobación" valor={formatearFechaVisual(registro.fecha_aprobacion_contrato)} />
              <InfoItem etiqueta="Malla" valor={registro.nombre_malla} />
              <InfoItem etiqueta="Tipo Inst." valor={registro.tipo_instalacion} />
            </div>
          </div>

          {/* COLUMNA DERECHA: GESTIÓN INTERNA (Editable) */}
          <div style={columnaGestionStyle}>
            <h3 style={sectionTitleStyle}><Settings size={18} /> Gestión de Campo</h3>
            
            <div style={formGroupStyle}>
              <label style={labelStyle}><User size={12} /> Asesora Responsable</label>
              <select style={inputStyle} value={gestion.id_asesora} onChange={(e) => setGestion({...gestion, id_asesora: e.target.value})}>
                <option value="">-- Seleccionar Asesora --</option>
                {maestros.asesoras.map(a => <option key={a.id_asesora} value={a.id_asesora}>{a.nombre}</option>)}
              </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
              <div style={formGroupStyle}>
                <label style={labelStyle}><HardHat size={12} /> Técnico Asignado</label>
                <select style={inputStyle} value={gestion.id_tecnico} onChange={(e) => setGestion({...gestion, id_tecnico: e.target.value})}>
                  <option value="">-- Seleccionar --</option>
                  {maestros.tecnicos.map(t => <option key={t.id_tecnico} value={t.id_tecnico}>{t.nombre}</option>)}
                </select>
              </div>
              <div style={formGroupStyle}>
                <label style={labelStyle}><Wallet size={12} /> Grupo / Contrata</label>
                <select style={inputStyle} value={gestion.id_grupo} onChange={(e) => setGestion({...gestion, id_grupo: e.target.value})}>
                  <option value="">-- Seleccionar --</option>
                  {maestros.grupos.map(g => <option key={g.id_grupo} value={g.id_grupo}>{g.nombre_grupo}</option>)}
                </select>
              </div>
            </div>

            {/* CAMPO DE FECHA DE ASIGNACIÓN (Implementado) */}
            <div style={formGroupStyle}>
              <label style={labelStyle}><Calendar size={12} /> Fecha de Asignación</label>
              <input 
                type="date" 
                style={inputStyle} 
                value={gestion.fecha_asignacion} 
                onChange={(e) => setGestion({...gestion, fecha_asignacion: e.target.value})} 
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
              <div style={formGroupStyle}>
                <label style={labelStyle}>VA Ventas (S/)</label>
                <input type="number" style={inputStyle} value={gestion.va_ventas} onChange={(e) => setGestion({...gestion, va_ventas: e.target.value})} />
              </div>
              <div style={formGroupStyle}>
                <label style={labelStyle}>VC Ventas (S/)</label>
                <input type="number" style={inputStyle} value={gestion.vc_ventas} onChange={(e) => setGestion({...gestion, vc_ventas: e.target.value})} />
              </div>
            </div>

            <div style={formGroupStyle}>
              <label style={labelStyle}>Observación General</label>
              <select style={inputStyle} value={gestion.id_obs_gen} onChange={(e) => setGestion({...gestion, id_obs_gen: e.target.value})}>
                <option value="">-- Sin Observación --</option>
                {maestros.observaciones.map(o => <option key={o.id_obs_gen} value={o.id_obs_gen}>{o.descripcion_og}</option>)}
              </select>
            </div>

            <div style={formGroupStyle}>
              <label style={labelStyle}>Detalle Específico</label>
              <textarea 
                style={{...inputStyle, height: '80px', resize: 'none'}} 
                value={gestion.observacion_especifica} 
                onChange={(e) => setGestion({...gestion, observacion_especifica: e.target.value})}
                placeholder="Escriba detalles adicionales aquí..."
              />
            </div>

            <button onClick={handleGuardar} style={btnGuardarStyle}>
              <Save size={20} /> GUARDAR GESTIÓN
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const InfoItem = ({ etiqueta, valor }) => (
  <div style={{ marginBottom: '10px' }}>
    <label style={{ fontSize: '0.65rem', color: '#94a3b8', fontWeight: 'bold', textTransform: 'uppercase' }}>{etiqueta}</label>
    <div style={{ fontSize: '0.85rem', color: '#1e293b', fontWeight: '500' }}>{valor || '-'}</div>
  </div>
);

// ESTILOS (MANTENIDOS ÍNTEGROS)
const modalOverlayStyle = { position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.7)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 10000, backdropFilter: 'blur(8px)' };
const modalContentStyle = { background: 'white', width: '900px', borderRadius: '30px', overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)' };
const headerStyle = { padding: '25px 40px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' };
const badgeSolicitudStyle = { background: '#1e293b', color: 'white', padding: '4px 12px', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 'bold', marginTop: '5px', display: 'inline-block' };
const btnCloseStyle = { border: 'none', background: 'transparent', cursor: 'pointer', color: '#64748b' };
const mainLayoutStyle = { display: 'grid', gridTemplateColumns: '1fr 1.2fr', minHeight: '500px' };
const columnaPortalStyle = { padding: '40px', background: '#f1f5f9', borderRight: '1px solid #e2e8f0' };
const columnaGestionStyle = { padding: '40px', background: 'white' };
const sectionTitleStyle = { display: 'flex', alignItems: 'center', gap: '10px', fontSize: '1rem', color: '#334155', marginBottom: '25px', borderBottom: '2px solid #e2e8f0', paddingBottom: '10px' };
const gridInfoStyle = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' };
const formGroupStyle = { marginBottom: '20px' };
const labelStyle = { fontSize: '0.75rem', fontWeight: 'bold', color: '#64748b', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '5px' };
const inputStyle = { width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #e2e8f0', background: '#f8fafc', outline: 'none', fontSize: '0.9rem' };
const btnGuardarStyle = { width: '100%', padding: '15px', background: '#22c55e', color: 'white', border: 'none', borderRadius: '15px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', marginTop: '20px', boxShadow: '0 4px 14px rgba(34, 197, 94, 0.4)' };

export default ModalGestionVenta;