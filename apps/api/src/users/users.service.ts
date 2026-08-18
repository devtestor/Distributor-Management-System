import { BadRequestException, ConflictException, ForbiddenException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";
import { PrismaService } from "../prisma/prisma.service";
import { paginationArgs, type PaginationQuery } from "../common/pagination";
import { publicUserSelect } from "../common/public-user-select";
import { ChangePasswordDto } from "./dto/change-password.dto";
import { CreateUserDto } from "./dto/create-user.dto";
import { ResetPasswordDto } from "./dto/reset-password.dto";
import { UpdateUserDto } from "./dto/update-user.dto";

@Injectable()
export class UsersService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  listRoles() {
    return this.prisma.role.findMany({
      orderBy: { name: "asc" }
    });
  }

  listAuditLogs(companyId: string, query?: PaginationQuery) {
    return this.prisma.auditLog.findMany({
      where: { companyId },
      include: {
        user: { select: publicUserSelect }
      },
      orderBy: { createdAt: "desc" },
      ...paginationArgs(query, 100, 500)
    });
  }

  async listUsers(companyId: string, query?: PaginationQuery) {
    const users = await this.prisma.user.findMany({
      where: { companyId },
      include: { role: true },
      orderBy: { createdAt: "asc" },
      ...paginationArgs(query)
    });

    return users.map((user) => ({
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      phone: user.phone,
      role: user.role.name,
      preferredLocale: user.preferredLocale,
      isActive: user.isActive,
      createdAt: user.createdAt
    }));
  }

  async getProfile(userId: string, companyId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId, companyId },
      include: { role: true, company: true }
    });

    if (!user) throw new NotFoundException("User not found");

    return {
      id: user.id,
      companyId: user.companyId,
      companyName: user.company.name,
      fullName: user.fullName,
      email: user.email,
      phone: user.phone,
      role: user.role.name,
      preferredLocale: user.preferredLocale
    };
  }

  async createUser(dto: CreateUserDto, actorUserId: string, actorRole: string, companyId: string) {
    const role = await this.prisma.role.findUnique({
      where: { name: dto.role }
    });

    if (!role) throw new BadRequestException("Role not found");
    this.assertOwnerOnly(actorRole, dto.role);

    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email }
    });
    if (existingUser) throw new ConflictException("A user with that email already exists");

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const user = await this.prisma.user.create({
      data: {
        roleId: role.id,
        companyId,
        fullName: dto.fullName,
        email: dto.email,
        phone: dto.phone,
        preferredLocale: dto.preferredLocale,
        passwordHash
      },
      include: { role: true }
    });

    await this.createAuditLog(actorUserId, companyId, "USER_CREATED", "User", user.id, {
      email: user.email,
      role: user.role.name
    });

    return {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      phone: user.phone,
      role: user.role.name,
      preferredLocale: user.preferredLocale,
      isActive: user.isActive,
      createdAt: user.createdAt,
      createdById: actorUserId
    };
  }

  async updateUser(userId: string, dto: UpdateUserDto, actorUserId: string, actorRole: string, companyId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId, companyId },
      include: { role: true }
    });
    if (!user) throw new NotFoundException("User not found");

    if (dto.role) {
      this.assertOwnerOnly(actorRole, dto.role);
    }

    if (dto.isActive === false) {
      if (userId === actorUserId) {
        throw new BadRequestException("You cannot deactivate your own account");
      }
      await this.assertLastActiveOwner(userId, user.role.name, companyId);
    }

    let roleId = user.roleId;
    if (dto.role && dto.role !== user.role.name) {
      const role = await this.prisma.role.findUnique({
        where: { name: dto.role }
      });
      if (!role) throw new BadRequestException("Role not found");
      roleId = role.id;
    }

    const updated = await this.prisma.user.update({
      where: { id: userId, companyId },
      data: {
        fullName: dto.fullName,
        phone: dto.phone,
        preferredLocale: dto.preferredLocale,
        isActive: dto.isActive,
        roleId
      },
      include: { role: true }
    });

    await this.createAuditLog(actorUserId, companyId, "USER_UPDATED", "User", updated.id, {
      role: updated.role.name,
      isActive: updated.isActive
    });

    return {
      id: updated.id,
      fullName: updated.fullName,
      email: updated.email,
      phone: updated.phone,
      role: updated.role.name,
      preferredLocale: updated.preferredLocale,
      isActive: updated.isActive,
      createdAt: updated.createdAt
    };
  }

  async resetPassword(userId: string, dto: ResetPasswordDto, actorUserId: string, actorRole: string, companyId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId, companyId },
      include: { role: true }
    });
    if (!user) throw new NotFoundException("User not found");

    this.assertOwnerOnly(actorRole, user.role.name);

    const passwordHash = await bcrypt.hash(dto.newPassword, 12);
    await this.prisma.user.update({
      where: { id: userId, companyId },
      data: { passwordHash }
    });

    await this.createAuditLog(actorUserId, companyId, "USER_PASSWORD_RESET", "User", user.id, {
      role: user.role.name
    });

    return {
      id: user.id,
      resetById: actorUserId
    };
  }

  async deleteUser(userId: string, actorUserId: string, actorRole: string, companyId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId, companyId },
      include: { role: true }
    });
    if (!user) throw new NotFoundException("User not found");

    if (userId === actorUserId) {
      throw new BadRequestException("You cannot delete your own account");
    }

    this.assertOwnerOnly(actorRole, user.role.name);

    if (user.isActive) {
      await this.assertLastActiveOwner(userId, user.role.name, companyId);
    }

    const relatedRecords = await this.countUserBusinessRecords(userId, companyId);
    if (relatedRecords > 0) {
      throw new BadRequestException("This account has business or audit records. Deactivate it instead.");
    }

    await this.prisma.user.delete({
      where: { id: userId, companyId }
    });

    await this.createAuditLog(actorUserId, companyId, "USER_DELETED", "User", user.id, {
      email: user.email,
      role: user.role.name
    });

    return {
      id: user.id,
      deletedById: actorUserId
    };
  }

  async changePassword(userId: string, companyId: string, dto: ChangePasswordDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId, companyId }
    });
    if (!user) throw new NotFoundException("User not found");

    const passwordMatches = await bcrypt.compare(dto.currentPassword, user.passwordHash);
    if (!passwordMatches) throw new BadRequestException("Current password is incorrect");

    const passwordHash = await bcrypt.hash(dto.newPassword, 12);
    await this.prisma.user.update({
      where: { id: userId, companyId },
      data: { passwordHash }
    });

    await this.createAuditLog(userId, companyId, "MY_PASSWORD_CHANGED", "User", user.id, null);

    return {
      id: user.id,
      message: "Password updated"
    };
  }

  private assertOwnerOnly(actorRole: string, targetRole: string) {
    if (targetRole === "OWNER" && actorRole !== "OWNER") {
      throw new ForbiddenException("Only an owner can assign or manage owner accounts");
    }
  }

  private async assertLastActiveOwner(userId: string, currentRole: string, companyId: string) {
    if (currentRole !== "OWNER") return;

    const activeOwners = await this.prisma.user.count({
      where: {
        isActive: true,
        companyId,
        role: { name: "OWNER" }
      }
    });

    if (activeOwners <= 1) {
      throw new BadRequestException("You cannot deactivate the last active owner");
    }
  }

  private async countUserBusinessRecords(userId: string, companyId: string) {
    const counts = await Promise.all([
      this.prisma.stockMovement.count({ where: { createdById: userId, companyId } }),
      this.prisma.invoice.count({ where: { createdById: userId, companyId } }),
      this.prisma.payment.count({ where: { receivedById: userId, companyId } }),
      this.prisma.emptyContainerMovement.count({ where: { createdById: userId, companyId } }),
      this.prisma.vehicle.count({ where: { driverId: userId, companyId } }),
      this.prisma.deliveryTrip.count({ where: { driverId: userId, companyId } }),
      this.prisma.expense.count({ where: { spentById: userId, companyId } }),
      this.prisma.auditLog.count({ where: { userId, companyId } }),
      this.prisma.productPriceHistory.count({ where: { changedById: userId, companyId } })
    ]);

    return counts.reduce((total, count) => total + count, 0);
  }

  private async createAuditLog(
    userId: string,
    companyId: string,
    action: string,
    entity: string,
    entityId: string,
    metadata: Record<string, unknown> | null
  ) {
    await this.prisma.auditLog.create({
      data: {
        userId,
        companyId,
        action,
        entity,
        entityId,
        metadata: (metadata as Prisma.InputJsonValue | null) ?? undefined
      }
    });
  }
}
