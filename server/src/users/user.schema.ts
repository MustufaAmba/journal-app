import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type UserDocument = HydratedDocument<User>;

@Schema({ timestamps: true, collection: 'users' })
export class User {
  @Prop({ required: true, lowercase: true, trim: true, unique: true, index: true })
  email!: string;

  @Prop({ trim: true })
  name?: string;

  /** Absent for accounts created through Google. */
  @Prop({ select: false })
  passwordHash?: string;

  @Prop()
  avatarUrl?: string;

  /** Hash of the current refresh token, so a token can be revoked server-side. */
  @Prop({ select: false })
  refreshTokenHash?: string;

  @Prop({ select: false })
  passwordResetTokenHash?: string;

  @Prop({ select: false })
  passwordResetExpiresAt?: Date;

  @Prop({ default: Date.now })
  lastSeenAt?: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);

/** Never let a hash reach a JSON response, whatever the caller selected. */
UserSchema.set('toJSON', {
  transform: (_doc, ret) => {
    const plain = ret as unknown as Record<string, unknown>;
    delete plain.passwordHash;
    delete plain.refreshTokenHash;
    delete plain.passwordResetTokenHash;
    delete plain.passwordResetExpiresAt;
    delete plain.__v;
    return plain;
  },
});
