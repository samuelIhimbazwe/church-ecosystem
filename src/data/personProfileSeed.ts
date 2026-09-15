import type {
  PersonBaptismRecord,
  PersonDocumentMeta,
  PersonFamilyLink,
  PersonMarriageRecord,
  PersonTimelineEvent,
} from '../domain/types';

/** Pastoral 360 data — visible only under FULL profile scope. */
export let PERSON_FAMILY_LINKS: PersonFamilyLink[] = [
  {
    id: 'pfl-pastor-spouse',
    personId: 'p-pastor',
    relatedPersonId: 'p-secretary',
    relation: 'OTHER',
    notes: 'Demo link — not literal spouse',
  },
  {
    id: 'pfl-patrick-parent',
    personId: 'p-member',
    relatedPersonId: 'p-choir-pres',
    relation: 'PARENT',
    notes: 'Spiritual mentoring household demo',
  },
];

export let PERSON_BAPTISMS: PersonBaptismRecord[] = [
  {
    personId: 'p-pastor',
    baptizedOn: '1995-06-12',
    place: 'ADEPR Kigali',
    mode: 'IMMERSION',
    ministerName: 'Rev. Ntigurirwa',
    certificateRef: 'BAP-1995-041',
  },
  {
    personId: 'p-secretary',
    baptizedOn: '2008-04-20',
    place: 'ADEPR Kacyiru',
    mode: 'IMMERSION',
    ministerName: 'Rev. Habimana',
    certificateRef: 'BAP-2008-112',
  },
  {
    personId: 'p-member',
    baptizedOn: '2024-08-18',
    place: 'ADEPR Kacyiru',
    mode: 'IMMERSION',
    ministerName: 'Rev. Habimana',
    certificateRef: 'BAP-2024-088',
    notes: 'Baptized after new members class',
  },
  {
    personId: 'p-choir-leader',
    baptizedOn: '2010-03-14',
    place: 'ADEPR Remera',
    mode: 'IMMERSION',
    ministerName: 'Rev. Mukamana',
    certificateRef: 'BAP-2010-033',
  },
  {
    personId: 'p-assistant',
    baptizedOn: '2001-11-04',
    place: 'ADEPR Butare',
    mode: 'IMMERSION',
    ministerName: 'Rev. Niyonzima',
    certificateRef: 'BAP-2001-019',
  },
];

export let PERSON_MARRIAGES: PersonMarriageRecord[] = [
  {
    personId: 'p-pastor',
    spouseName: 'Mrs. Habimana',
    marriedOn: '2005-09-10',
    place: 'ADEPR Kacyiru',
    status: 'MARRIED',
    certificateRef: 'MAR-2005-022',
  },
  {
    personId: 'p-secretary',
    spouseName: 'Mr. Uwase',
    marriedOn: '2016-02-14',
    place: 'ADEPR Kacyiru',
    status: 'MARRIED',
    certificateRef: 'MAR-2016-007',
  },
  {
    personId: 'p-choir-pres',
    spouseName: 'Mr. Uwimana',
    marriedOn: '2012-07-21',
    place: 'Kigali',
    status: 'MARRIED',
    certificateRef: 'MAR-2012-055',
  },
];

export let PERSON_TIMELINE: PersonTimelineEvent[] = [
  {
    id: 'ptl-patrick-1',
    personId: 'p-member',
    at: '2024-05-01',
    kind: 'MEMBERSHIP',
    title: 'Joined ADEPR Kacyiru',
    detail: 'Received as church member',
  },
  {
    id: 'ptl-patrick-2',
    personId: 'p-member',
    at: '2024-06-01',
    kind: 'MINISTRY',
    title: 'Joined Choir',
    detail: 'Bass section',
  },
  {
    id: 'ptl-patrick-3',
    personId: 'p-member',
    at: '2024-08-18',
    kind: 'BAPTISM',
    title: 'Baptism',
    detail: 'Certificate BAP-2024-088',
  },
  {
    id: 'ptl-patrick-4',
    personId: 'p-member',
    at: '2025-01-01',
    kind: 'MINISTRY',
    title: 'Choir Family Leader (Alpha)',
    detail: 'Team leadership appointment',
  },
  {
    id: 'ptl-patrick-5',
    personId: 'p-member',
    at: '2026-08-01',
    kind: 'MINISTRY',
    title: 'Protocol lead — Thanksgiving Concert',
    detail: 'Temporary event assignment',
  },
  {
    id: 'ptl-eric-1',
    personId: 'p-choir-leader',
    at: '2020-02-01',
    kind: 'MINISTRY',
    title: 'Joined Choir ministry',
  },
  {
    id: 'ptl-eric-2',
    personId: 'p-choir-leader',
    at: '2022-01-01',
    kind: 'MINISTRY',
    title: 'Appointed Music Director',
  },
  {
    id: 'ptl-grace-1',
    personId: 'p-secretary',
    at: '2019-03-01',
    kind: 'MEMBERSHIP',
    title: 'Appointed Church Secretary',
  },
];

export let PERSON_DOCUMENTS: PersonDocumentMeta[] = [
  {
    id: 'pdoc-patrick-bap',
    personId: 'p-member',
    label: 'Baptism certificate',
    kind: 'CERTIFICATE',
    issuedOn: '2024-08-18',
    note: 'BAP-2024-088',
  },
  {
    id: 'pdoc-patrick-id',
    personId: 'p-member',
    label: 'National ID copy',
    kind: 'ID',
    issuedOn: '2023-01-10',
  },
  {
    id: 'pdoc-pastor-ord',
    personId: 'p-pastor',
    label: 'Ordination letter',
    kind: 'LETTER',
    issuedOn: '2018-01-01',
  },
  {
    id: 'pdoc-grace-mar',
    personId: 'p-secretary',
    label: 'Marriage certificate',
    kind: 'CERTIFICATE',
    issuedOn: '2016-02-14',
    note: 'MAR-2016-007',
  },
];

export function upsertBaptism(record: PersonBaptismRecord) {
  const i = PERSON_BAPTISMS.findIndex((b) => b.personId === record.personId);
  if (i >= 0) PERSON_BAPTISMS[i] = record;
  else PERSON_BAPTISMS = [...PERSON_BAPTISMS, record];
}

export function upsertMarriage(record: PersonMarriageRecord) {
  const i = PERSON_MARRIAGES.findIndex((m) => m.personId === record.personId);
  if (i >= 0) PERSON_MARRIAGES[i] = record;
  else PERSON_MARRIAGES = [...PERSON_MARRIAGES, record];
}

export function pushFamilyLink(link: PersonFamilyLink) {
  PERSON_FAMILY_LINKS = [link, ...PERSON_FAMILY_LINKS];
}

export function removeFamilyLink(id: string) {
  PERSON_FAMILY_LINKS = PERSON_FAMILY_LINKS.filter((l) => l.id !== id);
}

export function pushTimelineEvent(event: PersonTimelineEvent) {
  PERSON_TIMELINE = [event, ...PERSON_TIMELINE];
}

export function pushDocument(doc: PersonDocumentMeta) {
  PERSON_DOCUMENTS = [doc, ...PERSON_DOCUMENTS];
}
