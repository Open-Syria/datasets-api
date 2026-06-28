# API Standards

This document defines the conventions for `datasets-api` controllers, DTOs, responses, validation, and generated documentation.

The goal is that every endpoint looks and behaves like it belongs to the same API, even when datasets are implemented at different times.

## Table of Contents

- [Core Rules](#core-rules)
- [File Naming](#file-naming)
- [Route Naming](#route-naming)
- [Controller Method Naming](#controller-method-naming)
- [Query Parameters](#query-parameters)
- [Request DTOs](#request-dtos)
- [OpenAPI Tags](#openapi-tags)
- [Operation Summaries](#operation-summaries)
- [Operation Descriptions](#operation-descriptions)
- [DTO and Schema Naming](#dto-and-schema-naming)
- [Zod DTO Pattern](#zod-dto-pattern)
- [Response Envelope](#response-envelope)
- [Response Helpers](#response-helpers)
- [Response DTO Factories](#response-dto-factories)
- [Swagger Decorators](#swagger-decorators)
- [Standard Error Responses](#standard-error-responses)
- [Pagination](#pagination)
- [i18n Message Keys](#i18n-message-keys)
- [OpenAPI Documents](#openapi-documents)
- [Security Headers and CORS](#security-headers-and-cors)
- [Documentation Descriptions](#documentation-descriptions)
- [Controller Example](#controller-example)
- [Review Checklist](#review-checklist)

## Core Rules

- The API is public and read-only.
- The API codebase is maintainer-led; public dataset contributions happen in dataset repositories.
- Do not add auth-specific decorators, guards, or response docs to dataset endpoints.
- Use Fastify.
- Use Zod schemas and `nestjs-zod` DTOs for request validation, response serialization, and OpenAPI generation.
- Use shared response helpers instead of returning ad hoc objects from controllers.
- Use shared Swagger decorators instead of writing raw `@ApiResponse()` blocks in every controller.
- Localize response messages through i18n keys and provide English fallback messages.
- Keep canonical dataset names and aliases in the data model; do not invent translations in i18n files.

## File Naming

Use predictable NestJS naming:

```text
<domain>.module.ts
<domain>.controller.ts
<domain>.service.ts
<domain>.dto.ts
<domain>.schemas.ts
<domain>.service.spec.ts
<domain>.controller.spec.ts
```

Examples:

```text
datasets.module.ts
datasets.controller.ts
datasets.service.ts
datasets.dto.ts

geography.module.ts
governorates.controller.ts
governorates.service.ts
governorates.dto.ts
```

Use folder names for route domains:

```text
api/
  datasets/
  releases/
  geography/
    governorates/
    districts/
    subdistricts/
    localities/
  universities/
  transport/
  heritage/
  telecom/
```

## Route Naming

Routes should be noun-based, lowercase, and kebab-case where needed.

Preferred:

```text
GET /api/v1/datasets
GET /api/v1/releases
GET /api/v1/geography/governorates
GET /api/v1/geography/governorates/:governorateId
GET /api/v1/geography/districts?governorateId=
GET /api/v1/universities
GET /api/v1/universities/:universityId
```

Avoid:

```text
GET /api/v1/getGovernorates
GET /api/v1/governorate-list
GET /api/v1/data/geography/governorates/all
```

Use resource-specific parameter names:

```text
:datasetId
:releaseId
:governorateId
:districtId
:universityId
```

Do not use generic `:id` in public routes unless the controller has only one possible resource type.

## Controller Method Naming

Use simple verb-resource method names:

```ts
listDatasets()
getDataset()
listGovernorates()
getGovernorate()
listDistricts()
listUniversities()
getUniversity()
```

Use `list*` for collection endpoints, `get*` for single-record endpoints, and `search*` only when the endpoint is primarily search-focused rather than a filtered list.

## Query Parameters

List endpoints should use a Zod query DTO. Start with the shared offset pagination shape when a list can grow:

```text
page
limit
q
order
```

Rules:

- `page` is 1-based.
- `limit` is a named enum, not a free integer.
- Allowed limit values are `TEN`, `THIRTY_FIVE`, and `FIFTY`.
- The API transforms limit names into numeric pagination sizes: `TEN=10`, `THIRTY_FIVE=35`, and `FIFTY=50`.
- `q` is a broad text search parameter.
- `order` is a named enum, not a free string.
- Allowed order values are `ASC` and `DESC`.
- The API transforms order names into internal sort values: `ASC=asc` and `DESC=desc`.
- `sourceStatus` is a named enum for public query filters.
- Allowed source status values are `PENDING_RELEASE`, `SEED`, `RELEASED`, and `DEPRECATED`.
- The API transforms source status names into internal record values: `PENDING_RELEASE=pending_release`, `SEED=seed`, `RELEASED=released`, and `DEPRECATED=deprecated`.
- Resource-specific filters should use explicit names such as `sourceStatus`, `governorateId`, or `datasetId`.
- Avoid ambiguous filter names such as `id`, `type`, or `status` when more specific terms exist.
- Query DTOs should expose their OpenAPI query metadata through `static readonly openApiQueryParameters`.
- Controllers should use `@ApiQueryDto(QueryDto)` instead of repeating raw `@ApiQuery()` decorators.
- Use raw `@ApiQuery()` only for a truly one-off case that cannot be expressed through the shared DTO metadata helper.

Example:

```ts
export class GovernorateListQueryDto extends createZodDto(governorateListQuerySchema) {
  static readonly openApiQueryParameters = [
    ...buildOffsetPaginationQueryParameters({
      searchDescription: 'Search term matched against ID, names, ISO code, and source status.',
      searchExample: 'damascus',
    }),
    {
      name: 'sourceStatus',
      required: false,
      enum: ['PENDING_RELEASE', 'SEED', 'RELEASED', 'DEPRECATED'],
      description:
        'Filter records by source review or release status. PENDING_RELEASE=pending release, SEED=seed data, RELEASED=released data, DEPRECATED=deprecated data.',
      example: 'RELEASED',
    },
  ] satisfies readonly ApiQueryParameter[];
}
```

## Request DTOs

Queries, route params, and any request bodies should use Zod schemas wrapped with `createZodDto`.

Rules:

- Query schemas end with `QuerySchema`; query DTOs end with `QueryDto`.
- Param schemas end with `ParamsSchema`; param DTOs end with `ParamsDto`.
- Body schemas end with `BodySchema`; body DTOs end with `BodyDto`.
- Controllers should receive the complete DTO object, such as `@Param() params`, instead of extracting raw strings with `@Param('id')`.
- Controllers should validate request DTOs with Zod. The app has a global `ZodValidationPipe`; route handlers may also use explicit `new ZodValidationPipe(Dto)` when that makes the validation boundary clearer.
- OpenAPI metadata for request DTOs lives beside the DTO class.

Metadata fields:

```text
openApiQueryParameters
openApiParamParameters
openApiBody
```

Controller decorators:

```text
@ApiQueryDto(QueryDto)
@ApiParamDto(ParamsDto)
@ApiBodyDto(BodyDto)
```

Example:

```ts
export const governorateParamsSchema = z.object({
  governorateId: z.string().trim().min(1),
});

export class GovernorateParamsDto extends createZodDto(governorateParamsSchema) {
  static readonly openApiParamParameters = [
    {
      name: 'governorateId',
      description: 'Stable OpenSyria governorate ID.',
      example: 'sy-damascus',
    },
  ] satisfies readonly ApiParamParameter[];
}
```

`datasets-api` is read-only, so body DTOs should be rare. If a body endpoint is ever added for an operational need, it should still use a Zod body schema, `BodyDto`, `@Body() body`, and `@ApiBodyDto(BodyDto)`.

## OpenAPI Tags

Tags should be Title Case and stable. Use one primary tag per controller.

Current tags:

```text
Health
Dataset Discovery
Releases
Geography
```

Reserved future tags:

```text
Universities
Transport
Heritage
Telecom
Sources
```

Rules:

- Do not create separate tags for every HTTP method.
- Do not include version numbers in tags.
- Do not include implementation details such as `Redis`, `Fastify`, `Zod`, or `Internal`.
- Do not use audience tags such as `Admin`, `Mobile`, or `Website` in `datasets-api`.
- Do not add reserved future tags to the served OpenAPI document until matching endpoints exist.

## Operation Summaries

Summaries should be short, imperative, and user-facing.

Preferred:

```text
List available datasets
Get dataset metadata
List governorates
Get governorate details
List districts for a governorate
List universities
Get university details
```

Avoid:

```text
Returns governorates
Endpoint for getting all governorate data from repository
This API will fetch the complete list of governorates
```

## Operation Descriptions

Descriptions should explain what the caller gets, not implementation internals.

Include when useful:

- dataset version behavior,
- language behavior,
- source/attribution behavior,
- filtering behavior,
- sorting behavior,
- known limitations.

Example:

```text
Returns released governorate records with localized display names, stable OpenSyria IDs, source references, and external identifiers when available.
```

Avoid mentioning Redis, GitHub fetch logic, internal file paths, or cache implementation in public operation descriptions.

## DTO and Schema Naming

Use Zod schemas as the source of truth and DTO classes as Nest/OpenAPI wrappers.

Schema names:

```ts
datasetSummarySchema
datasetDetailSchema
datasetListQuerySchema
governorateSummarySchema
governorateDetailSchema
governorateListQuerySchema
```

DTO class names:

```ts
DatasetSummaryDto
DatasetDetailDto
DatasetListQueryDto
GovernorateSummaryDto
GovernorateDetailDto
GovernorateListQueryDto
```

Rules:

- Zod schemas use `camelCase` and end with `Schema`.
- DTO classes use `PascalCase` and end with `Dto`.
- Query DTOs end with `QueryDto`.
- Body DTOs end with `BodyDto`. Body DTOs should be rare because this API is read-only.
- Response data DTOs describe the `data` payload, not the whole envelope.
- Generated envelope DTOs should be created by shared response DTO factories.

## Zod DTO Pattern

Every public DTO should be backed by `createZodDto`.

```ts
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const datasetSummarySchema = z.object({
  id: z.string(),
  name: z.string(),
  repository: z.string(),
  status: z.enum(['planned', 'seed', 'released', 'deprecated']),
});

export class DatasetSummaryDto extends createZodDto(datasetSummarySchema) {}
```

Use Zod transforms for query parameters that should expose stable public options while remaining ergonomic internally:

```ts
export const listQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z
    .enum(['TEN', 'THIRTY_FIVE', 'FIFTY'])
    .default('TEN')
    .transform((limit) => ({ TEN: 10, THIRTY_FIVE: 35, FIFTY: 50 })[limit]),
  order: z
    .enum(['ASC', 'DESC'])
    .default('ASC')
    .transform((order) => ({ ASC: 'asc', DESC: 'desc' })[order]),
  sourceStatus: z
    .enum(['PENDING_RELEASE', 'SEED', 'RELEASED', 'DEPRECATED'])
    .transform(
      (sourceStatus) =>
        ({
          PENDING_RELEASE: 'pending_release',
          SEED: 'seed',
          RELEASED: 'released',
          DEPRECATED: 'deprecated',
        })[sourceStatus],
    )
    .optional(),
  q: z.string().trim().min(1).optional(),
});
```

## Response Envelope

All successful responses use the same envelope:

```ts
{
  success: true,
  status: 200,
  message: 'Datasets returned',
  data: {},
  timestamp: '2026-06-27T00:00:00.000Z'
}
```

List responses can use either a plain list DTO:

```ts
{
  data: {
    items: []
  }
}
```

or a paginated response:

```ts
{
  data: {
    items: [],
    pagination: {
      limit: 10,
      currentPage: 1,
      totalRecords: 100,
      totalPages: 5,
      nextPage: 2
    }
  }
}
```

Do not return raw arrays from controllers.

## Response Helpers

Implement helpers based on the reference backend pattern.

Required helpers:

```text
common/helpers/build-response.ts
common/helpers/build-offset-paginated-response.ts
```

Deferred helper:

```text
common/helpers/build-cursor-paginated-response.ts
```

`buildResponse` should:

- accept a DTO class,
- accept typed `data`,
- resolve `message` through i18n,
- provide a fallback English message,
- set `success: true`,
- set default `status: 200`,
- set `timestamp`.

Controller example:

```ts
return buildResponse(DatasetSummaryListDto, {
  data: { items: datasets },
  message: 'api.responses.datasets.listFetched',
  fallbackMessage: 'Datasets fetched successfully',
});
```

`buildOffsetPaginatedResponse` should:

- accept an item DTO class,
- accept `items`,
- accept `totalRecords`,
- accept normalized query options,
- build the pagination object,
- support optional extra response data when needed.

## Response DTO Factories

Implement DTO factories so Swagger schemas are generated consistently.

Required:

```text
common/dto/api-base-response.dto.ts
common/dto/api-response.dto.ts
common/dto/error.dto.ts
common/dto/offset-pagination/offset-paginated-response.dto.ts
```

Pattern:

```ts
export const createApiResponseDto = <T extends ZodDto<z.ZodTypeAny, boolean>>(
  itemType: T,
  name: string,
) => {
  const ResponseClass = createZodDto(
    apiBaseResponseSchema.extend({
      data: itemType.schema,
    }),
  );

  Object.defineProperty(ResponseClass, 'name', {
    value: name,
  });

  return ResponseClass;
};
```

Why this matters:

- OpenAPI response schemas get stable names.
- Controller decorators stay small.
- Response shapes cannot drift across modules.
- Zod serialization and docs use the same source schemas.

Generated response class names should follow this pattern:

```text
DatasetSummaryDtoResponse
DatasetSummaryDtoOffsetPaginatedResponse
GovernorateDetailDtoResponse
UniversitySummaryDtoOffsetPaginatedResponse
```

If the `Dto` suffix makes generated names noisy during implementation, use a helper that strips the suffix:

```text
DatasetSummaryResponse
DatasetSummaryOffsetPaginatedResponse
```

Pick one approach before the first public release and keep it stable.

## Swagger Decorators

Controllers should use shared decorator helpers.

Required:

```text
decorators/api-response.ts
decorators/api-paginated-response.ts
decorators/api-request-dto.ts
decorators/http-decorators.ts
```

Use one public endpoint decorator:

```ts
@ApiPublic({
  type: GovernorateSummaryDto,
  tags: ['Geography'],
  summary: 'List governorates',
  description:
    'Returns released governorate records with stable OpenSyria IDs, localized names, source references, and external identifiers when available.',
  isPaginated: true,
})
```

`ApiPublic` should:

- set `@ApiOperation`,
- register a standard success response with `ZodResponse`,
- register standard error responses,
- optionally register paginated responses,
- keep all endpoint docs in one place.

Do not add `ApiProtected` unless `datasets-api` ever gets private endpoints. That is not planned.

## Standard Error Responses

Default documented errors:

```text
400 Bad Request
404 Not Found
422 Unprocessable Entity
429 Too Many Requests
500 Internal Server Error
```

Do not document `401` or `403` on public read-only endpoints unless a route genuinely requires auth.

Errors should use the shared error envelope:

```ts
{
  success: false,
  status: 400,
  error: 'ValidationError',
  message: 'Validation failed',
  details: [
    {
      code: 'invalid_type',
      message: 'Expected string',
      property: 'governorateId'
    }
  ],
  timestamp: '2026-06-27T00:00:00.000Z'
}
```

## Pagination

Use offset pagination for first public list endpoints.

Default query parameters:

```text
page=1
limit=TEN
q=
order=ASC|DESC
```

Defaults:

```text
DEFAULT_CURRENT_PAGE=1
DEFAULT_PAGE_LIMIT_OPTION=TEN
DEFAULT_PAGE_LIMIT=10
MAX_PAGE_LIMIT=50
DEFAULT_SORT_ORDER_OPTION=ASC
DEFAULT_SORT_ORDER=asc
```

Use cursor pagination only when:

- the result set is large,
- ordering is stable,
- offsets become inefficient,
- or data changes frequently enough that offset pagination becomes misleading.

## i18n Message Keys

Use structured keys:

```text
api.responses.datasets.listFetched
api.responses.datasets.detailFetched
api.responses.geography.governoratesFetched
api.responses.geography.governorateFetched
api.responses.universities.universitiesFetched
api.errors.validationFailed
api.errors.notFound
api.errors.internalServerError
```

Every helper call should include a fallback:

```ts
return buildResponse(GovernorateDetailDto, {
  data: governorate,
  message: 'api.responses.geography.governorateFetched',
  fallbackMessage: 'Governorate fetched successfully',
});
```

## OpenAPI Documents

Scalar and Swagger should use generated OpenAPI documents. Do not maintain separate manual docs for endpoint schemas.

Current documents:

```text
OpenSyria Datasets API   /openapi.json
```

Filtered machine-readable documents:

```text
Core API        /openapi/core.json
Geography API   /openapi/geography.json
```

Rules:

- `/openapi.json` should remain available for tooling compatibility.
- `/docs` should use Scalar and expose the complete `/openapi.json` document.
- `/swagger-ui` can remain as a fallback for tools that prefer Swagger UI and should use the complete `/openapi.json` document.
- Use `cleanupOpenApiDoc` from `nestjs-zod` before serving documents.
- Filtered domain documents are optional machine-readable specs. They are filtered from one base document, not generated from separate app instances.
- Do not expose empty domain documents in Scalar. Add a filtered domain document only after the domain has public endpoints.
- Filtered documents should remove unused tags so clients do not see empty future sections.

## Security Headers and CORS

`datasets-api` is public and read-only, but it should still fail closed around browser and HTTP edge behavior.

Rules:

- Register Helmet through Fastify during app setup.
- Keep content security policy strict for API responses.
- Loosen CSP only for public docs assets when docs are enabled.
- Emit HSTS only when the app is actually served through HTTPS.
- Do not expose `X-Powered-By`.
- CORS preflight should allow only `GET`, `HEAD`, and `OPTIONS`.
- CORS preflight should allow only documented public request headers.
- Do not reflect arbitrary requested CORS methods or headers.
- Keep the default request body limit small because the API is read-only.

## Documentation Descriptions

Every public endpoint should have:

- a tag,
- a summary,
- a description when behavior is not obvious,
- a success response DTO,
- standard error responses.

Descriptions should mention:

- whether records are released or seed data,
- whether stable OpenSyria IDs are returned,
- whether source references are included,
- language behavior when relevant,
- filtering and pagination behavior.

Descriptions should not mention:

- Redis,
- internal cache keys,
- GitHub implementation details,
- file paths,
- private moderation workflows,
- future subscription logic.

## Controller Example

```ts
const GEOGRAPHY_TAG = 'Geography';

@Controller('geography/governorates')
export class GovernoratesController {
  constructor(private readonly governoratesService: GovernoratesService) {}

  @Get()
  @ApiQueryDto(GovernorateListQueryDto)
  @ApiPublic({
    type: GovernorateSummaryDto,
    tags: [GEOGRAPHY_TAG],
    summary: 'List governorates',
    description:
      'Returns released governorate records with stable OpenSyria IDs, localized names, source references, and external identifiers when available.',
    isPaginated: true,
  })
  async listGovernorates(
    @Query(new ZodValidationPipe(GovernorateListQueryDto)) query: GovernorateListQuery,
  ): Promise<ApiOffsetPaginatedResponse<GovernorateSummaryDto>> {
    const result = await this.governoratesService.listGovernorates(query);

    return buildOffsetPaginatedResponse(GovernorateSummaryDto, {
      data: result.items,
      totalRecords: result.totalRecords,
      options: query,
      message: 'api.responses.geography.governoratesFetched',
      fallbackMessage: 'Governorates fetched successfully',
    });
  }

  @Get(':governorateId')
  @ApiParamDto(GovernorateParamsDto)
  @ApiPublic({
    type: GovernorateDetailDto,
    tags: [GEOGRAPHY_TAG],
    summary: 'Get governorate details',
    description:
      'Returns one released governorate record with stable OpenSyria IDs, localized names, source references, and external identifiers when available.',
  })
  async getGovernorate(
    @Param(new ZodValidationPipe(GovernorateParamsDto)) params: GovernorateParams,
  ): Promise<ApiResponse<GovernorateDetail>> {
    return buildResponse({
      data: await this.governoratesService.getGovernorate(params.governorateId),
      message: 'api.responses.geography.governorateFetched',
      fallbackMessage: 'Governorate fetched successfully',
    });
  }
}
```

## Review Checklist

Before merging a new endpoint:

- [ ] Route path follows noun-based route naming.
- [ ] Controller method uses `list*`, `get*`, or another clear verb-resource name.
- [ ] Endpoint uses `ApiPublic`.
- [ ] Tag is one of the approved API tags.
- [ ] Summary is short and imperative.
- [ ] Description explains public behavior where useful.
- [ ] Request query/params use Zod DTOs.
- [ ] Response data uses a Zod DTO.
- [ ] Controller returns through response helpers.
- [ ] Error responses are documented through the shared decorator.
- [ ] Response message uses an i18n key with a fallback.
- [ ] Tests cover response shape and docs generation where relevant.
