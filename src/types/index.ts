export interface Lead {
  id: string;
  business_name: string;
  category: string;
  phone_e164: string | null;
  phone_valid: boolean;
  phone_type: string | null;
  phone_confidence: number;
  email: string | null;
  email_valid: boolean;
  email_catchall: boolean;
  email_disposable: boolean;
  email_confidence: number;
  website_url: string | null;
  website_domain: string | null;
  address: string | null;
  city: string;
  country: string;
  source: string[];
  source_urls: Record<string, string> | null;
  lead_score: number;
  tech_stack: Record<string, string> | null;
  has_ssl: boolean | null;
  is_mobile_friendly: boolean | null;
  status: "new" | "contacted" | "qualified" | "follow_up" | "revisit_later" | "converted" | "not_interested" | "closed";
  assigned_to?: string | null;
  assigned_to_name?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Campaign {
  id: string;
  name: string;
  sources: string[];
  cities: string[];
  categories: string[];
  status: string;
  jobs_total: number;
  jobs_completed: number;
  leads_found: number;
  auto_rescrape: boolean;
  drop_no_contact: boolean;
  assigned_to?: string | null;
  created_at: string;
  updated_at: string;
}

export interface ScrapeJob {
  id: string;
  source: string;
  city: string;
  category: string;
  status: "pending" | "running" | "completed" | "failed" | "dead";
  attempt_count: number;
  max_attempts: number;
  timeout_seconds: number;
  leads_found: number;
  last_error: string | null;
  started_at: string | null;
  completed_at: string | null;
  died_at: string | null;
  campaign_id: string;
  created_at: string;
  updated_at: string;
}

export interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: PaginationMeta;
}

export interface LeadFilters {
  page?: number;
  page_size?: number;
  city?: string;
  status?: string;
  source?: string;
  score_gte?: number;
  has_phone?: boolean;
}

export interface CreateCampaignPayload {
  name: string;
  sources: string[];
  cities: string[];
  categories: string[];
  auto_rescrape?: boolean;
  drop_no_contact?: boolean;
}

export interface LeadActivity {
  lead_id: string;
  business_name: string;
  phone_e164: string | null;
  email: string | null;
  city: string;
  category: string;
  website_url: string | null;
  has_ssl: boolean | null;
  is_mobile_friendly: boolean | null;
  source: string[];
  activity_id: string;
  status: string;
  notes: string | null;
  next_action: string | null;
  next_follow_up: string | null;
  last_contact: string | null;
  updated_at: string;
}

export interface EmployeeStats {
  employee_id: string;
  employee_name: string;
  total_leads: number;
  contacted: number;
  conversions: number;
  overdue_follow_ups: number;
  activity_this_week: number;
}
