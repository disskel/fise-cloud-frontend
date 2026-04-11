import React, { useState } from 'react';
import { procesarExcelPortal } from '../utils/excelProcessor';
import { supabase } from '../lib/supabaseClient';
import { CheckCircle, AlertCircle, Info, XCircle, Loader2, Copy, X } from 'lucide-react';

const ImportadorModal = ({ isOpen, onClose, onRefresh }) => {
  const [resumen, setResumen] = useState({ nuevos: [], actualizados: [], sinCambios: [], errores: [] });
  const [datosParaCargar, setDatosParaCargar] = useState([]);
  const [filtroAuditoria, setFiltroAuditoria] = useState('nuevos'); // Controla la lista de la zona oscura
  const [expandido, setExpandido] = useState(null);
  const [cargando, setCargando] = useState(false);
  const [procesandoFinal, setProcesandoFinal] = useState(false);

  const manejarArchivo = async (e) => {
    const archivo = e.target.files[0];
    if (!archivo) return;

    setCargando(true);
    try {
      const datosExcel = await procesarExcelPortal(archivo);
      setDatosParaCargar(datosExcel);
      
      const { data: actuales } = await supabase.from('gestion_ventas').select('num_solicitud, estado_portal');
      const mapaActuales = new Map(actuales?.map(item => [String(item.num_solicitud), item.estado_portal]));

      const nuevos = [];
      const actualizados = [];
      const sinCambios = [];

      datosExcel.forEach(fila => {
        const id = String(fila["Número de Solicitud"]);
        const estadoNuevo = fila["Estado de Solicitud"];
        
        if (!mapaActuales.has(id)) {
          nuevos.push(fila);
        } else if (mapaActuales.get(id) !== estadoNuevo) {
          actualizados.push(fila);
        } else {
          sinCambios.push(fila);
        }
      });

      setResumen({ nuevos, actualizados, sinCambios, errores: [] });
    } catch (err) {
      console.error(err);
      setResumen(prev => ({ ...prev, errores: ["Error al procesar el archivo. Verifique el formato."] }));
    } finally {
      setCargando(false);
    }
  };

  const ejecutarCarga = async () => {
    setProcesandoFinal(true);
    
    // Función de formateo robusta para evitar el error "includes is not a function"
    const formatearParaPostgres = (val) => {
      if (!val || val === "" || val === "null") return null;
      
      // Forzamos conversión a String y limpiamos espacios
      const fechaStr = String(val).trim();

      // Si ya tiene el formato correcto de Postgres (YYYY-MM-DD)
      if (fechaStr.includes('-')) return fechaStr;

      // Si viene con formato Excel (DD/MM/YYYY)
      if (fechaStr.includes('/')) {
        const partes = fechaStr.split('/');
        if (partes.length === 3) {
          const [dia, mes, anio] = partes;
          // Limpiamos el año por si viene con la hora (ej: "2024 12:00:00 AM")
          const anioLimpio = anio.split(' ')[0];
          return `${anioLimpio}-${mes.padStart(2, '0')}-${dia.padStart(2, '0')}`;
        }
      }
      return null;
    };

    try {
      const registrosFinales = [...resumen.nuevos, ...resumen.actualizados].map(f => ({
        num_solicitud: String(f["Número de Solicitud"]),
        dni_solicitante: String(f["Número de documento de identificación del solicitante"]),
        cod_predio: String(f["Código de identificación interna del predio"]),
        nombre_solicitante: f["Nombre del solicitante"],
        direccion: f["Dirección"],
        distrito: f["Distrito"],
        provincia: f["Provincia"],
        celular: String(f["Celular"]),
        num_contrato: f["Número de Contrato de Suministro"] ? String(f["Número de Contrato de Suministro"]) : null,
        estado_portal: f["Estado de Solicitud"],
        anulada: String(f["Anulada"]).toLowerCase() === 'true',
        fecha_registro_portal: formatearParaPostgres(f["Fecha de registro de la Solicitud en el Portal"]),
        fecha_aprobacion_contrato: formatearParaPostgres(f["Fecha de suscripción de contrato"]),
        fecha_fin_interna: formatearParaPostgres(f["Fecha de finalización de la Instalación Interna"]),
        nombre_malla: f["Nombre de Malla"],
        ubicacion_gps: f["Ubicación"],
        tipo_instalacion: f["Tipo de instalación"],
        puntos_proyectados: parseInt(f["Número de puntos de instalación proyectados"]) || 0
      }));

      // Upsert basado en num_solicitud (nuestra llave primaria única)
      const { error } = await supabase
        .from('gestion_ventas')
        .upsert(registrosFinales, { onConflict: 'num_solicitud' });

      if (error) throw error;

      alert(`¡Éxito! Se procesaron ${registrosFinales.length} registros.`);
      onRefresh();
      onClose();
    } catch (err) {
      console.error(err);
      alert("Error crítico al subir a la base de datos.");
    } finally {
      setProcesandoFinal(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div style={overlayStyle}>
      <div style={modalContentStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.5rem', color: '#1e293b' }}>Importador Portal</h2>
            <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b' }}>Sincronización de datos Osinergmin</p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
            <X size={24} />
          </button>
        </div>

        {!datosParaCargar.length ? (
          <div style={dropzoneStyle}>
            <input type="file" accept=".xlsx, .xls" onChange={manejarArchivo} id="fileInput" style={{ display: 'none' }} />
            <label htmlFor="fileInput" style={{ cursor: 'pointer', display: 'block', padding: '40px' }}>
              {cargando ? (
                <div style={loaderStyle}><Loader2 className="animate-spin" /> Analizando Excel...</div>
              ) : (
                <>
                  <Copy size={40} color="#3b82f6" style={{ marginBottom: '15px' }} />
                  <p style={{ fontWeight: 'bold', color: '#1e293b' }}>Selecciona el archivo Excel</p>
                  <p style={{ fontSize: '0.75rem', color: '#64748b' }}>El sistema reconocerá automáticamente los cambios</p>
                </>
              )}
            </label>
          </div>
        ) : (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginBottom: '25px' }}>
              <div onClick={() => setFiltroAuditoria('nuevos')} style={{ ...cardResumenStyle, borderBottom: filtroAuditoria === 'nuevos' ? '4px solid #22c55e' : 'none' }}>
                <span style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#22c55e' }}>{resumen.nuevos.length}</span>
                <span style={{ fontSize: '0.65rem', color: '#64748b' }}>NUEVOS</span>
              </div>
              <div onClick={() => setFiltroAuditoria('actualizados')} style={{ ...cardResumenStyle, borderBottom: filtroAuditoria === 'actualizados' ? '4px solid #3b82f6' : 'none' }}>
                <span style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#3b82f6' }}>{resumen.actualizados.length}</span>
                <span style={{ fontSize: '0.65rem', color: '#64748b' }}>CAMBIOS</span>
              </div>
              <div onClick={() => setFiltroAuditoria('sinCambios')} style={{ ...cardResumenStyle, borderBottom: filtroAuditoria === 'sinCambios' ? '4px solid #94a3b8' : 'none' }}>
                <span style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#94a3b8' }}>{resumen.sinCambios.length}</span>
                <span style={{ fontSize: '0.65rem', color: '#64748b' }}>IGUALES</span>
              </div>
            </div>

            <div style={auditoriaContainerStyle}>
               <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                 <span style={{ color: 'white', fontSize: '0.7rem', fontWeight: 'bold' }}>DETALLE DE SOLICITUDES</span>
                 <span style={{ color: '#64748b', fontSize: '0.7rem' }}>{resumen[filtroAuditoria].length} items</span>
               </div>
               <div style={listaAuditoriaStyle}>
                 {resumen[filtroAuditoria].map((f, i) => (
                   <div key={i} style={itemAuditoriaStyle}>{f["Número de Solicitud"]}</div>
                 ))}
               </div>
            </div>

            <div style={{ marginTop: '30px', display: 'flex', gap: '10px' }}>
              <button onClick={() => { setDatosParaCargar([]); setResumen({ nuevos: [], actualizados: [], sinCambios: [], errores: [] }) }} style={btnSecundarioStyle}>LIMPIAR</button>
              <button 
                onClick={ejecutarCarga} 
                disabled={procesandoFinal || (resumen.nuevos.length === 0 && resumen.actualizados.length === 0)} 
                style={btnPrimarioStyle}
              >
                {procesandoFinal ? <Loader2 className="animate-spin" /> : `PROCESAR ${resumen.nuevos.length + resumen.actualizados.length} CAMBIOS`}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ESTILOS
const overlayStyle = { position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, backdropFilter: 'blur(10px)' };
const modalContentStyle = { background: 'white', padding: '40px', borderRadius: '35px', width: '480px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.4)' };
const dropzoneStyle = { border: '2px dashed #e2e8f0', padding: '15px', borderRadius: '15px', textAlign: 'center', background: '#f8fafc' };
const cardResumenStyle = { background: '#f8fafc', padding: '15px', borderRadius: '15px', textAlign: 'center', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: '2px', transition: 'all 0.2s' };
const btnPrimarioStyle = { flex: 2, padding: '16px', background: '#1e293b', color: 'white', border: 'none', borderRadius: '15px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' };
const btnSecundarioStyle = { flex: 1, padding: '16px', background: '#f1f5f9', color: '#64748b', border: 'none', borderRadius: '15px', fontWeight: 'bold', cursor: 'pointer' };
const loaderStyle = { padding: '20px', textAlign: 'center', color: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', fontSize: '0.9rem' };
const auditoriaContainerStyle = { marginTop: '25px', background: '#0f172a', padding: '20px', borderRadius: '25px' };
const listaAuditoriaStyle = { display: 'flex', flexWrap: 'wrap', gap: '8px', maxHeight: '110px', overflowY: 'auto', paddingRight: '5px' };
const itemAuditoriaStyle = { background: 'rgba(255,255,255,0.05)', color: '#cbd5e1', padding: '6px 12px', borderRadius: '8px', fontSize: '0.8rem', border: '1px solid rgba(255,255,255,0.1)' };

export default ImportadorModal;