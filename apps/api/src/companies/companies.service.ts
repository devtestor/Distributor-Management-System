import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { UpdateCompanyProfileDto } from "./dto/update-company-profile.dto";

@Injectable()
export class CompaniesService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async getProfile(companyId: string) {
    const company = await this.prisma.company.findUnique({
      where: { id: companyId }
    });

    if (!company) throw new NotFoundException("Company not found");
    return company;
  }

  async updateProfile(companyId: string, dto: UpdateCompanyProfileDto) {
    await this.getProfile(companyId);

    return this.prisma.company.update({
      where: { id: companyId },
      data: {
        ...dto,
        logoUrl: dto.logoUrl === "" ? null : dto.logoUrl
      }
    });
  }
}
