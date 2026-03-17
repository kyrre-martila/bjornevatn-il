import { resolveApiUrl } from "./api";

export type MembershipSettings = {
  pageTitle: string;
  introText: string;
  benefitsTitle: string;
  benefits: string[];
  categoriesTitle: string;
  applicationTitle: string;
  confirmationTitle?: string | null;
  confirmationText?: string | null;
  contactEmail?: string | null;
  showBenefitsSection: boolean;
  showCategoriesSection: boolean;
  showApplicationForm: boolean;
};

export type MembershipCategory = {
  id: string;
  name: string;
  slug: string;
  description: string;
  priceLabel: string;
  ageGroup: string;
  sortOrder: number;
  isActive: boolean;
};

export async function getMembershipSettings(): Promise<MembershipSettings | null> {
  try {
    const response = await fetch(resolveApiUrl("/membership/settings"), { cache: "no-store" });
    if (!response.ok) return null;
    return (await response.json()) as MembershipSettings;
  } catch {
    return null;
  }
}

export async function listMembershipCategories(): Promise<MembershipCategory[]> {
  try {
    const response = await fetch(resolveApiUrl("/membership/categories"), { cache: "no-store" });
    if (!response.ok) return [];
    return (await response.json()) as MembershipCategory[];
  } catch {
    return [];
  }
}
