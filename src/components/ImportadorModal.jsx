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
        const estadoPortal = fila["Estado de Solicitud"];

        if (!mapaActuales.has(id)) {
          nuevos.push(id);
        } else if (mapaActuales.get(id) !== estadoPortal) {
          actualizados.push(id);
        } else {
          sinCambios.push(id);
        }
      });

      setResumen({ nuevos, actualizados, sinCambios, errores: [] });
      setFiltroAuditoria('nuevos'); // Iniciar auditoría con los nuevos detectados
    } catch (err) {
      alert("Error al procesar el Excel. Verifique el formato.");
    } finally {
      setCargando(false);
    }
  };

  const copiarAlPortapapeles = () => {
    const listaACopiar = resumen[filtroAuditoria];
    if (!listaACopiar || listaACopiar.length === 0) return;

    const texto = listaACopiar.join(', ');
    navigator.clipboard.writeText(texto)
      .then(() => alert(`¡Copiado! ${listaACopiar.length} solicitudes al portapapeles.`))
      .catch(err => console.error('Error al copiar:', err));
  };

  const ejecutarCarga = async () => {
    if (resumen.nuevos.length === 0 && resumen.actualizados.length === 0) {
      alert("No hay cambios pendientes para cargar.");
      return;
    }

    setProcesandoFinal(true);

    const registrosFinales = datosParaCargar
      .filter(f => resumen.nuevos.includes(String(f["Número de Solicitud"])) || resumen.actualizados.includes(String(f["Número de Solicitud"])))
      .map(f => {
        // Función de normalización para evitar errores "out of range" en Postgres
        const formatearParaPostgres = (fechaStr) => {
          if (!fechaStr || fechaStr === "" || fechaStr === "null") return null;
          if (fechaStr.includes('-')) return fechaStr;
          if (fechaStr.includes('/')) {
            const partes = fechaStr.split('/');
            if (partes.length === 3) {
              const [dia, mes, anio] = partes;
              return `${anio}-${mes.padStart(2, '0')}-${dia.padStart(2, '0')}`;
            }
          }
          return null;
        };

        return {
          num_solicitud: String(f["Número de Solicitud"]),
          dni_solicitante: f["Número de documento de identificación del solicitante"] ? String(f["Número de documento de identificación del solicitante"]).substring(0, 20) : null,
          cod_predio: f["Código de identificación interna del predio"] ? String(f["Código de identificación interna del predio"]).substring(0, 50) : null,
          nombre_solicitante: f["Nombre del solicitante"] ? String(f["Nombre del solicitante"]).substring(0, 200) : null,
          direccion: f["Dirección"] || null,
          distrito: f["Distrito"] || null,
          provincia: f["Provincia"] || null,
          celular: f["Celular"] ? String(f["Celular"]).substring(0, 20) : null,
          num_contrato: f["Número de Contrato de Suministro"] ? String(f["Número de Contrato de Suministro"]).substring(0, 50) : null,
          estado_portal: f["Estado de Solicitud"] || null,
          anulada: String(f["Anulada"]).toLowerCase() === 'true' || f["Anulada"] === "SÍ",
          nombre_malla: f["Nombre de Malla"] || null,
          ubicacion_gps: f["Ubicación"] || null,
          tipo_instalacion: f["Tipo de instalación"] || null,
          puntos_proyectados: parseInt(f["Número de puntos de instalación proyectados"]) || 0,
          fecha_registro_portal: formatearParaPostgres(f["Fecha de registro de la Solicitud en el Portal"]),
          fecha_aprobacion_contrato: formatearParaPostgres(f["Fecha de aprobación del contrato"]),
          fecha_fin_interna: formatearParaPostgres(f["Fecha de finalización de la Instalación Interna"])
        };
      });

    try {
      const { error } = await supabase
        .from('gestion_ventas')
        .upsert(registrosFinales, { onConflict: 'num_solicitud' });

      if (error) {
        console.error("Error detallado:", error);
        alert(`Error de Supabase: ${error.message}`);
        throw error;
      }

      alert("¡Carga completada con éxito!");
      onRefresh();
      onClose();
    } catch (err) {
      console.error("Error en la transacción:", err);
    } finally {
      setProcesandoFinal(false);
    }
  };

  if (!isOpen) return null;

  const TarjetaResumen = ({ titulo, cantidad, color, icono: Icono, tipo }) => (
    <div 
      onClick={() => setFiltroAuditoria(tipo)}
      style={{ 
        background: filtroAuditoria === tipo ? `${color}15` : '#f8fafc',
        border: `2px solid ${filtroAuditoria === tipo ? color : 'transparent'}`,
        padding: '15px', borderRadius: '15px', cursor: 'pointer', transition: 'all 0.2s',
        display: 'flex', flexDirection: 'column', gap: '5px', boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#64748b', fontSize: '0.7rem', fontWeight: 'bold', textTransform: 'uppercase' }}>
        <Icono size={14} color={color} /> {titulo}
      </div>
      <div style={{ fontSize: '1.6rem', fontWeight: '800', color: color }}>{cantidad}</div>
    </div>
  );

  return (
    <div style={modalOverlayStyle}>
      <div style={modalContentStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '25px', alignItems: 'center' }}>
          <h2 style={{ margin: 0, fontSize: '1.3rem', color: '#1e293b', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Resumen de Importación</h2>
          <button onClick={onClose} style={{ border: 'none', background: '#f1f5f9', padding: '5px', borderRadius: '50%', cursor: 'pointer' }}><X size={20} color="#64748b" /></button>
        </div>
        
        <div style={dropzoneStyle}>
          <input type="file" accept=".xlsx, .xls" onChange={manejarArchivo} disabled={cargando || procesandoFinal} />
        </div>

        {cargando && <div style={loaderStyle}><Loader2 className="animate-spin" /> Analizando Excel...</div>}

        {!cargando && datosParaCargar.length > 0 && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginTop: '20px' }}>
              <TarjetaResumen titulo="Total Procesados" cantidad={datosParaCargar.length} color="#3b82f6" icono={Info} tipo="total" />
              <TarjetaResumen titulo="Registros Nuevos" cantidad={resumen.nuevos.length} color="#22c55e" icono={CheckCircle} tipo="nuevos" />
              <TarjetaResumen titulo="Actualizados" cantidad={resumen.actualizados.length} color="#eab308" icono={AlertCircle} tipo="actualizados" />
              <TarjetaResumen titulo="Errores" cantidad={resumen.errores.length} color="#ef4444" icono={XCircle} tipo="errores" />
            </div>

            <div style={auditoriaContainerStyle}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <span style={{ fontSize: '0.7rem', fontWeight: 'bold', color: '#94a3b8', textTransform: 'uppercase' }}>Auditoría: Solicitudes {filtroAuditoria}</span>
                <button onClick={copiarAlPortapapeles} style={btnCopiarStyle}><Copy size={12} /> Copiar Todo</button>
              </div>
              <div style={listaAuditoriaStyle}>
                {resumen[filtroAuditoria]?.length > 0 ? (
                  resumen[filtroAuditoria].map(id => <div key={id} style={itemAuditoriaStyle}>{id}</div>)
                ) : (
                  <div style={{ color: '#475569', fontSize: '0.8rem', padding: '10px' }}>No hay registros en esta categoría</div>
                )}
              </div>
            </div>
          </>
        )}

        <button 
          onClick={ejecutarCarga} 
          disabled={procesandoFinal || (resumen.nuevos.length === 0 && resumen.actualizados.length === 0)}
          style={{ ...btnConfirmarStyle, opacity: (procesandoFinal || (resumen.nuevos.length === 0 && resumen.actualizados.length === 0)) ? 0.5 : 1 }}
        >
          {procesandoFinal ? 'Procesando en la nube...' : 'ENTENDIDO, CONTINUAR'}
        </button>
      </div>
    </div>
  );
};

const modalOverlayStyle = { position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, backdropFilter: 'blur(10px)' };
const modalContentStyle = { background: 'white', padding: '40px', borderRadius: '35px', width: '480px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.4)' };
const dropzoneStyle = { border: '2px dashed #e2e8f0', padding: '15px', borderRadius: '15px', textAlign: 'center', background: '#f8fafc' };
const loaderStyle = { padding: '20px', textAlign: 'center', color: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', fontSize: '0.9rem' };
const auditoriaContainerStyle = { marginTop: '25px', background: '#0f172a', padding: '20px', borderRadius: '25px' };
const listaAuditoriaStyle = { display: 'flex', flexWrap: 'wrap', gap: '8px', maxHeight: '110px', overflowY: 'auto', paddingRight: '5px' };
const itemAuditoriaStyle = { background: 'rgba(255,255,255,0.05)', color: '#cbd5e1', padding: '6px 12px', borderRadius: '8px', fontSize: '0.8rem', border: '1px solid rgba(255,255,255,0.1)' };
const btnCopiarStyle = { border: 'none', background: 'rgba(255,255,255,0.1)', color: 'white', padding: '6px 12px', borderRadius: '8px', fontSize: '0.65rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' };
const btnConfirmarStyle = { width: '100%', marginTop: '30px', padding: '16px', borderRadius: '20px', background: '#0f172a', color: 'white', border: 'none', fontWeight: 'bold', cursor: 'pointer', letterSpacing: '1px' };

export default ImportadorModal;