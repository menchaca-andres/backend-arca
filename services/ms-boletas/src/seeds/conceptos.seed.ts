import { AppDataSource } from '../data-source';
import { ConfiguracionRepository } from '../repositories/configuracion.repository';

async function main() {
  await AppDataSource.initialize();
  try {
    await new ConfiguracionRepository().asegurarSemillas();
  } finally {
    await AppDataSource.destroy();
  }
}
main().catch(() => {
  console.error('No se pudo cargar la semilla de conceptos');
  process.exitCode = 1;
});
