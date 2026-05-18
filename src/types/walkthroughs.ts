export type WalkthroughStatus =
  | 'pending'
  | 'uploading'
  | 'queued'
  | 'training'
  | 'succeeded'
  | 'failed';

export interface WalkthroughJob {
  id: string;
  company_id: string;
  property_id: string;
  created_by: string;
  status: WalkthroughStatus;
  photo_count: number;
  runpod_job_id: string | null;
  error_message: string | null;
  progress_pct: number;
  share_token: string;
  splat_r2_key: string | null;
  preview_r2_key: string | null;
  splat_size_bytes: number | null;
  created_at: string;
  updated_at: string;
  started_at: string | null;
  completed_at: string | null;
}

export interface CreateWalkthroughJobInput {
  property_id: string;
  photo_count: number;
}

export interface UploadInitResponse {
  job_id: string;
  share_token: string;
  uploads: Array<{
    idx: number;
    key: string;
    url: string;
  }>;
}

export interface TourResponse {
  splat_url: string;
  expires_in: number;
  property: {
    address: string;
    city: string | null;
    state: string | null;
  } | null;
}

export const TERMINAL_STATUSES: WalkthroughStatus[] = ['succeeded', 'failed'];

export function isTerminal(status: WalkthroughStatus): boolean {
  return TERMINAL_STATUSES.includes(status);
}
