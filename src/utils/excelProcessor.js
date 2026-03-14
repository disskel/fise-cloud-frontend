import * as XLSX from 'xlsx';

// Lista exacta de las 18 columnas que queremos del Portal
const COLUMNAS_PORTAL_REQUERIDAS = [
  "Número de documento de identificación del solicitante",
  "Número de Solicitud",
  "Código de identificación interna del predio",
  "Nombre del solicitante",
  "Dirección",
  "Número de Contrato de Suministro",
  "Fecha de aprobación del contrato",
  "Distrito",
  "Provincia",
  "Celular",
  "Fecha de registro de la Solicitud en el Portal",
  "Estado de Solicitud",
  "Anulada",
  "Nombre de Malla",
  "Ubicación",
  "Tipo de instalación",
  "Número de puntos de instalación proyectados",
  "Fecha de finalización de la Instalación Interna"
];

export const procesarExcelPortal = (archivo) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: 'array' });
      const hoja = workbook.Sheets[workbook.SheetNames[0]];
      
      // Convertimos a matriz para manejar los índices manualmente
      const filas = XLSX.utils.sheet_to_json(hoja, { header: 1 });
      const encabezados = filas[0];
      
      // MAPEO DE COLUMNAS (Regla de primera aparición)
      const mapaIndices = {};
      COLUMNAS_PORTAL_REQUERIDAS.forEach(nombreReq => {
        const indice = encabezados.findIndex(h => h === nombreReq);
        if (indice !== -1) {
          mapaIndices[nombreReq] = indice;
        }
      });

      // Extraer datos usando los índices encontrados
      const resultados = filas.slice(1).map(fila => {
        let registro = {};
        COLUMNAS_PORTAL_REQUERIDAS.forEach(col => {
          registro[col] = fila[mapaIndices[col]];
        });
        return registro;
      });

      resolve(resultados);
    };
    reader.onerror = (error) => reject(error);
    reader.readAsArrayBuffer(archivo);
  });
};