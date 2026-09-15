import { apiFetch, isApiEnabled } from './index';

export type AttentionItem = {
  id: string;
  kind: 'PROGRAM' | 'EVENT' | 'PROJECT' | 'TASK' | 'FINANCE' | 'NOTICE';
  title: string;
  reason: string;
  href: string;
  rank: number;
  createdAt?: string;
};

export async function apiListAttention(): Promise<AttentionItem[]> {
  const res = await apiFetch<{ items: AttentionItem[] }>('/api/attention');
  return res.items;
}

export async function loadAttentionPreferApi(): Promise<AttentionItem[] | null> {
  if (!isApiEnabled()) return null;
  try {
    return await apiListAttention();
  } catch {
    return null;
  }
}
