import { Injectable, NotFoundException } from '@nestjs/common';
import { Model, Types } from 'mongoose';
import type { OwnedDocument } from './owned.schema';

export type OwnedRecord = OwnedDocument & { _id: Types.ObjectId };

/** What the device gets back: its own record, plus two sync fields. */
export type SyncedRecord = Record<string, unknown> & { _deleted: boolean; _syncedAt: number };

/**
 * Shared behaviour for every synced collection: upsert by client id,
 * soft delete, and "everything that changed since".
 *
 * Conflict resolution is deliberately the simplest thing that is correct for
 * one person with two devices: last writer wins, judged by the device clock
 * the record carries. There is no merge UI and there should not be one.
 */
@Injectable()
export class OwnedService<T extends OwnedDocument> {
  constructor(protected readonly model: Model<T>) {}

  private oid(userId: string) {
    return new Types.ObjectId(userId);
  }

  /** Reads the device's own timestamp out of the payload. */
  private stamp(data: Record<string, unknown>): number {
    const value = data.updatedAt ?? data.createdAt;
    return typeof value === 'number' ? value : Date.now();
  }

  async upsert(userId: string, data: Record<string, unknown>) {
    const clientId = String(data.id ?? '');
    if (!clientId) throw new NotFoundException('Record is missing an id.');

    const clientUpdatedAt = this.stamp(data);
    const existing = await this.model.findOne({ userId: this.oid(userId), clientId }).exec();

    // An older edit arriving late must not clobber a newer one.
    if (existing && (existing.clientUpdatedAt ?? 0) > clientUpdatedAt) {
      return existing;
    }

    return this.model
      .findOneAndUpdate(
        { userId: this.oid(userId), clientId },
        { userId: this.oid(userId), clientId, data, clientUpdatedAt, deleted: false },
        { upsert: true, new: true, setDefaultsOnInsert: true },
      )
      .exec();
  }

  async upsertMany(userId: string, records: Record<string, unknown>[]) {
    const results = await Promise.all(records.map((record) => this.upsert(userId, record)));
    return { accepted: results.length };
  }

  /**
   * Soft delete. A hard delete would resurrect the record the next time
   * another device pushed its stale copy.
   */
  async remove(userId: string, clientId: string) {
    await this.model
      .findOneAndUpdate(
        { userId: this.oid(userId), clientId },
        { deleted: true, clientUpdatedAt: Date.now(), data: { id: clientId } },
        { upsert: true },
      )
      .exec();
    return { ok: true as const };
  }

  async list(userId: string, since = 0): Promise<SyncedRecord[]> {
    const docs = await this.model
      .find({ userId: this.oid(userId), clientUpdatedAt: { $gt: since } })
      .sort({ clientUpdatedAt: 1 })
      .lean()
      .exec();

    return docs.map((doc) => ({
      ...(doc.data as Record<string, unknown>),
      _deleted: doc.deleted ?? false,
      _syncedAt: doc.clientUpdatedAt,
    }));
  }

  async count(userId: string) {
    return this.model.countDocuments({ userId: this.oid(userId), deleted: { $ne: true } }).exec();
  }

  async clear(userId: string) {
    const result = await this.model.deleteMany({ userId: this.oid(userId) }).exec();
    return { deleted: result.deletedCount ?? 0 };
  }
}
