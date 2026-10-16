import { apiClient } from "./client";

// ---------- Types ----------

export interface Invitation {
  id: string;
  tenant_id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  role_id: string | null;
  invited_by_user_id: string | null;
  expires_at: string;
  accepted_at: string | null;
  revoked_at: string | null;
  email_sent_at: string | null;
  created_at: string;
}

export interface InvitationCreate {
  email: string;
  role_id?: string;
  first_name?: string;
  last_name?: string;
}

export interface InvitationPreview {
  email: string;
  first_name: string | null;
  last_name: string | null;
  tenant_name: string;
  role_name: string | null;
  expires_at: string;
}

export interface InvitationAccept {
  token: string;
  password: string;
  confirm_password: string;
}

export interface AcceptedUser {
  id: string;
  tenant_id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  is_active: boolean;
  is_superuser: boolean;
}

// ---------- Admin endpoints ----------

export async function listInvitations(): Promise<Invitation[]> {
  const { data } = await apiClient.get<Invitation[]>("/invitations/");
  return data;
}

export async function createInvitation(payload: InvitationCreate): Promise<Invitation> {
  const { data } = await apiClient.post<Invitation>("/invitations/", payload);
  return data;
}

export async function resendInvitation(invitationId: string): Promise<Invitation> {
  const { data } = await apiClient.post<Invitation>(`/invitations/${invitationId}/resend`);
  return data;
}

export async function revokeInvitation(invitationId: string): Promise<void> {
  await apiClient.post(`/invitations/${invitationId}/revoke`);
}

// ---------- Public endpoints ----------

export async function previewInvitation(token: string): Promise<InvitationPreview> {
  const { data } = await apiClient.get<InvitationPreview>(
    `/invitations/token/${encodeURIComponent(token)}`,
  );
  return data;
}

export async function acceptInvitation(payload: InvitationAccept): Promise<AcceptedUser> {
  const { data } = await apiClient.post<AcceptedUser>("/invitations/accept", payload);
  return data;
}