import type { ApiPaginatedResponseOptions } from './api-paginated-response';
import { ApiPaginatedResponse } from './api-paginated-response';
import type { ApiStandardResponseOptions } from './api-response';
import { ApiStandardResponse } from './api-response';

type ApiPublicOptions =
  | (ApiStandardResponseOptions & {
      isPaginated?: false;
    })
  | (ApiPaginatedResponseOptions & {
      isPaginated: true;
    });

export function ApiPublic(options: ApiPublicOptions) {
  if (options.isPaginated) {
    return ApiPaginatedResponse(options);
  }

  return ApiStandardResponse(options);
}
