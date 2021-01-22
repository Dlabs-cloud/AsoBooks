import { Controller, Get, Injectable, Query } from '@nestjs/common';
import { RequestPrincipalContext } from '../dlabs-nest-starter/security/decorators/request-principal.docorator';
import { RequestPrincipal } from '../dlabs-nest-starter/security/request-principal.service';
import { ActivityLogRepository } from '../dao/activity-log.repository';
import { PaginatedResponseDto } from '../dto/paginated-response.dto';
import { ActivityLogDto } from '../dto/activity-log.dto';
import { Connection } from 'typeorm/connection/Connection';
import { AssociationContext } from '../dlabs-nest-starter/security/annotations/association-context';
import { ApiResponseDto } from '../dto/api-response.dto';

@Controller('activities')
@AssociationContext()
export class ActivitiesController {

  constructor(private readonly connection: Connection) {
  }

  @Get()
  recentActivities(@RequestPrincipalContext() requestPrincipal: RequestPrincipal,
                   @Query('limit')limit: number = 20,
                   @Query('offset')offset: number = 0) {
    return this.connection
      .getCustomRepository(ActivityLogRepository)
      .findByAssociationAndLimitAndOffset(requestPrincipal.association, limit, offset)
      .then((response) => {
        const activityLogs = response[0];
        const count = response[1];
        const data = activityLogs.map(activityLog => {
          return {
            date: activityLog.updatedAt,
            description: activityLog.description,
            type: activityLog.activityType,
          };
        });
        const res: PaginatedResponseDto<ActivityLogDto> = {
          items: data,
          itemsPerPage: limit,
          offset: offset,
          total: count,
        };
        return Promise.resolve(new ApiResponseDto(res));
      });

  }
}