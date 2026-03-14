import { differenceInBusinessDays, parseISO, format } from 'date-fns';

/**
 * Calcula días útiles restando fines de semana y una lista de feriados
 * @param {Date} fechaInicio 
 * @param {Date} fechaFin 
 * @param {Array} feriados - Lista de strings ['YYYY-MM-DD']
 */
export const calcularDiasSinInterna = (fechaInicio, fechaFin, feriados = []) => {
  if (!fechaInicio) return 0;
  const inicio = new Date(fechaInicio);
  const fin = fechaFin ? new Date(fechaFin) : new Date(); // Si no hay fin, usar hoy

  // differenceInBusinessDays ya descuenta Sábados y Domingos
  let diasUtiles = differenceInBusinessDays(fin, inicio);

  // Descontar feriados que caigan entre lunes y viernes
  feriados.forEach(feriadoStr => {
    const feriado = new Date(feriadoStr);
    if (feriado >= inicio && feriado <= fin) {
      const diaSemana = feriado.getDay();
      if (diaSemana !== 0 && diaSemana !== 6) { // 0=Dom, 6=Sab
        diasUtiles--;
      }
    }
  });

  return diasUtiles < 0 ? 0 : diasUtiles;
};

// Formateador para visualizar siempre DD/MM/AAAA
export const formatearFechaVisual = (fecha) => {
  if (!fecha) return "";
  const d = new Date(fecha);
  return format(d, 'dd/MM/yyyy');
};