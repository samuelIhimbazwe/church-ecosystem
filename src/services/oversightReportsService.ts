import {
  assistanceReportsFor,
  hasOversightFinanceArtifacts,
  SHARED_REPORT_PACKS,
  sharedPacksFor,
} from '../data/oversightReportsSeed';
import type { SharedReportPack, SystemId } from '../domain/types';

function newId(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}`;
}

export const oversightReportsService = {
  listSharedPacks(systemId: SystemId) {
    return sharedPacksFor(systemId);
  },

  listAssistanceReports(systemId: SystemId) {
    return assistanceReportsFor(systemId);
  },

  hasPublishableSurface(systemId: SystemId) {
    return hasOversightFinanceArtifacts(systemId);
  },

  /** President / VP publishes a pack for Itorero oversight (local seed). */
  publishPack(input: {
    systemId: SystemId;
    title: string;
    summary: string;
    highlights?: string[];
    publishedByPersonId: string;
  }): SharedReportPack {
    const pack: SharedReportPack = {
      id: newId('srp'),
      systemId: input.systemId,
      title: input.title.trim(),
      summary: input.summary.trim(),
      highlights: input.highlights?.filter(Boolean),
      publishedAt: new Date().toISOString(),
      publishedByPersonId: input.publishedByPersonId,
      status: 'PUBLISHED',
    };
    SHARED_REPORT_PACKS.unshift(pack);
    return pack;
  },

  withdrawPack(packId: string): boolean {
    const pack = SHARED_REPORT_PACKS.find((p) => p.id === packId);
    if (!pack) return false;
    pack.status = 'WITHDRAWN';
    return true;
  },
};
