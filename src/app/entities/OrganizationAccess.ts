export type OrganizationRole =
  | "OWNER"
  | "ADMIN"
  | "COMMERCIAL"
  | "OPERATIONS"
  | "FINANCE"
  | "VIEWER";

export type InvitableOrganizationRole = Exclude<OrganizationRole, "OWNER">;

export type OrganizationPermission =
  | "organization.read"
  | "organization.update"
  | "members.read"
  | "members.invite"
  | "members.update"
  | "members.remove"
  | "dashboard.read"
  | "customers.read"
  | "customers.create"
  | "customers.update"
  | "products.read"
  | "products.create"
  | "products.update"
  | "products.archive"
  | "quotations.read"
  | "quotations.create"
  | "quotations.update"
  | "quotations.delete"
  | "orders.read"
  | "orders.create"
  | "orders.update"
  | "purchases.read"
  | "purchases.create"
  | "purchases.update"
  | "receipts.manage"
  | "deliveries.manage"
  | "invoices.read"
  | "invoices.manage"
  | "payments.manage"
  | "finance.read"
  | "finance.manage"
  | "reports.export";

export type OrganizationMembership = {
  id: string;
  entityId: string;
  userId: string;
  role: OrganizationRole;
  status: "ACTIVE" | "SUSPENDED";
  invitedByUserId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type OrganizationMember = OrganizationMembership & {
  user: {
    name: string;
    email: string;
  };
};

export type OrganizationInvitation = {
  id: string;
  entityId: string;
  email: string;
  role: InvitableOrganizationRole;
  status: "PENDING" | "ACCEPTED" | "REVOKED";
  expiresAt: string;
  createdAt: string;
  isExpired: boolean;
};

export type OrganizationTeam = {
  members: OrganizationMember[];
  invitations: OrganizationInvitation[];
};
