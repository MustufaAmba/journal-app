import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from './user.schema';

@Injectable()
export class UsersService {
  constructor(@InjectModel(User.name) private readonly model: Model<UserDocument>) {}

  findById(id: string) {
    return this.model.findById(id).exec();
  }

  findByEmail(email: string, withSecrets = false) {
    const query = this.model.findOne({ email: email.toLowerCase().trim() });
    // Secrets are `select: false`, so they have to be asked for explicitly.
    if (withSecrets) query.select('+passwordHash +refreshTokenHash');
    return query.exec();
  }

  findByGoogleId(googleId: string) {
    return this.model.findOne({ googleId }).exec();
  }

  create(input: Partial<User>) {
    return this.model.create({ ...input, email: input.email?.toLowerCase().trim() });
  }

  update(id: string, patch: Partial<User>) {
    return this.model.findByIdAndUpdate(id, patch, { new: true }).exec();
  }

  setRefreshTokenHash(id: string, refreshTokenHash: string | null) {
    return this.model
      .findByIdAndUpdate(id, { refreshTokenHash: refreshTokenHash ?? undefined, lastSeenAt: new Date() })
      .exec();
  }

  findWithRefreshToken(id: string) {
    return this.model.findById(id).select('+refreshTokenHash').exec();
  }

  findWithResetToken(email: string) {
    return this.model
      .findOne({ email: email.toLowerCase().trim() })
      .select('+passwordResetTokenHash +passwordResetExpiresAt')
      .exec();
  }
}
