export type AppRole =
  | 'admin'
  | 'direccion'
  | 'community'
  | 'produccion'
  | 'fotografia'
  | 'editor'
  | 'readonly';

export type CampaignStatus =
  | 'brief'
  | 'planning'
  | 'production'
  | 'editing'
  | 'review'
  | 'client_approval'
  | 'publishing'
  | 'closed';

export type FeedItemStatus =
  | 'idea'
  | 'planned'
  | 'script_ready'
  | 'in_production'
  | 'shot'
  | 'editing'
  | 'internal_review'
  | 'ready_for_client'
  | 'sent_to_client'
  | 'approved'
  | 'published'
  | 'changes_requested';

export type RiderStatus = 'draft' | 'ready' | 'sent' | 'approved';

export interface Profile {
  id: string;
  name: string;
  role: AppRole;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Client {
  id: string;
  name: string;
  business_name: string | null;
  industry: string | null;
  city: string | null;
  zone: string | null;
  address: string | null;
  instagram: string | null;
  facebook: string | null;
  tiktok: string | null;
  website: string | null;
  contact_name: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  logo_path: string | null;
  brand_colors: string[];
  status: 'prospect' | 'active' | 'paused' | 'finished';
  responsible_user_id: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface ObjectiveGeneral {
  id: string;
  client_id: string;
  contract_id: string | null;
  title: string;
  business_goal: string;
  primary_kpi: string;
  target_value: string;
  start_date: string;
  end_date: string;
  status: 'draft' | 'active' | 'paused' | 'closed';
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface SemesterPlan {
  id: string;
  objective_general_id: string;
  name: string;
  start_date: string;
  end_date: string;
  strategic_focus: string;
  pillars: string[];
  risks: string[];
  status: 'draft' | 'active' | 'paused' | 'closed';
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface MonthlyCampaign {
  id: string;
  objective_general_id: string;
  semester_plan_id: string;
  client_id: string;
  contract_id: string | null;
  package_id: string | null;
  month_date: string;
  name: string;
  monthly_goal: string;
  audience: string;
  tone: string;
  cta: string;
  promotion: string;
  status: CampaignStatus;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface FeedItem {
  id: string;
  campaign_id: string;
  content_type: string;
  internal_title: string;
  public_title: string;
  pillar: string;
  objective: string;
  hook: string;
  copy_base: string;
  script: string;
  cta: string;
  shotlist: string;
  format: string;
  grid_position: number;
  publish_date: string | null;
  production_date: string | null;
  status: FeedItemStatus;
  responsible_user_id: string | null;
  thumbnail_path: string | null;
  reference_links: string[];
  internal_notes: string;
  client_comments: string;
  is_extra: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProductionSession {
  id: string;
  campaign_id: string;
  client_id: string;
  date: string;
  start_time: string | null;
  end_time: string | null;
  location: string | null;
  estimated_duration: number | null;
  photo_responsible_id: string | null;
  video_responsible_id: string | null;
  director_responsible_id: string | null;
  client_support_person: string | null;
  client_contact: string | null;
  confirmation_status: 'pending' | 'confirmed' | 'done' | 'cancelled';
  rider_status: RiderStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Rider {
  id: string;
  campaign_id: string;
  session_id: string | null;
  title: string;
  content_json: RiderContent;
  pdf_url: string | null;
  status: RiderStatus;
  sent_at: string | null;
  approved_at: string | null;
  approved_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface RiderContent {
  cover: {
    campaign_name: string;
    client_name: string;
    period_label: string;
  };
  session: {
    date: string;
    start_time: string;
    end_time: string;
    duration: string;
    location: string;
  };
  deliverables: Array<{
    deliverable: string;
    format: string;
    eta: string;
  }>;
  objective_summary: string;
  objective_bullets: string[];
  client_responsibilities: string[];
  studio_responsibilities: string[];
  photo_line: Array<{
    area: string;
    responsible: string;
    spec: string;
  }>;
  reels_line: Array<{
    area: string;
    responsible: string;
    spec: string;
  }>;
  deadlines: Array<{
    item: string;
    due: string;
  }>;
  extra_requirements: string[];
  confirmation_text: string;
}

export interface PackageItem {
  id: string;
  package_id: string;
  item_type: string;
  quantity: number;
  periodicity: 'monthly' | 'weekly' | 'one_time';
  description: string | null;
  requires_production: boolean;
  requires_approval: boolean;
}
