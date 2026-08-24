import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export type AuthenticatedUser = { userId: string; email?: string };

/** Pulls the user the JWT guard attached to the request. */
export const CurrentUser = createParamDecorator(
  (data: keyof AuthenticatedUser | undefined, context: ExecutionContext) => {
    const request = context.switchToHttp().getRequest<{ user: AuthenticatedUser }>();
    return data ? request.user?.[data] : request.user;
  },
);
