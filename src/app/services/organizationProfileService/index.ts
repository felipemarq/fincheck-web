import type {
  Entity,
  OrganizationProfileResult,
} from "@/app/entities/Entity";
import { httpClient } from "../httpClient";

export type UpdateOrganizationProfileInput = {
  entityId: string;
  name: string;
  type: Entity["type"];
  legalName: string;
  tradeName?: string | null;
  document?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  primaryColor: string;
};

export type UploadOrganizationLogoInput = {
  entityId: string;
  fileName: string;
  contentType: "image/jpeg" | "image/png" | "image/webp";
  dataBase64: string;
};

async function get(entityId: string) {
  const { data } = await httpClient.get<OrganizationProfileResult>(
    `/organizations/${entityId}/profile`
  );
  return data;
}

async function update({
  entityId,
  ...body
}: UpdateOrganizationProfileInput) {
  const { data } = await httpClient.patch<OrganizationProfileResult>(
    `/organizations/${entityId}/profile`,
    body
  );
  return data;
}

async function uploadLogo({
  entityId,
  ...body
}: UploadOrganizationLogoInput) {
  const { data } = await httpClient.post<OrganizationProfileResult>(
    `/organizations/${entityId}/logo`,
    body
  );
  return data;
}

async function removeLogo(entityId: string) {
  const { data } = await httpClient.delete<OrganizationProfileResult>(
    `/organizations/${entityId}/logo`
  );
  return data;
}

export const organizationProfileService = {
  get,
  update,
  uploadLogo,
  removeLogo,
};
