import { Injectable, NotFoundException } from "@nestjs/common";
import { MembershipApplicationStatus, type Prisma } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";

export type CreateMembershipApplicationInput = {
  fullName: string;
  email: string;
  phone?: string;
  dateOfBirth?: Date;
  addressLine?: string;
  postalCode?: string;
  city?: string;
  guardianName?: string;
  guardianPhone?: string;
  guardianEmail?: string;
  membershipCategoryId: string;
  notes?: string;
};

@Injectable()
export class MembershipService {
  constructor(private readonly prisma: PrismaService) {}

  async getSettings() {
    const existing = await this.prisma.membershipSettings.findUnique({ where: { id: "membership-settings" } });
    if (existing) return existing;

    return this.prisma.membershipSettings.create({
      data: {
        id: "membership-settings",
        pageTitle: "Bli medlem i Bjørnevatn IL",
        introText: "Velkommen som medlem! Vi har lag og tilbud for barn, ungdom og voksne.",
        benefitsTitle: "Hvorfor bli medlem?",
        benefits: [
          "Trygt og inkluderende idrettsmiljø",
          "Kompetente trenere og frivillige",
          "Aktiviteter året rundt",
          "Fellesskap for hele familien",
        ],
        categoriesTitle: "Medlemskategorier",
        applicationTitle: "Søk medlemskap",
        confirmationTitle: "Takk for søknaden!",
        confirmationText: "Vi har mottatt din medlemskapssøknad og kontakter deg så snart som mulig.",
        contactEmail: "post@bjornevatnil.no",
        showBenefitsSection: true,
        showCategoriesSection: true,
        showApplicationForm: true,
      },
    });
  }

  async listActiveCategories() {
    return this.prisma.membershipCategory.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    });
  }

  async listCategories() {
    return this.prisma.membershipCategory.findMany({
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    });
  }

  async createApplication(input: CreateMembershipApplicationInput) {
    return this.prisma.membershipApplication.create({
      data: {
        ...input,
        fullName: input.fullName.trim(),
        email: input.email.trim().toLowerCase(),
        status: MembershipApplicationStatus.new,
      },
    });
  }

  async listApplications(filters: { status?: MembershipApplicationStatus; membershipCategoryId?: string }) {
    return this.prisma.membershipApplication.findMany({
      where: {
        status: filters.status,
        membershipCategoryId: filters.membershipCategoryId,
      },
      include: {
        membershipCategory: { select: { id: true, name: true, slug: true } },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async getApplication(id: string) {
    const application = await this.prisma.membershipApplication.findUnique({
      where: { id },
      include: { membershipCategory: true },
    });

    if (!application) {
      throw new NotFoundException("Membership application not found.");
    }

    return application;
  }

  async updateApplication(id: string, input: { status?: MembershipApplicationStatus; adminNotes?: string | null }) {
    await this.getApplication(id);

    const data: Prisma.MembershipApplicationUpdateInput = {};
    if (typeof input.status !== "undefined") {
      data.status = input.status;
    }
    if (typeof input.adminNotes !== "undefined") {
      data.adminNotes = input.adminNotes?.trim() || null;
    }

    return this.prisma.membershipApplication.update({ where: { id }, data, include: { membershipCategory: true } });
  }
}
