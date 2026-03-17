-- CreateEnum
CREATE TYPE "MembershipApplicationStatus" AS ENUM ('new', 'contacted', 'approved', 'rejected', 'archived');

-- CreateTable
CREATE TABLE "MembershipSettings" (
    "id" TEXT NOT NULL DEFAULT 'membership-settings',
    "pageTitle" TEXT NOT NULL,
    "introText" TEXT NOT NULL,
    "benefitsTitle" TEXT NOT NULL,
    "benefits" JSONB NOT NULL,
    "categoriesTitle" TEXT NOT NULL,
    "applicationTitle" TEXT NOT NULL,
    "confirmationTitle" TEXT,
    "confirmationText" TEXT,
    "contactEmail" TEXT,
    "showBenefitsSection" BOOLEAN NOT NULL DEFAULT true,
    "showCategoriesSection" BOOLEAN NOT NULL DEFAULT true,
    "showApplicationForm" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MembershipSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MembershipCategory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "priceLabel" TEXT NOT NULL,
    "ageGroup" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MembershipCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MembershipApplication" (
    "id" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "dateOfBirth" TIMESTAMP(3),
    "addressLine" TEXT,
    "postalCode" TEXT,
    "city" TEXT,
    "guardianName" TEXT,
    "guardianPhone" TEXT,
    "guardianEmail" TEXT,
    "membershipCategoryId" TEXT NOT NULL,
    "notes" TEXT,
    "status" "MembershipApplicationStatus" NOT NULL DEFAULT 'new',
    "adminNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MembershipApplication_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MembershipCategory_slug_key" ON "MembershipCategory"("slug");

-- CreateIndex
CREATE INDEX "MembershipCategory_isActive_sortOrder_idx" ON "MembershipCategory"("isActive", "sortOrder");

-- CreateIndex
CREATE INDEX "MembershipApplication_membershipCategoryId_idx" ON "MembershipApplication"("membershipCategoryId");

-- CreateIndex
CREATE INDEX "MembershipApplication_status_createdAt_idx" ON "MembershipApplication"("status", "createdAt");

-- AddForeignKey
ALTER TABLE "MembershipApplication" ADD CONSTRAINT "MembershipApplication_membershipCategoryId_fkey" FOREIGN KEY ("membershipCategoryId") REFERENCES "MembershipCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
