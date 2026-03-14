import React, { useState, useMemo, useEffect, useRef } from 'react';
import { formatearFechaVisual, calcularDiasSinInterna } from '../utils/dateUtils';
import { Settings, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Filter, Search, X, Trash2, FileDown, ChevronDown } from 'lucide-react';
import ModalGestionVenta from './ModalGestionVenta';
import * as XLSX from 'xlsx';

const MenuFiltroExcel = ({ columna, datosTotales, filtrosActivos, setFiltrosActivos, etiquetas }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) setIsOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const opcionesDisponibles = useMemo(() => {
    const otrosFiltrosActivos = { ...filtrosActivos };
    delete otrosFiltrosActivos[columna];

    const datosParaEstaColumna = datosTotales.filter(reg => {
      return Object.keys(otrosFiltrosActivos).every(col => {
        const seleccionados = otrosFiltrosActivos[col];
        if (!seleccionados || seleccionados.length === 0) return true;
        
        let valorCelda = '';
        if (col === 'nombre_asesora') valorCelda = reg.maestro_asesoras?.nombre || '';
        else if (col === 'nombre_tecnico') valorCelda = reg.maestro_tecnicos?.nombre || '';
        else if (col === 'nombre_grupo') valorCelda = reg.maestro_grupos?.nombre_grupo || '';
        else if (col === 'obs_general') valorCelda = reg.maestro_observaciones_gen?.descripcion_og || '';
        else valorCelda = String(reg[col] || '');

        return seleccionados.includes(valorCelda);
      });
    });

    const unicos = [...new Set(datosParaEstaColumna.map(item => {
        if (columna === 'nombre_asesora') return item.maestro_asesoras?.nombre || '';
        if (columna === 'nombre_tecnico') return item.maestro_tecnicos?.nombre || '';
        if (columna === 'nombre_grupo') return item.maestro_grupos?.nombre_grupo || '';
        if (columna === 'obs_general') return item.maestro_observaciones_gen?.descripcion_og || '';
        return String(item[columna] || '');
    }))];
    
    return unicos.sort();
  }, [datosTotales, filtrosActivos, columna]);

  const valoresSeleccionados = filtrosActivos[columna] || [];

  const toggleOpcion = (opcion) => {
    const nuevosValores = valoresSeleccionados.includes(opcion)
      ? valoresSeleccionados.filter(v => v !== opcion)
      : [...valoresSeleccionados, opcion];
    setFiltrosActivos({ ...filtrosActivos, [columna]: nuevosValores });
  };

  const seleccionarTodo = () => {
    if (valoresSeleccionados.length === opcionesDisponibles.length) {
      setFiltrosActivos({ ...filtrosActivos, [columna]: [] });
    } else {
      setFiltrosActivos({ ...filtrosActivos, [columna]: opcionesDisponibles });
    }
  };

  const opcionesFiltradasPorBusqueda = opcionesDisponibles.filter(op => 
    op.toLowerCase().includes(busqueda.toLowerCase())
  );

  return (
    <div style={{ position: 'relative' }} ref={menuRef}>
      <Filter 
        size={14} 
        style={{ cursor: 'pointer', color: valoresSeleccionados.length > 0 ? '#22c55e' : '#94a3b8' }} 
        onClick={() => setIsOpen(!isOpen)} 
      />
      
      {isOpen && (
        <div style={dropdownFiltroStyle}>
          <div style={headerFiltroStyle}>
            <Search size={14} color="#94a3b8" />
            <input 
              type="text" 
              placeholder="Buscar..." 
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              style={inputBusquedaStyle}
            />
          </div>
          
          <div style={listaOpcionesStyle}>
            <label style={labelOpcionStyle}>
              <input 
                type="checkbox" 
                checked={valoresSeleccionados.length === opcionesDisponibles.length && opcionesDisponibles.length > 0}
                onChange={seleccionarTodo}
              />
              <span style={{ fontWeight: 'bold' }}>(Seleccionar todo)</span>
            </label>
            {opcionesFiltradasPorBusqueda.map(op => (
              <label key={op} style={labelOpcionStyle}>
                <input 
                  type="checkbox" 
                  checked={valoresSeleccionados.includes(op)}
                  onChange={() => toggleOpcion(op)}
                />
                {op || "(Vacío)"}
              </label>
            ))}
          </div>

          <div style={footerFiltroStyle}>
            <button onClick={() => { setFiltrosActivos({ ...filtrosActivos, [columna]: [] }); setIsOpen(false); }} style={btnLimpiarFiltroMini}>Limpiar</button>
            <button onClick={() => setIsOpen(false)} style={btnAplicarFiltro}>Aceptar</button>
          </div>
        </div>
      )}
    </div>
  );
};

const TablaVentas = ({ datos, cargando, onRefresh }) => {
  const [columnasVisibles, setColumnasVisibles] = useState({
    num_solicitud: true, nombre_solicitante: true, dni_solicitante: true, cod_predio: true,
    direccion: true, distrito: true, provincia: true, celular: true, num_contrato: true,
    estado_portal: true, dias_sin_interna: true, va_ventas: true, vc_ventas: true,
    nombre_malla: true, ubicacion_gps: true, tipo_instalacion: true, puntos_proyectados: true,
    anulada: true, fecha_registro_portal: true, fecha_aprobacion_contrato: true,
    fecha_fin_interna: true, nombre_asesora: true, nombre_grupo: true, nombre_tecnico: true,
    fecha_asignacion: true, obs_general: true, observacion_especifica: true
  });

  const [filtrosActivos, setFiltrosActivos] = useState({});
  const [menuColumnasOpen, setMenuColumnasOpen] = useState(false);
  const [menuExportOpen, setMenuExportOpen] = useState(false);
  const [paginaActual, setPaginaActual] = useState(1);
  const [registrosPorPagina, setRegistrosPorPagina] = useState(10);
  const [registroSeleccionado, setRegistroSeleccionado] = useState(null);
  
  const menuColRef = useRef(null);
  const menuExportRef = useRef(null);

  const etiquetas = {
    num_solicitud: "Solicitud", nombre_solicitante: "Cliente", dni_solicitante: "DNI",
    cod_predio: "Cód. Predio", direccion: "Dirección", distrito: "Distrito",
    provincia: "Provincia", celular: "Celular", num_contrato: "N° Contrato",
    estado_portal: "Estado Portal", dias_sin_interna: "Días s/ Interna",
    va_ventas: "VA Ventas", vc_ventas: "VC Ventas", nombre_malla: "Malla",
    ubicacion_gps: "GPS", tipo_instalacion: "Tipo Inst.", puntos_proyectados: "Puntos",
    anulada: "Anulada", fecha_registro_portal: "F. Registro Portal",
    fecha_aprobacion_contrato: "F. Aprobación", fecha_fin_interna: "F. Fin Interna",
    nombre_asesora: "Asesora", nombre_grupo: "Grupo", nombre_tecnico: "Técnico",
    fecha_asignacion: "F. Asignación", obs_general: "Obs. General", observacion_especifica: "Obs. Específica"
  };

  const hasFiltros = Object.values(filtrosActivos).some(f => f.length > 0);

  const datosFiltrados = useMemo(() => {
    return datos.filter(reg => {
      return Object.keys(filtrosActivos).every(col => {
        const seleccionados = filtrosActivos[col];
        if (!seleccionados || seleccionados.length === 0) return true;
        
        let valorCelda = '';
        if (col === 'nombre_asesora') valorCelda = reg.maestro_asesoras?.nombre || '';
        else if (col === 'nombre_tecnico') valorCelda = reg.maestro_tecnicos?.nombre || '';
        else if (col === 'nombre_grupo') valorCelda = reg.maestro_grupos?.nombre_grupo || '';
        else if (col === 'obs_general') valorCelda = reg.maestro_observaciones_gen?.descripcion_og || '';
        else valorCelda = String(reg[col] || '');

        return seleccionados.includes(valorCelda);
      });
    });
  }, [datos, filtrosActivos]);

  const totalPaginas = Math.ceil(datosFiltrados.length / registrosPorPagina);
  const registrosActuales = datosFiltrados.slice((paginaActual - 1) * registrosPorPagina, paginaActual * registrosPorPagina);

  // FUNCIÓN DE EXPORTACIÓN CON FORMATEO DE FECHA DD/MM/AAAA
  const exportarAExcel = (tipo) => {
    const dataAExportar = tipo === 'pagina' ? registrosActuales : datosFiltrados;
    
    const wsData = dataAExportar.map(reg => {
      const fila = {};
      Object.keys(columnasVisibles).forEach(col => {
        if (columnasVisibles[col]) {
          let valor = reg[col];
          
          // Mapeo de relaciones
          if (col === 'nombre_asesora') valor = reg.maestro_asesoras?.nombre;
          else if (col === 'nombre_tecnico') valor = reg.maestro_tecnicos?.nombre;
          else if (col === 'nombre_grupo') valor = reg.maestro_grupos?.nombre_grupo;
          else if (col === 'obs_general') valor = reg.maestro_observaciones_gen?.descripcion_og;
          
          // Lógica de formateo para columnas de fecha
          const columnasFecha = ['fecha_registro_portal', 'fecha_aprobacion_contrato', 'fecha_fin_interna', 'fecha_asignacion'];
          if (columnasFecha.includes(col) && valor) {
            valor = formatearFechaVisual(valor); // Usa la función de dateUtils que ya devuelve DD/MM/AAAA
          }

          fila[etiquetas[col]] = valor || '';
        }
      });
      return fila;
    });

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(wsData);
    XLSX.utils.book_append_sheet(wb, ws, "Ventas");
    XLSX.writeFile(wb, `Reporte_FISE_${new Date().toLocaleDateString().replace(/\//g, '_')}.xlsx`);
    setMenuExportOpen(false);
  };

  if (cargando) return <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>Cargando registros...</div>;

  return (
    <div style={{ background: 'white', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', display: 'flex', flexDirection: 'column' }}>
      <div style={barraHerramientasStyle}>
        <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
          <select value={registrosPorPagina} onChange={(e) => setRegistrosPorPagina(Number(e.target.value))} style={selectStyle}>
            {[10, 20, 50, 100].map(n => <option key={n} value={n}>Mostrar {n}</option>)}
          </select>
          <span style={{ fontSize: '0.85rem', color: '#64748b' }}>Resultados: {datosFiltrados.length}</span>
          
          {hasFiltros && (
            <button 
              onClick={() => { setFiltrosActivos({}); setPaginaActual(1); }}
              style={btnLimpiarTodoStyle}
            >
              <Trash2 size={16} /> Limpiar filtros activos
            </button>
          )}
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <div style={{ position: 'relative' }} ref={menuExportRef}>
            <button onClick={() => setMenuExportOpen(!menuExportOpen)} style={btnExportarStyle}>
              <FileDown size={16} /> EXPORTAR <ChevronDown size={14} />
            </button>
            {menuExportOpen && (
              <div style={dropdownExportStyle}>
                <button onClick={() => exportarAExcel('pagina')} style={itemExportStyle}>Exportar Hoja Actual</button>
                <button onClick={() => exportarAExcel('todo')} style={itemExportStyle}>Exportar Todo (Filtrado)</button>
              </div>
            )}
          </div>

          <div style={{ position: 'relative' }} ref={menuColRef}>
            <button onClick={() => setMenuColumnasOpen(!menuColumnasOpen)} style={btnColumnasStyle}>
              <Settings size={16} /> Columnas
            </button>
            {menuColumnasOpen && (
              <div style={dropdownColStyle}>
                <label style={labelOpcionStyle}>
                  <input type="checkbox" checked={Object.values(columnasVisibles).every(v => v === true)} onChange={() => {
                    const tod = Object.values(columnasVisibles).every(v => v === true);
                    const n = {}; Object.keys(columnasVisibles).forEach(k => n[k] = !tod);
                    setColumnasVisibles(n);
                  }} />
                  <span style={{ fontWeight: 'bold' }}>(Seleccionar todo)</span>
                </label>
                <hr style={{ margin: '8px 0', border: '0', borderTop: '1px solid #f1f5f9' }} />
                {Object.keys(columnasVisibles).map(col => (
                  <label key={col} style={labelOpcionStyle}>
                    <input type="checkbox" checked={columnasVisibles[col]} onChange={() => setColumnasVisibles(p => ({...p, [col]: !p[col]}))} />
                    {etiquetas[col]}
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div style={contenedorTablaStyle}>
        <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, fontSize: '0.8rem' }}>
          <thead style={{ position: 'sticky', top: 0, zIndex: 10, background: '#f8fafc' }}>
            <tr>
              {Object.keys(columnasVisibles).map(col => columnasVisibles[col] && (
                <th key={col} style={thStyle}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                    {etiquetas[col]}
                    <MenuFiltroExcel 
                      columna={col} 
                      datosTotales={datos}
                      filtrosActivos={filtrosActivos}
                      setFiltrosActivos={setFiltrosActivos}
                    />
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {registrosActuales.map((reg, idx) => (
              <tr 
                key={reg.num_solicitud} 
                onDoubleClick={() => setRegistroSeleccionado(reg)}
                style={{ background: idx % 2 === 0 ? 'white' : '#fcfcfc', cursor: 'pointer' }}
              >
                {columnasVisibles.num_solicitud && <td style={tdStyle}>{reg.num_solicitud}</td>}
                {columnasVisibles.nombre_solicitante && <td style={tdStyle}>{reg.nombre_solicitante}</td>}
                {columnasVisibles.dni_solicitante && <td style={tdStyle}>{reg.dni_solicitante}</td>}
                {columnasVisibles.cod_predio && <td style={tdStyle}>{reg.cod_predio}</td>}
                {columnasVisibles.direccion && <td style={tdStyle}>{reg.direccion}</td>}
                {columnasVisibles.distrito && <td style={tdStyle}>{reg.distrito}</td>}
                {columnasVisibles.provincia && <td style={tdStyle}>{reg.provincia}</td>}
                {columnasVisibles.celular && <td style={tdStyle}>{reg.celular}</td>}
                {columnasVisibles.num_contrato && <td style={tdStyle}>{reg.num_contrato}</td>}
                {columnasVisibles.estado_portal && <td style={tdStyle}>{reg.estado_portal}</td>}
                {columnasVisibles.dias_sin_interna && <td style={tdStyle}>{calcularDiasSinInterna(reg.fecha_aprobacion_contrato, reg.fecha_fin_interna)}</td>}
                {columnasVisibles.va_ventas && <td style={tdStyle}>S/ {reg.va_ventas}</td>}
                {columnasVisibles.vc_ventas && <td style={tdStyle}>S/ {reg.vc_ventas}</td>}
                {columnasVisibles.nombre_malla && <td style={tdStyle}>{reg.nombre_malla}</td>}
                {columnasVisibles.ubicacion_gps && <td style={tdStyle}>{reg.ubicacion_gps}</td>}
                {columnasVisibles.tipo_instalacion && <td style={tdStyle}>{reg.tipo_instalacion}</td>}
                {columnasVisibles.puntos_proyectados && <td style={tdStyle}>{reg.puntos_proyectados}</td>}
                {columnasVisibles.anulada && <td style={tdStyle}>{reg.anulada ? 'SÍ' : 'NO'}</td>}
                {columnasVisibles.fecha_registro_portal && <td style={tdStyle}>{formatearFechaVisual(reg.fecha_registro_portal)}</td>}
                {columnasVisibles.fecha_aprobacion_contrato && <td style={tdStyle}>{formatearFechaVisual(reg.fecha_aprobacion_contrato)}</td>}
                {columnasVisibles.fecha_fin_interna && <td style={tdStyle}>{formatearFechaVisual(reg.fecha_fin_interna)}</td>}
                {columnasVisibles.nombre_asesora && <td style={tdStyle}>{reg.maestro_asesoras?.nombre || '-'}</td>}
                {columnasVisibles.nombre_grupo && <td style={tdStyle}>{reg.maestro_grupos?.nombre_grupo || '-'}</td>}
                {columnasVisibles.nombre_tecnico && <td style={tdStyle}>{reg.maestro_tecnicos?.nombre || '-'}</td>}
                {columnasVisibles.fecha_asignacion && <td style={tdStyle}>{formatearFechaVisual(reg.fecha_asignacion)}</td>}
                {columnasVisibles.obs_general && <td style={tdStyle}>{reg.maestro_observaciones_gen?.descripcion_og || '-'}</td>}
                {columnasVisibles.observacion_especifica && <td style={tdStyle}>{reg.observacion_especifica}</td>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={paginacionContainer}>
        <button disabled={paginaActual === 1} onClick={() => setPaginaActual(1)} style={btnPag}><ChevronsLeft size={16}/></button>
        <button disabled={paginaActual === 1} onClick={() => setPaginaActual(p => p - 1)} style={btnPag}><ChevronLeft size={16}/></button>
        <span style={{ fontSize: '0.9rem' }}>Página <strong>{paginaActual}</strong> de {totalPaginas}</span>
        <button disabled={paginaActual === totalPaginas} onClick={() => setPaginaActual(p => p + 1)} style={btnPag}><ChevronRight size={16}/></button>
        <button disabled={paginaActual === totalPaginas} onClick={() => setPaginaActual(totalPaginas)} style={btnPag}><ChevronsRight size={16}/></button>
      </div>

      {registroSeleccionado && (
        <ModalGestionVenta 
          registro={registroSeleccionado} 
          onClose={() => setRegistroSeleccionado(null)} 
          onRefresh={onRefresh}
        />
      )}
    </div>
  );
};

// ESTILOS
const btnLimpiarTodoStyle = { display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', background: '#fef2f2', color: '#ef4444', border: '1px solid #fee2e2', borderRadius: '8px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 'bold' };
const btnExportarStyle = { display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 18px', background: '#10b981', color: 'white', border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.8rem' };
const dropdownExportStyle = { position: 'absolute', top: '45px', right: 0, background: 'white', border: '1px solid #e2e8f0', borderRadius: '12px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', zIndex: 1000, width: '200px', overflow: 'hidden' };
const itemExportStyle = { width: '100%', padding: '12px', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.8rem', color: '#1e293b', borderBottom: '1px solid #f1f5f9' };
const contenedorTablaStyle = { overflowX: 'auto', overflowY: 'visible', minHeight: '400px', maxHeight: '70vh', borderBottom: '1px solid #f1f5f9' };
const dropdownFiltroStyle = { position: 'absolute', top: '30px', left: 0, background: 'white', border: '1px solid #e2e8f0', borderRadius: '8px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', zIndex: 9999, width: '220px', padding: '12px' };
const dropdownColStyle = { position: 'absolute', right: 0, top: '45px', background: 'white', border: '1px solid #e2e8f0', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', zIndex: 1000, padding: '15px', borderRadius: '12px', width: '240px', maxHeight: '450px', overflowY: 'auto' };
const headerFiltroStyle = { display: 'flex', alignItems: 'center', gap: '8px', padding: '5px', borderBottom: '1px solid #f1f5f9', marginBottom: '8px' };
const inputBusquedaStyle = { border: 'none', outline: 'none', fontSize: '0.8rem', width: '100%' };
const listaOpcionesStyle = { maxHeight: '200px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px' };
const labelOpcionStyle = { display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.75rem', cursor: 'pointer', padding: '3px 5px', borderRadius: '4px' };
const footerFiltroStyle = { display: 'flex', justifyContent: 'space-between', marginTop: '12px', paddingTop: '10px', borderTop: '1px solid #f1f5f9' };
const btnLimpiarFiltroMini = { background: 'none', border: 'none', color: '#64748b', fontSize: '0.7rem', cursor: 'pointer' };
const btnAplicarFiltro = { background: '#1e293b', border: 'none', color: 'white', fontSize: '0.75rem', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer' };
const barraHerramientasStyle = { padding: '15px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between' };
const thStyle = { padding: '12px 15px', textAlign: 'left', color: '#475569', whiteSpace: 'nowrap', borderBottom: '1px solid #e2e8f0' };
const tdStyle = { padding: '10px 15px', whiteSpace: 'nowrap', color: '#1e293b', borderBottom: '1px solid #f1f5f9' };
const selectStyle = { padding: '8px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none' };
const btnColumnasStyle = { display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 18px', background: 'white', border: '1px solid #cbd5e1', borderRadius: '10px', cursor: 'pointer', fontWeight: '500' };
const paginacionContainer = { padding: '15px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '15px', borderTop: '1px solid #e2e8f0' };
const btnPag = { padding: '8px', background: 'white', border: '1px solid #cbd5e1', borderRadius: '8px', cursor: 'pointer' };

export default TablaVentas;