import { Body, Delete, Get, Param, Post, Query } from '@nestjs/common';
import { CurrentUser } from '../decorators/current-user.decorator';
import type { OwnedService, SyncedRecord } from './owned.service';
import type { OwnedDocument } from './owned.schema';

/**
 * The five synced collections all speak the same three verbs, so they share
 * one base controller rather than five copies of the same file.
 */
export abstract class OwnedController<T extends OwnedDocument> {
  protected constructor(protected readonly service: OwnedService<T>) {}

  /** Everything that changed since a timestamp — the pull half of sync. */
  @Get()
  list(@CurrentUser('userId') userId: string, @Query('since') since?: string): Promise<SyncedRecord[]> {
    return this.service.list(userId, Number.parseInt(since ?? '0', 10) || 0);
  }

  /** One record, or an array of them — the push half. */
  @Post()
  upsert(
    @CurrentUser('userId') userId: string,
    @Body() body: Record<string, unknown> | Record<string, unknown>[],
  ) {
    return Array.isArray(body)
      ? this.service.upsertMany(userId, body)
      : this.service.upsert(userId, body);
  }

  @Delete(':id')
  remove(@CurrentUser('userId') userId: string, @Param('id') id: string) {
    return this.service.remove(userId, id);
  }
}
