import 'server-only';

function requireEnv(key: string): string {
  const v = process.env[key];
  if (!v) throw new Error(`Missing env var: ${key}`);
  return v;
}

export interface RunPodJobInput {
  job_id: string;
  bucket: string;
  photo_keys: string[];
  splat_key: string;
  webhook_url: string;
  photo_count: number;
}

export interface RunPodDispatchResult {
  id: string;
}

export interface RunPodStatusResult {
  status: 'IN_QUEUE' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED' | 'CANCELLED' | 'TIMED_OUT';
  output?: unknown;
  error?: string;
}

export const runpod = {
  async dispatch(input: RunPodJobInput): Promise<RunPodDispatchResult> {
    const apiKey = requireEnv('RUNPOD_API_KEY');
    const endpointId = requireEnv('RUNPOD_ENDPOINT_ID');

    const res = await fetch(`https://api.runpod.ai/v2/${endpointId}/run`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ input }),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`RunPod dispatch failed: ${res.status} ${text}`);
    }
    const json = await res.json();
    if (!json.id || typeof json.id !== 'string') {
      throw new Error(`RunPod returned no job id: ${JSON.stringify(json)}`);
    }
    return { id: json.id };
  },

  async status(runpodJobId: string): Promise<RunPodStatusResult> {
    const apiKey = requireEnv('RUNPOD_API_KEY');
    const endpointId = requireEnv('RUNPOD_ENDPOINT_ID');

    const res = await fetch(`https://api.runpod.ai/v2/${endpointId}/status/${runpodJobId}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    if (!res.ok) throw new Error(`RunPod status failed: ${res.status}`);
    return res.json();
  },

  async cancel(runpodJobId: string): Promise<void> {
    const apiKey = requireEnv('RUNPOD_API_KEY');
    const endpointId = requireEnv('RUNPOD_ENDPOINT_ID');
    await fetch(`https://api.runpod.ai/v2/${endpointId}/cancel/${runpodJobId}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}` },
    });
  },
};
