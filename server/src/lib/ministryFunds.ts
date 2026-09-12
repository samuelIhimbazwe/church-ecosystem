/** Finance-kit peer systems and their org-private vaults (aligned with SPA ministryFinanceSeed). */
export const MINISTRY_KIT_FUNDS = [
  { systemId: 'sys-youth', fundId: 'fund-youth', code: 'YOUTH', name: 'Youth Ministry Fund', orgId: 'ou-youth', orgName: 'Youth Ministry' },
  { systemId: 'sys-music', fundId: 'fund-music', code: 'MUSIC', name: 'Music Ministry Fund', orgId: 'ou-music', orgName: 'Music Ministry' },
  { systemId: 'sys-media', fundId: 'fund-media', code: 'MEDIA', name: 'Media Ministry Fund', orgId: 'ou-media', orgName: 'Media Ministry' },
  { systemId: 'sys-men', fundId: 'fund-men', code: 'MEN', name: 'Men Fellowship Fund', orgId: 'ou-men', orgName: 'Men Ministry' },
  { systemId: 'sys-women', fundId: 'fund-women', code: 'WOMEN', name: 'Women Fellowship Fund', orgId: 'ou-women', orgName: 'Women Ministry' },
  { systemId: 'sys-couples', fundId: 'fund-couples', code: 'COUPLES', name: 'Couples Ministry Fund', orgId: 'ou-couples', orgName: 'Couples Ministry' },
  { systemId: 'sys-children', fundId: 'fund-children', code: 'CHILDREN', name: 'Children Ministry Fund', orgId: 'ou-children', orgName: 'Children Ministry' },
  { systemId: 'sys-elderly', fundId: 'fund-elderly', code: 'ELDERLY', name: 'Elderly Ministry Fund', orgId: 'ou-elderly', orgName: 'Elderly Ministry' },
  { systemId: 'sys-evangelism', fundId: 'fund-evangelism', code: 'EVANGELISM', name: 'Evangelism Ministry Fund', orgId: 'ou-evangelism', orgName: 'Evangelism Ministry' },
  { systemId: 'sys-intercessors', fundId: 'fund-intercessors', code: 'INTERCESSORS', name: 'Intercessors Ministry Fund', orgId: 'ou-intercessors', orgName: 'Intercessors Ministry' },
] as const;

/** Dedicated ministry systems with a single org-private vault (not the shared peer kit UI). */
export const SPECIAL_MINISTRY_FUNDS = [
  {
    systemId: 'sys-worship',
    fundId: 'fund-worship',
    code: 'WORSHIP',
    name: 'Worship Team Fund',
    orgId: 'ou-worship',
    orgName: 'Worship Team',
  },
  {
    systemId: 'sys-deacon',
    fundId: 'fund-deacon',
    code: 'DEACON',
    name: 'Deacon Team Fund',
    orgId: 'ou-deacon-team',
    orgName: 'Deacon Team',
  },
  {
    systemId: 'sys-protocol',
    fundId: 'fund-protocol',
    code: 'PROT',
    name: 'Protocol Team Fund',
    orgId: 'ou-protocol',
    orgName: 'Protocol Team',
  },
] as const;

/** Seven named choirs under one Choir System — each has its own vault. */
export const CHOIR_PARENT_ORG = {
  id: 'ou-choir',
  name: 'Choir Ministry',
  systemId: 'sys-choir',
} as const;

export const CHOIR_FUNDS = [
  { orgId: 'ou-choir-ijwi', name: "Ijwi ry' umwami Yesu", fundId: 'fund-choir-ijwi', code: 'CHOIR-IJWI' },
  { orgId: 'ou-choir-elbethel', name: 'El bethel', fundId: 'fund-choir-elbethel', code: 'CHOIR-ELB' },
  { orgId: 'ou-choir-integuza', name: 'Integuza', fundId: 'fund-choir-integuza', code: 'CHOIR-INT' },
  { orgId: 'ou-choir-elim', name: 'Elim', fundId: 'fund-choir-elim', code: 'CHOIR-ELIM' },
  { orgId: 'ou-choir-beulah', name: 'Beulah', fundId: 'fund-choir-beulah', code: 'CHOIR-BEU' },
  { orgId: 'ou-choir-yerusalemu', name: 'Yerusalemu', fundId: 'fund-choir-yerusalemu', code: 'CHOIR-YER' },
  { orgId: 'ou-choir-hope', name: 'Hope', fundId: 'fund-choir-hope', code: 'CHOIR-HOPE' },
] as const;

export type MinistryKitSystemId = (typeof MINISTRY_KIT_FUNDS)[number]['systemId'];
