import { HttpPersonalClient, type PersonalClient } from '../clients/personal.client';
import { ConfiguracionRepository } from '../repositories/configuracion.repository';
import type {
  CrearConceptoInput,
  CrearNovedadInput,
  EditarConceptoInput,
  FiltroNovedades,
} from '../schemas/configuracion.schema';

export class ConfiguracionService {
  constructor(
    private readonly repo = new ConfiguracionRepository(),
    private readonly personal: PersonalClient = new HttpPersonalClient(),
  ) {}
  listarConceptos(inactivos: boolean) {
    return this.repo.listarConceptos(inactivos);
  }
  crearConcepto(input: CrearConceptoInput) {
    return this.repo.crearConcepto(input);
  }
  actualizarConcepto(id: string, input: EditarConceptoInput) {
    return this.repo.actualizarConcepto(id, input);
  }
  cambiarEstado(id: string, activo: boolean) {
    return this.repo.cambiarEstado(id, activo);
  }
  eliminarConcepto(id: string) {
    return this.repo.eliminarConcepto(id);
  }
  listarNovedades(filtro: FiltroNovedades) {
    return this.repo.listarNovedades(filtro);
  }
  async crearNovedad(input: CrearNovedadInput, autor: string) {
    await this.personal.verificarFuncionario(input.funcionarioId);
    return this.repo.crearNovedad(input, autor);
  }
}
