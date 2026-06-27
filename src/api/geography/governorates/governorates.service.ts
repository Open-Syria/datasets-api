import { Injectable } from '@nestjs/common';
import type { GovernorateList } from './governorates.dto';

@Injectable()
export class GovernoratesService {
  listGovernorates(): GovernorateList {
    return {
      items: [],
      count: 0,
      dataset: {
        id: 'opensyria-geography',
        repository: 'data-geography',
        status: 'pending_release',
      },
      release: null,
    };
  }
}
