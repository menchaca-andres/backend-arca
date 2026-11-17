const FERIADOS: Record<string, string> = {
  '2026-01-01': 'Año Nuevo',
  '2026-01-22': 'Día del Estado Plurinacional',
  '2026-02-16': 'Carnaval',
  '2026-02-17': 'Carnaval',
  '2026-04-03': 'Viernes Santo',
  '2026-05-01': 'Día del Trabajo',
  '2026-06-04': 'Corpus Christi',
  '2026-06-21': 'Año Nuevo Andino Amazónico y del Chaco',
  '2026-06-22': 'Feriado observado por Año Nuevo Andino Amazónico y del Chaco',
  '2026-08-06': 'Día de la Independencia',
  '2026-11-02': 'Día de Todos los Difuntos',
  '2026-12-25': 'Navidad',
  '2027-01-01': 'Año Nuevo',
  '2027-01-22': 'Día del Estado Plurinacional',
  '2027-02-08': 'Carnaval',
  '2027-02-09': 'Carnaval',
  '2027-03-26': 'Viernes Santo',
  '2027-05-01': 'Día del Trabajo',
  '2027-05-27': 'Corpus Christi',
  '2027-06-21': 'Año Nuevo Andino Amazónico y del Chaco',
  '2027-08-06': 'Día de la Independencia',
  '2027-11-02': 'Día de Todos los Difuntos',
  '2027-12-25': 'Navidad',
};

export function contarDiasHabiles(desde: string, hasta: string): number {
  const inicio = Date.parse(`${desde}T00:00:00Z`);
  const fin = Date.parse(`${hasta}T00:00:00Z`);
  if (!Number.isFinite(inicio) || !Number.isFinite(fin) || fin < inicio) return 0;

  let dias = 0;
  for (let fecha = inicio; fecha <= fin; fecha += 86_400_000) {
    const dia = new Date(fecha).getUTCDay();
    const fechaIso = new Date(fecha).toISOString().slice(0, 10);
    if (dia !== 0 && dia !== 6 && !FERIADOS[fechaIso]) dias += 1;
  }
  return dias;
}

export function listarFeriados(anio: number): Array<{ fecha: string; descripcion: string }> {
  return Object.entries(FERIADOS)
    .filter(([fecha]) => fecha.startsWith(`${anio}-`))
    .map(([fecha, descripcion]) => ({ fecha, descripcion }));
}
