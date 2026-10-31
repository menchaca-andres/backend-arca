import { EstadoFuncionario, MotivoAsignacion, MotivoBaja } from '@arca/shared';
import { AppDataSource } from '../data-source';
import { Area } from '../entities/area.entity';
import { AsignacionLaboral } from '../entities/asignacion-laboral.entity';
import { Cargo } from '../entities/cargo.entity';
import { Funcionario } from '../entities/funcionario.entity';
import { AreaRepository } from '../repositories/area.repository';
import { AsignacionLaboralRepository } from '../repositories/asignacion-laboral.repository';
import { CargoRepository } from '../repositories/cargo.repository';
import { FuncionarioRepository } from '../repositories/funcionario.repository';

// registrado_por no tiene FK: el usuario vive en otro schema y aquí todavía no hay uno real.
const USUARIO_SEMILLA = '00000000-0000-0000-0000-000000000001';

const AREAS = [
  { codigo: 'ADM', nombre: 'Administración' },
  { codigo: 'OPE', nombre: 'Operaciones' },
  { codigo: 'SIS', nombre: 'Sistemas' },
];

const CARGOS = [
  { area: 'ADM', nombre: 'Jefe de RRHH', salarioMin: 9000, salarioMax: 14000 },
  { area: 'ADM', nombre: 'Asistente Administrativo', salarioMin: 3000, salarioMax: 5000 },
  { area: 'OPE', nombre: 'Supervisor de Operaciones', salarioMin: 6000, salarioMax: 9000 },
  { area: 'OPE', nombre: 'Operador', salarioMin: 2800, salarioMax: 4500 },
  { area: 'SIS', nombre: 'Desarrollador', salarioMin: 6500, salarioMax: 12000 },
];

const FUNCIONARIOS = [
  {
    cargo: 'Operador',
    remuneracion: 3200,
    datos: { ci: '9000001', ciExpedido: 'CB', nombres: 'Lucía', apellidos: 'Vargas Rojas', fechaNacimiento: '2000-03-14', sexo: 'F', fechaIngreso: '2026-09-01', estado: EstadoFuncionario.EN_PRUEBA },
  },
  {
    cargo: 'Asistente Administrativo',
    remuneracion: 3800,
    datos: { ci: '9000002', ciExpedido: 'LP', nombres: 'Marco', apellidos: 'Quispe Flores', fechaNacimiento: '1998-11-02', sexo: 'M', fechaIngreso: '2026-10-01', diasPrueba: 60, estado: EstadoFuncionario.EN_PRUEBA },
  },
  // Más de 1 año de antigüedad, para probar vacaciones
  {
    cargo: 'Desarrollador',
    remuneracion: 9500,
    datos: { ci: '9000003', ciExpedido: 'SC', nombres: 'Daniela', apellidos: 'Mendoza Arce', fechaNacimiento: '1992-07-25', sexo: 'F', fechaIngreso: '2024-03-01', estado: EstadoFuncionario.RATIFICADO, fechaRatificacion: '2024-05-30' },
  },
  {
    cargo: 'Supervisor de Operaciones',
    remuneracion: 7200,
    datos: { ci: '9000004', ciExpedido: 'CB', nombres: 'Jorge', apellidos: 'Rocha Salinas', fechaNacimiento: '1988-01-09', sexo: 'M', fechaIngreso: '2026-03-02', estado: EstadoFuncionario.RATIFICADO, fechaRatificacion: '2026-05-31' },
  },
  {
    cargo: 'Jefe de RRHH',
    remuneracion: 10500,
    datos: { ci: '9000005', ciExpedido: 'OR', nombres: 'Elena', apellidos: 'Paz Gutiérrez', fechaNacimiento: '1985-09-30', sexo: 'F', fechaIngreso: '2025-02-03', estado: EstadoFuncionario.BAJA, fechaRatificacion: '2025-05-04', fechaBaja: '2026-08-31', motivoBaja: MotivoBaja.RENUNCIA },
  },
];

async function seed() {
  const areaRepo = new AreaRepository();
  const cargoRepo = new CargoRepository();
  const funcionarioRepo = new FuncionarioRepository();
  const asignacionRepo = new AsignacionLaboralRepository();

  const areas = await areaRepo.findAll();
  for (const datos of AREAS) {
    if (!areas.some((a) => a.codigo === datos.codigo)) {
      areas.push(await areaRepo.save(Object.assign(new Area(), datos)));
    }
  }

  const cargos = await cargoRepo.findAll();
  for (const { area, ...datos } of CARGOS) {
    const areaId = areas.find((a) => a.codigo === area)!.id;
    if (!cargos.some((c) => c.areaId === areaId && c.nombre === datos.nombre)) {
      cargos.push(await cargoRepo.save(Object.assign(new Cargo(), { ...datos, areaId })));
    }
  }

  const funcionarios = await funcionarioRepo.findAll();
  const asignaciones = await asignacionRepo.findAll();
  for (const { cargo, remuneracion, datos } of FUNCIONARIOS) {
    const funcionario =
      funcionarios.find((f) => f.ci === datos.ci) ??
      (await funcionarioRepo.save(Object.assign(new Funcionario(), datos)));

    if (!asignaciones.some((a) => a.funcionarioId === funcionario.id)) {
      await asignacionRepo.save(
        Object.assign(new AsignacionLaboral(), {
          funcionarioId: funcionario.id,
          cargoId: cargos.find((c) => c.nombre === cargo)!.id,
          remuneracion,
          vigenteDesde: datos.fechaIngreso,
          vigenteHasta: datos.fechaBaja ?? null,
          motivo: MotivoAsignacion.INGRESO,
          registradoPor: USUARIO_SEMILLA,
        }),
      );
    }
  }
}

AppDataSource.initialize()
  .then(seed)
  .then(() => AppDataSource.destroy())
  .then(() => console.log('[ms-personal] Semilla aplicada'))
  .catch((err) => {
    console.error('[ms-personal] La semilla falló:', err);
    process.exit(1);
  });
