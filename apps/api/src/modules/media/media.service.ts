import { Injectable, NotFoundException } from '@nestjs/common';
import { type AddDerivativeInput, type RegisterMediaInput, newId } from '@singha/contracts';
import { PrismaService } from '../../prisma/prisma.service';
import { UnitOfWork } from '../../shared/persistence/unit-of-work';
import { toActor } from '../../shared/auth/actor';
import { type Principal } from '../../shared/auth/principal';

/**
 * Media module (docs/06): originals are IMMUTABLE; enhanced/processed media are
 * separate derivative rows that record their source for provenance.
 */
@Injectable()
export class MediaService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly uow: UnitOfWork,
  ) {}

  async registerMedia(principal: Principal, assetId: string, input: RegisterMediaInput) {
    const asset = await this.prisma.asset.findUnique({ where: { id: assetId } });
    if (!asset) throw new NotFoundException('Asset not found');

    const actor = toActor(principal);
    const id = newId();
    return this.uow.execute(actor, async (ctx) => {
      const media = await ctx.tx.mediaObject.create({
        data: {
          id,
          assetId,
          kind: input.kind,
          storageKey: input.storageKey,
          status: 'ready',
          isOriginal: true,
        },
      });
      ctx.audit({ action: 'MEDIA_REGISTERED', targetType: 'Asset', targetId: assetId });
      return media;
    });
  }

  async addDerivative(principal: Principal, mediaId: string, input: AddDerivativeInput) {
    const source = await this.prisma.mediaObject.findUnique({ where: { id: mediaId } });
    if (!source) throw new NotFoundException('Source media not found');

    const actor = toActor(principal);
    const id = newId();
    return this.uow.execute(actor, async (ctx) => {
      const derivative = await ctx.tx.mediaDerivative.create({
        data: { id, sourceMediaId: mediaId, method: input.method, storageKey: input.storageKey },
      });
      ctx.audit({
        action: 'MEDIA_DERIVATIVE_ADDED',
        targetType: 'MediaObject',
        targetId: mediaId,
        after: { method: input.method },
      });
      return derivative;
    });
  }
}
