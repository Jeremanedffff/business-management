import { useEffect, useState } from "react";

import { listTenantSettings } from "../api/settings";

export interface CompanySettings {
  name: string;
  tin: string | null;
  vat_number: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  logo_url: string | null;
  bank_name: string | null;
  bank_account: string | null;
  bank_branch: string | null;
  invoice_footer: string | null;
  invoice_terms: string | null;
}

const DEFAULT_COMPANY: CompanySettings = {
  name: "Your Business",
  tin: null,
  vat_number: null,
  address: null,
  phone: null,
  email: null,
  logo_url: "/logo.png",
  bank_name: null,
  bank_account: null,
  bank_branch: null,
  invoice_footer: null,
  invoice_terms: null,
};

function toMap(settings: { key: string; value: string | null }[]): Record<string, string> {
  const m: Record<string, string> = {};
  for (const s of settings) {
    if (s.value !== null) m[s.key] = s.value;
  }
  return m;
}

export function useCompanySettings() {
  const [company, setCompany] = useState<CompanySettings>(DEFAULT_COMPANY);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listTenantSettings()
      .then((settings) => {
        const m = toMap(settings);
        setCompany({
          name: m["company_name"] || DEFAULT_COMPANY.name,
          tin: m["company_tin"] || null,
          vat_number: m["company_vat_number"] || null,
          address: m["company_address"] || null,
          phone: m["company_phone"] || null,
          email: m["company_email"] || null,
          logo_url: m["company_logo_url"] || null,
          bank_name: m["bank_name"] || null,
          bank_account: m["bank_account"] || null,
          bank_branch: m["bank_branch"] || null,
          invoice_footer: m["invoice_footer"] || null,
          invoice_terms: m["invoice_terms"] || null,
        });
      })
      .catch(() => {
        /* keep defaults on error */
      })
      .finally(() => setLoading(false));
  }, []);

  return { company, loading };
}


