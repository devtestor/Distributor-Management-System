import { Body, Controller, Get, Param, Patch, Post, Req } from "@nestjs/common";
import type { AuthenticatedRequest } from "../common/authenticated-request";
import { Roles } from "../common/roles.decorator";
import { ChangePasswordDto } from "./dto/change-password.dto";
import { CreateUserDto } from "./dto/create-user.dto";
import { ResetPasswordDto } from "./dto/reset-password.dto";
import { UpdateUserDto } from "./dto/update-user.dto";
import { UsersService } from "./users.service";

@Controller()
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get("users")
  @Roles("OWNER", "ADMIN")
  list() {
    return this.usersService.listUsers();
  }

  @Get("users/roles")
  @Roles("OWNER", "ADMIN")
  roles() {
    return this.usersService.listRoles();
  }

  @Get("audit-logs")
  @Roles("OWNER")
  auditLogs() {
    return this.usersService.listAuditLogs();
  }

  @Post("users")
  @Roles("OWNER", "ADMIN")
  create(@Body() dto: CreateUserDto, @Req() request: AuthenticatedRequest) {
    return this.usersService.createUser(dto, request.user.id, request.user.role);
  }

  @Patch("users/:id")
  @Roles("OWNER", "ADMIN")
  update(@Param("id") id: string, @Body() dto: UpdateUserDto, @Req() request: AuthenticatedRequest) {
    return this.usersService.updateUser(id, dto, request.user.id, request.user.role);
  }

  @Post("users/:id/reset-password")
  @Roles("OWNER", "ADMIN")
  resetPassword(@Param("id") id: string, @Body() dto: ResetPasswordDto, @Req() request: AuthenticatedRequest) {
    return this.usersService.resetPassword(id, dto, request.user.id, request.user.role);
  }

  @Get("me")
  me(@Req() request: AuthenticatedRequest) {
    return this.usersService.getProfile(request.user.id);
  }

  @Post("me/change-password")
  changePassword(@Body() dto: ChangePasswordDto, @Req() request: AuthenticatedRequest) {
    return this.usersService.changePassword(request.user.id, dto);
  }
}
