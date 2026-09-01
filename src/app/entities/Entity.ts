import type {
  OrganizationPermission,
  OrganizationRole,
} from "./OrganizationAccess";

export type OrganizationLogo = {
  id: string;
  entityId: string;
  fileName: string;
  contentType: string;
  size: number;
  version: number;
  createdByUserId: string;
  createdAt?: string;
  url: string;
};

export type OrganizationProfile = {
  entityId: string;
  legalName: string;
  tradeName?: string;
  document?: string;
  email?: string;
  phone?: string;
  address?: string;
  primaryColor: string;
  logo: OrganizationLogo | null;
  createdAt?: string;
  updatedAt?: string;
};

export type Entity = {
  id: string;
  ownerUserId: string;
  name: string;
  type: "PF" | "PJ";
  color: string;
  createdAt: string;
  updatedAt: string;
  profile: OrganizationProfile;
  role: OrganizationRole;
  permissions: OrganizationPermission[];
};

export type OrganizationProfileResult = {
  organization: Omit<Entity, "profile" | "role" | "permissions">;
  profile: OrganizationProfile;
};
