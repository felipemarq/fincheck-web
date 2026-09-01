import type {
  InvitableOrganizationRole,
  OrganizationInvitation,
  OrganizationMembership,
  OrganizationRole,
  OrganizationTeam,
} from "@/app/entities/OrganizationAccess";
import { httpClient } from "../httpClient";

export type PublicOrganizationInvitation = {
  organizationName: string;
  email: string;
  role: InvitableOrganizationRole;
  expiresAt: string;
  expired: boolean;
};

const getTeam = async (entityId: string) => {
  const { data } = await httpClient.get<OrganizationTeam>(
    `/entities/${entityId}/members`
  );
  return data;
};

const createInvitation = async (input: {
  entityId: string;
  email: string;
  role: InvitableOrganizationRole;
}) => {
  const { entityId, ...body } = input;
  const { data } = await httpClient.post<{
    invitation: OrganizationInvitation;
    token: string;
  }>(`/entities/${entityId}/invitations`, body);
  return data;
};

const getInvitation = async (token: string) => {
  const { data } = await httpClient.get<PublicOrganizationInvitation>(
    `/invitations/${encodeURIComponent(token)}`
  );
  return data;
};

const acceptInvitation = async (token: string) => {
  const { data } = await httpClient.post<{
    entityId: string;
    organizationName: string;
    role: OrganizationRole;
  }>(`/invitations/${encodeURIComponent(token)}/accept`);
  return data;
};

const updateMember = async (input: {
  entityId: string;
  membershipId: string;
  role: InvitableOrganizationRole;
}) => {
  const { entityId, membershipId, role } = input;
  const { data } = await httpClient.patch<{
    membership: OrganizationMembership;
  }>(`/entities/${entityId}/members/${membershipId}`, { role });
  return data.membership;
};

const removeMember = async (input: {
  entityId: string;
  membershipId: string;
}) => {
  await httpClient.delete(
    `/entities/${input.entityId}/members/${input.membershipId}`
  );
};

const revokeInvitation = async (input: {
  entityId: string;
  invitationId: string;
}) => {
  await httpClient.delete(
    `/entities/${input.entityId}/invitations/${input.invitationId}`
  );
};

export const organizationTeamService = {
  acceptInvitation,
  createInvitation,
  getInvitation,
  getTeam,
  removeMember,
  revokeInvitation,
  updateMember,
};
