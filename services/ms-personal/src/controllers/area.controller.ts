import { asyncHandler } from '@arca/shared';
import type { AreaListQuery, CreateAreaInput, UpdateAreaInput } from '../schemas/area.schema';
import { AreaService } from '../services/area.service';

export class AreaController {
  private serviceInstance?: AreaService;

  private get service() {
    this.serviceInstance ??= new AreaService();
    return this.serviceInstance;
  }

  list = asyncHandler(async (_req, res) => {
    const query = res.locals.query as AreaListQuery;
    res.json(await this.service.list(query.incluirInactivos === 'true'));
  });

  create = asyncHandler(async (req, res) => {
    const area = await this.service.create(req.body as CreateAreaInput);
    res.status(201).json(area);
  });

  update = asyncHandler(async (req, res) => {
    const { id } = res.locals.params as { id: string };
    const area = await this.service.update(id, req.body as UpdateAreaInput);
    res.json(area);
  });
}
