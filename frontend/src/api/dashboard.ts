import { apiClient } from "./client";

export interface DashboardSummary {
  total_invoices: number;
  total_revenue: string;
  total_paid: string;
  outstanding: string;
  paid_count: number;
  unpaid_count: number;
  total_customers: number;
  total_products: number;
}

export interface RecentInvoice {
  id: string;
  invoice_number: string;
  reference: string | null;
  issue_date: string;
  total: string;
  amount_paid: string;
}

export interface RevenueByMonth {
  month: string;
  total: string;
}

export interface TopCustomer {
  id: string;
  name: string;
  code: string;
  total: string;
  invoice_count: number;
}

export interface SystemStats {
  tenants: {
    total: number;
    active: number;
    inactive: number;
  };
  users: {
    total: number;
    active: number;
    inactive: number;
    superusers: number;
    business_admins: number;
  };
  invoices: {
    total: number;
    paid: number;
    unpaid: number;
    total_revenue: number;
  };
}

export async function getSummary(): Promise<DashboardSummary> {
  const { data } = await apiClient.get<DashboardSummary>("/dashboard/summary");
  return data;
}

export async function getRecentInvoices(): Promise<RecentInvoice[]> {
  const { data } = await apiClient.get<RecentInvoice[]>("/dashboard/recent-invoices");
  return data;
}

export async function getRevenueByMonth(): Promise<RevenueByMonth[]> {
  const { data } = await apiClient.get<RevenueByMonth[]>("/dashboard/revenue-by-month");
  return data;
}

export async function getTopCustomers(): Promise<TopCustomer[]> {
  const { data } = await apiClient.get<TopCustomer[]>("/dashboard/top-customers");
  return data;
}

export async function getSystemStats(): Promise<SystemStats> {
  const { data } = await apiClient.get<SystemStats>("/dashboard/system-stats");
  return data;
}
