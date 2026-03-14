import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Plus, Edit, Trash2, Save, X, Search } from 'lucide-react';

const ModuloMaestro = ({ tabla, titulo }) => {
  const [items, setItems] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  
  // Estados para el Modal de Edición
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [itemAEditar, setItemAEditar] = useState(null);
  
  // Estado para Nuevo Registro (Añadimos 'codigo' para Observaciones)
  const [nuevoItem, setNuevoItem] = useState({ nombre: '', dni_ruc: '', codigo: '' });

  const getColumnaNombre = () => {
    if (tabla === 'maestro_grupos') return 'nombre_grupo';
    if (tabla === 'maestro_observaciones_gen') return 'descripcion_og';
    return 'nombre'; 
  };

  const getColumnaId = () => {
    if (tabla === 'maestro_asesoras') return 'id_asesora';
    if (tabla === 'maestro_tecnicos') return 'id_tecnico';
    if (tabla === 'maestro_grupos') return 'id_grupo';
    return 'id_obs_gen';
  };

  useEffect(() => {
    fetchData();
  }, [tabla]);

  const fetchData = async () => {
    setCargando(true);
    const colNombre = getColumnaNombre();
    const { data, error } = await supabase.from(tabla).select('*').order(colNombre);
    if (!error) setItems(data);
    setCargando(false);
  };

  const itemsFiltrados = useMemo(() => {
    const colNombre = getColumnaNombre();
    return items.filter(item => {
      const valor = String(item[colNombre] || '').toLowerCase();
      const dni = String(item.dni_ruc || '').toLowerCase();
      const cod = String(item.codigo_og || '').toLowerCase();
      return valor.includes(busqueda.toLowerCase()) || 
             dni.includes(busqueda.toLowerCase()) ||
             cod.includes(busqueda.toLowerCase());
    });
  }, [items, busqueda, tabla]);

  const handleGuardarNuevo = async () => {
    const colNombre = getColumnaNombre();
    if (!nuevoItem.nombre) return;

    // Construcción dinámica del objeto según la tabla
    const objetoAInsertar = {
      [colNombre]: nuevoItem.nombre
    };

    if (tabla === 'maestro_observaciones_gen') {
      objetoAInsertar.codigo_og = nuevoItem.codigo; // El campo que faltaba
    } else {
      objetoAInsertar.dni_ruc = nuevoItem.dni_ruc;
    }

    const { error } = await supabase.from(tabla).insert([objetoAInsertar]);
    if (!error) {
      setNuevoItem({ nombre: '', dni_ruc: '', codigo: '' });
      fetchData();
    } else {
      alert("Error al guardar: " + error.message);
    }
  };

  const handleActualizar = async () => {
    const idCol = getColumnaId();
    const colNombre = getColumnaNombre();
    
    const objetoAActualizar = { 
      [colNombre]: itemAEditar[colNombre]
    };

    if (tabla === 'maestro_observaciones_gen') {
      objetoAActualizar.codigo_og = itemAEditar.codigo_og;
    } else {
      objetoAActualizar.dni_ruc = itemAEditar.dni_ruc;
    }

    const { error } = await supabase
      .from(tabla)
      .update(objetoAActualizar)
      .eq(idCol, itemAEditar[idCol]);

    if (!error) {
      setIsEditModalOpen(false);
      fetchData();
    }
  };

  const handleEliminar = async (id) => {
    if (!window.confirm("¿Está seguro de eliminar este registro?")) return;
    const idCol = getColumnaId();
    const { error } = await supabase.from(tabla).delete().eq(idCol, id);
    if (!error) fetchData();
    else alert("No se puede eliminar: El registro está siendo usado en Ventas.");
  };

  const abrirEdicion = (item) => {
    setItemAEditar({...item});
    setIsEditModalOpen(true);
  };

  return (
    <div style={containerStyle}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px' }}>
        <h2 style={titleStyle}>{titulo}</h2>
        <div style={searchContainerStyle}>
          <Search size={18} color="#94a3b8" />
          <input 
            type="text" 
            placeholder="Buscar registro..." 
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            style={searchInternalInputStyle}
          />
        </div>
      </header>
      
      <div style={formStyle}>
        {tabla === 'maestro_observaciones_gen' && (
          <input 
            placeholder="Código OG" 
            value={nuevoItem.codigo} 
            onChange={(e) => setNuevoItem({...nuevoItem, codigo: e.target.value})}
            style={{...inputStyle, flex: '0 0 120px'}}
          />
        )}
        <input 
          placeholder={tabla === 'maestro_observaciones_gen' ? "Descripción de la observación" : (tabla === 'maestro_grupos' ? "Nombre del Grupo" : "Nombre")} 
          value={nuevoItem.nombre} 
          onChange={(e) => setNuevoItem({...nuevoItem, nombre: e.target.value})}
          style={inputStyle}
        />
        {tabla !== 'maestro_observaciones_gen' && (
          <input 
            placeholder="DNI / RUC" 
            value={nuevoItem.dni_ruc} 
            onChange={(e) => setNuevoItem({...nuevoItem, dni_ruc: e.target.value})}
            style={inputStyle}
          />
        )}
        <button onClick={handleGuardarNuevo} style={btnPlusStyle}><Plus size={18} /> AGREGAR</button>
      </div>

      <div style={tablaContainerStyle}>
        <table style={tableStyle}>
          <thead>
            <tr>
              <th style={thStyle}>ID</th>
              {tabla === 'maestro_observaciones_gen' && <th style={thStyle}>CÓDIGO</th>}
              <th style={thStyle}>NOMBRE / DESCRIPCIÓN</th>
              {tabla !== 'maestro_observaciones_gen' && <th style={thStyle}>DNI/RUC</th>}
              <th style={thStyle}>ACCIONES</th>
            </tr>
          </thead>
          <tbody>
            {itemsFiltrados.map(item => {
              const idCol = getColumnaId();
              const colNombre = getColumnaNombre();
              return (
                <tr key={item[idCol]} style={trStyle}>
                  <td style={tdStyle}>{item[idCol]}</td>
                  {tabla === 'maestro_observaciones_gen' && <td style={tdStyle}><span style={badgeStyle}>{item.codigo_og}</span></td>}
                  <td style={tdStyle}>{item[colNombre]}</td>
                  {tabla !== 'maestro_observaciones_gen' && <td style={tdStyle}>{item.dni_ruc || '-'}</td>}
                  <td style={tdStyle}>
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <button onClick={() => abrirEdicion(item)} style={btnEditStyle}><Edit size={16} /></button>
                      <button onClick={() => handleEliminar(item[idCol])} style={btnTrashStyle}><Trash2 size={16} /></button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {isEditModalOpen && (
        <div style={modalOverlayStyle}>
          <div style={modalContentStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
              <h3 style={{ margin: 0 }}>EDITAR REGISTRO</h3>
              <X onClick={() => setIsEditModalOpen(false)} style={{ cursor: 'pointer' }} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              {tabla === 'maestro_observaciones_gen' && (
                <div>
                  <label style={labelStyle}>Código OG</label>
                  <input 
                    style={inputStyle} 
                    value={itemAEditar.codigo_og || ''} 
                    onChange={(e) => setItemAEditar({...itemAEditar, codigo_og: e.target.value})}
                  />
                </div>
              )}
              <div>
                <label style={labelStyle}>Nombre / Descripción</label>
                <input 
                  style={inputStyle} 
                  value={itemAEditar[getColumnaNombre()] || ''} 
                  onChange={(e) => setItemAEditar({...itemAEditar, [getColumnaNombre()]: e.target.value})}
                />
              </div>
              {tabla !== 'maestro_observaciones_gen' && (
                <div>
                  <label style={labelStyle}>DNI / RUC</label>
                  <input 
                    style={inputStyle} 
                    value={itemAEditar.dni_ruc || ''} 
                    onChange={(e) => setItemAEditar({...itemAEditar, dni_ruc: e.target.value})}
                  />
                </div>
              )}
              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button onClick={handleActualizar} style={btnPlusStyle}><Save size={18} /> GUARDAR</button>
                <button onClick={() => setIsEditModalOpen(false)} style={btnCancelStyle}>CANCELAR</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ESTILOS (Mantenidos íntegros y añadidos nuevos para el código)
const badgeStyle = { background: '#f1f5f9', color: '#475569', padding: '4px 8px', borderRadius: '6px', fontWeight: 'bold', fontSize: '0.75rem' };
const containerStyle = { background: 'white', padding: '30px', borderRadius: '25px', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' };
const titleStyle = { margin: 0, color: '#1e293b', fontSize: '1.2rem', fontWeight: '800' };
const searchContainerStyle = { display: 'flex', alignItems: 'center', gap: '10px', background: '#f1f5f9', padding: '8px 15px', borderRadius: '12px', width: '300px' };
const searchInternalInputStyle = { border: 'none', background: 'transparent', outline: 'none', fontSize: '0.9rem', width: '100%' };
const formStyle = { display: 'flex', gap: '12px', marginBottom: '30px', padding: '20px', background: '#f8fafc', borderRadius: '18px', border: '1px solid #e2e8f0' };
const inputStyle = { padding: '12px', borderRadius: '10px', border: '1px solid #e2e8f0', flex: 1, outline: 'none', fontSize: '0.9rem', width: '100%' };
const btnPlusStyle = { display: 'flex', alignItems: 'center', gap: '8px', background: '#0f172a', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '12px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.8rem' };
const btnCancelStyle = { background: '#f1f5f9', color: '#64748b', border: 'none', padding: '10px 20px', borderRadius: '12px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.8rem' };
const tablaContainerStyle = { maxHeight: '450px', overflowY: 'auto' };
const tableStyle = { width: '100%', borderCollapse: 'collapse' };
const thStyle = { textAlign: 'left', padding: '15px', borderBottom: '2px solid #f1f5f9', color: '#64748b', fontSize: '0.75rem', fontWeight: 'bold', textTransform: 'uppercase' };
const tdStyle = { padding: '15px', borderBottom: '1px solid #f1f5f9', fontSize: '0.85rem' };
const trStyle = { transition: 'background 0.2s' };
const btnEditStyle = { background: '#f0fdf4', border: 'none', color: '#22c55e', padding: '8px', borderRadius: '8px', cursor: 'pointer' };
const btnTrashStyle = { background: '#fef2f2', border: 'none', color: '#ef4444', padding: '8px', borderRadius: '8px', cursor: 'pointer' };
const modalOverlayStyle = { position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, backdropFilter: 'blur(4px)' };
const modalContentStyle = { background: 'white', padding: '30px', borderRadius: '25px', width: '400px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' };
const labelStyle = { fontSize: '0.75rem', fontWeight: 'bold', color: '#64748b', marginBottom: '5px', display: 'block' };

export default ModuloMaestro;