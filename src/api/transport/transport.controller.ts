import { Controller, Get, Inject, Param, Query } from '@nestjs/common';
import { I18n, type I18nContext } from 'nestjs-i18n';
import { ZodValidationPipe } from 'nestjs-zod';
import type { ApiResponse } from '../../common/dto/api-response.dto';
import type { ApiOffsetPaginatedResponse } from '../../common/dto/offset-pagination/offset-paginated-response.dto';
import { buildOffsetPaginatedResponse } from '../../common/helpers/build-offset-paginated-response';
import { buildResponse } from '../../common/helpers/build-response';
import { ApiParamDto, ApiQueryDto } from '../../decorators/api-request-dto';
import { ApiPublic } from '../../decorators/http-decorators';
import {
  type TransportLocation,
  type TransportLocationDetail,
  TransportLocationDetailDto,
  type TransportLocationList,
  TransportLocationListDto,
  type TransportLocationListQuery,
  TransportLocationListQueryDto,
  type TransportLocationParams,
  TransportLocationParamsDto,
  type TransportRouteSnapshot,
  type TransportRouteSnapshotDetail,
  TransportRouteSnapshotDetailDto,
  type TransportRouteSnapshotList,
  TransportRouteSnapshotListDto,
  type TransportRouteSnapshotListQuery,
  TransportRouteSnapshotListQueryDto,
  type TransportRouteSnapshotParams,
  TransportRouteSnapshotParamsDto,
  type TransportStatusSnapshot,
  type TransportStatusSnapshotDetail,
  TransportStatusSnapshotDetailDto,
  type TransportStatusSnapshotList,
  TransportStatusSnapshotListDto,
  type TransportStatusSnapshotListQuery,
  TransportStatusSnapshotListQueryDto,
  type TransportStatusSnapshotParams,
  TransportStatusSnapshotParamsDto,
} from './transport.dto';
import {
  transportLocationDetailResponseExample,
  transportLocationListResponseExample,
  transportRouteSnapshotDetailResponseExample,
  transportRouteSnapshotListResponseExample,
  transportStatusSnapshotDetailResponseExample,
  transportStatusSnapshotListResponseExample,
} from './transport.examples';
import { TransportService } from './transport.service';

type TransportLocationListResponse = ApiOffsetPaginatedResponse<
  TransportLocation,
  Omit<TransportLocationList, 'items' | 'pagination'>
>;
type TransportStatusSnapshotListResponse = ApiOffsetPaginatedResponse<
  TransportStatusSnapshot,
  Omit<TransportStatusSnapshotList, 'items' | 'pagination'>
>;
type TransportRouteSnapshotListResponse = ApiOffsetPaginatedResponse<
  TransportRouteSnapshot,
  Omit<TransportRouteSnapshotList, 'items' | 'pagination'>
>;

@Controller('transport')
export class TransportController {
  constructor(
    @Inject(TransportService)
    private readonly transportService: TransportService,
  ) {}

  @Get('locations')
  @ApiQueryDto(TransportLocationListQueryDto)
  @ApiPublic({
    type: TransportLocationListDto,
    tags: ['Transport'],
    summary: 'List transport locations',
    description:
      'Returns public transport and trade location records from the transport dataset, including stable IDs, coordinates, source references, administrative links, and conservative non-live operating status.',
    responseName: 'TransportLocationListResponse',
    example: transportLocationListResponseExample,
  })
  async listLocations(
    @Query(new ZodValidationPipe(TransportLocationListQueryDto))
    query: TransportLocationListQuery,
    @I18n() i18n: I18nContext,
  ): Promise<TransportLocationListResponse> {
    const result = await this.transportService.listLocations(query);

    return buildOffsetPaginatedResponse({
      i18n,
      items: result.items,
      totalRecords: result.pagination.totalRecords,
      options: query,
      extraData: {
        dataset: result.dataset,
        release: result.release,
      },
      message: 'api.responses.transport.locationsFetched',
      fallbackMessage: 'Transport locations fetched successfully',
    });
  }

  @Get('locations/:locationId')
  @ApiParamDto(TransportLocationParamsDto)
  @ApiPublic({
    type: TransportLocationDetailDto,
    tags: ['Transport'],
    summary: 'Get transport location details',
    description:
      'Returns one public transport location with dataset release context and source attribution. Dated operational observations remain separate in the status snapshot endpoints.',
    responseName: 'TransportLocationDetailResponse',
    example: transportLocationDetailResponseExample,
  })
  async getLocation(
    @Param(new ZodValidationPipe(TransportLocationParamsDto)) params: TransportLocationParams,
    @I18n() i18n: I18nContext,
  ): Promise<ApiResponse<TransportLocationDetail>> {
    return buildResponse({
      i18n,
      data: await this.transportService.getLocation(params.locationId),
      message: 'api.responses.transport.locationFetched',
      fallbackMessage: 'Transport location fetched successfully',
    });
  }

  @Get('status-snapshots')
  @ApiQueryDto(TransportStatusSnapshotListQueryDto)
  @ApiPublic({
    type: TransportStatusSnapshotListDto,
    tags: ['Transport'],
    summary: 'List transport status snapshots',
    description:
      'Returns dated public status observations for transport locations. These records are source-specific snapshots and are not live operating guarantees.',
    responseName: 'TransportStatusSnapshotListResponse',
    example: transportStatusSnapshotListResponseExample,
  })
  async listStatusSnapshots(
    @Query(new ZodValidationPipe(TransportStatusSnapshotListQueryDto))
    query: TransportStatusSnapshotListQuery,
    @I18n() i18n: I18nContext,
  ): Promise<TransportStatusSnapshotListResponse> {
    const result = await this.transportService.listStatusSnapshots(query);

    return buildOffsetPaginatedResponse({
      i18n,
      items: result.items,
      totalRecords: result.pagination.totalRecords,
      options: query,
      extraData: {
        dataset: result.dataset,
        release: result.release,
      },
      message: 'api.responses.transport.statusSnapshotsFetched',
      fallbackMessage: 'Transport status snapshots fetched successfully',
    });
  }

  @Get('status-snapshots/:statusSnapshotId')
  @ApiParamDto(TransportStatusSnapshotParamsDto)
  @ApiPublic({
    type: TransportStatusSnapshotDetailDto,
    tags: ['Transport'],
    summary: 'Get transport status snapshot details',
    description:
      'Returns one dated transport status observation with dataset release context and source attribution.',
    responseName: 'TransportStatusSnapshotDetailResponse',
    example: transportStatusSnapshotDetailResponseExample,
  })
  async getStatusSnapshot(
    @Param(new ZodValidationPipe(TransportStatusSnapshotParamsDto))
    params: TransportStatusSnapshotParams,
    @I18n() i18n: I18nContext,
  ): Promise<ApiResponse<TransportStatusSnapshotDetail>> {
    return buildResponse({
      i18n,
      data: await this.transportService.getStatusSnapshot(params.statusSnapshotId),
      message: 'api.responses.transport.statusSnapshotFetched',
      fallbackMessage: 'Transport status snapshot fetched successfully',
    });
  }

  @Get('route-snapshots')
  @ApiQueryDto(TransportRouteSnapshotListQueryDto)
  @ApiPublic({
    type: TransportRouteSnapshotListDto,
    tags: ['Transport'],
    summary: 'List transport route snapshots',
    description:
      'Returns high-level dated route and corridor observations from public sources. These records intentionally omit geometry, convoy detail, checkpoints, and live routing instructions.',
    responseName: 'TransportRouteSnapshotListResponse',
    example: transportRouteSnapshotListResponseExample,
  })
  async listRouteSnapshots(
    @Query(new ZodValidationPipe(TransportRouteSnapshotListQueryDto))
    query: TransportRouteSnapshotListQuery,
    @I18n() i18n: I18nContext,
  ): Promise<TransportRouteSnapshotListResponse> {
    const result = await this.transportService.listRouteSnapshots(query);

    return buildOffsetPaginatedResponse({
      i18n,
      items: result.items,
      totalRecords: result.pagination.totalRecords,
      options: query,
      extraData: {
        dataset: result.dataset,
        release: result.release,
      },
      message: 'api.responses.transport.routeSnapshotsFetched',
      fallbackMessage: 'Transport route snapshots fetched successfully',
    });
  }

  @Get('route-snapshots/:routeSnapshotId')
  @ApiParamDto(TransportRouteSnapshotParamsDto)
  @ApiPublic({
    type: TransportRouteSnapshotDetailDto,
    tags: ['Transport'],
    summary: 'Get transport route snapshot details',
    description:
      'Returns one high-level dated route or corridor observation with dataset release context and source attribution.',
    responseName: 'TransportRouteSnapshotDetailResponse',
    example: transportRouteSnapshotDetailResponseExample,
  })
  async getRouteSnapshot(
    @Param(new ZodValidationPipe(TransportRouteSnapshotParamsDto))
    params: TransportRouteSnapshotParams,
    @I18n() i18n: I18nContext,
  ): Promise<ApiResponse<TransportRouteSnapshotDetail>> {
    return buildResponse({
      i18n,
      data: await this.transportService.getRouteSnapshot(params.routeSnapshotId),
      message: 'api.responses.transport.routeSnapshotFetched',
      fallbackMessage: 'Transport route snapshot fetched successfully',
    });
  }
}
