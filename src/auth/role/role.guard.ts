import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';

@Injectable()
export class RoleGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  matchRoles(roles: string[], userRole: string) {
    return roles.some((role) => role === userRole);
  }

  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    const role = this.reflector.get<string[]>('role', context.getHandler());
    if (!role) {
      return true;
    }
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    if (user.isRegistered === false) return false;
    return this.matchRoles(role, user.role);
  }
}
