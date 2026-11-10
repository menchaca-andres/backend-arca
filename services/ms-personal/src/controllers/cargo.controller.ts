import { asyncHandler } from '@arca/shared';
import type { CargoListQuery, CreateCargoInput, UpdateCargoInput } from '../schemas/cargo.schema';
import { CargoService } from '../services/cargo.service';

export class CargoController {
  private serviceInstance?: CargoService;

  private get service() {
    this.serviceInstance ??= new CargoService();
    return this.serviceInstance;
  }

  list = asyncHandler(async (_req, res) => {
    const query = res.locals.query as CargoListQuery;
    res.json(
      await this.service.list({
        includeInactive: query.incluirInactivos === 'true',
        areaId: query.areaId,
      }),
    );
  });

  create = asyncHandler(async (req, res) => {
    const cargo = await this.service.create(req.body as CreateCargoInput);
    res.status(201).json(cargo);
  });

  update = asyncHandler(async (req, res) => {
    const { id } = res.locals.params as { id: string };
    const cargo = await this.service.update(id, req.body as UpdateCargoInput);
    res.json(cargo);
  });
}
