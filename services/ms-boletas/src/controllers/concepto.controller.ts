import type { Request, Response } from 'express';
import { ConceptoService } from '../services/concepto.service';

export class ConceptoController {
  constructor(private service: ConceptoService = new ConceptoService()) {}

  listar = async (req: Request, res: Response): Promise<void> => {
    const activoParam = req.query.activo;
    const activo = activoParam !== undefined ? activoParam === 'true' : undefined;
    const conceptos = await this.service.listar(activo !== undefined ? { activo } : undefined);
    res.json(conceptos);
  };

  obtenerPorId = async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const concepto = await this.service.obtenerPorId(id);
    res.json(concepto);
  };

  crear = async (req: Request, res: Response): Promise<void> => {
    const concepto = await this.service.crear(req.body);
    res.status(201).json(concepto);
  };

  actualizar = async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const concepto = await this.service.actualizar(id, req.body);
    res.json(concepto);
  };

  eliminar = async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const resultado = await this.service.eliminar(id);
    res.json(resultado);
  };
}

