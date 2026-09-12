import { ACCOUNTS, PEOPLE } from '../data/seed';
import {
  PERSON_BAPTISMS,
  PERSON_DOCUMENTS,
  PERSON_FAMILY_LINKS,
  PERSON_MARRIAGES,
  PERSON_TIMELINE,
  pushDocument,
  pushFamilyLink,
  pushTimelineEvent,
  removeFamilyLink,
  upsertBaptism,
  upsertMarriage,
} from '../data/personProfileSeed';
import {
  apiLogin,
  ApiError,
  isApiEnabled,
  isApiFallbackEnabled,
  setApiToken,
} from '../api';
import {
  clearSession,
  readSession,
  writeSession,
} from '../domain/sso';
import type {
  FamilyRelation,
  Person,
  PersonBaptismRecord,
  PersonDocumentMeta,
  PersonMarriageRecord,
  PersonTimelineEvent,
  SessionState,
  SystemId,
  UserAccount,
} from '../domain/types';
import { accessService } from './accessService';
import { setActiveChoirOrgUnitId as syncChoirScope } from './choirScope';

const ACCOUNT_KEY = 'adepr.accountId';
const API_ACCOUNT_KEY = 'adepr.apiAccount';
const AUTH_SOURCE_KEY = 'adepr.authSource';

type AuthSource = 'local' | 'api';

function preserveChoirSession(
  patch: Omit<SessionState, 'activeChoirOrgUnitId'> &
    Partial<Pick<SessionState, 'activeChoirOrgUnitId'>>,
): SessionState {
  const prev = readSession();
  const next: SessionState = {
    ...patch,
    activeChoirOrgUnitId:
      patch.activeChoirOrgUnitId ?? prev?.activeChoirOrgUnitId,
  };
  writeSession(next);
  if (next.activeChoirOrgUnitId) {
    syncChoirScope(next.activeChoirOrgUnitId);
  }
  return next;
}

function readApiAccountSnapshot(): UserAccount | null {
  try {
    const raw = localStorage.getItem(API_ACCOUNT_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as UserAccount;
  } catch {
    return null;
  }
}

function writeApiAccountSnapshot(account: UserAccount): void {
  localStorage.setItem(API_ACCOUNT_KEY, JSON.stringify(account));
  localStorage.setItem(AUTH_SOURCE_KEY, 'api');
}

function clearApiAuth(): void {
  localStorage.removeItem(API_ACCOUNT_KEY);
  localStorage.removeItem(AUTH_SOURCE_KEY);
  setApiToken(null);
}

function findAccount(id: string | null): UserAccount | null {
  if (!id) return null;
  const fromSeed = ACCOUNTS.find((a) => a.id === id);
  if (fromSeed) return fromSeed;
  const api = readApiAccountSnapshot();
  return api?.id === id ? api : null;
}

function ensurePersonMirror(person: {
  id: string;
  fullName: string;
  preferredName?: string | null;
  status: string;
}): void {
  if (PEOPLE.some((p) => p.id === person.id)) return;
  PEOPLE.push({
    id: person.id,
    fullName: person.fullName,
    preferredName: person.preferredName ?? undefined,
    status: (person.status as Person['status']) || 'ACTIVE',
    createdAt: new Date().toISOString().slice(0, 10),
  });
}

function establishSession(
  account: UserAccount,
  targetSystemId: SystemId,
  entryMode: SessionState['entryMode'],
): UserAccount | null {
  const enter = accessService.authorize(
    account.personId,
    targetSystemId,
    'SYSTEM',
    'ENTER',
    { audit: true, entryMode },
  );
  if (!enter.allowed) return null;

  localStorage.setItem(ACCOUNT_KEY, account.id);
  preserveChoirSession({
    accountId: account.id,
    currentSystemId: targetSystemId,
    entryMode,
  });
  return account;
}

function loginLocal(
  username: string,
  password: string,
  targetSystemId: SystemId,
): UserAccount | null {
  const account = ACCOUNTS.find(
    (a) =>
      a.username === username.trim().toLowerCase() &&
      a.password === password,
  );
  if (!account) return null;
  clearApiAuth();
  localStorage.setItem(AUTH_SOURCE_KEY, 'local');
  const entryMode: SessionState['entryMode'] =
    targetSystemId === 'sys-main' ? 'main' : 'direct';
  return establishSession(account, targetSystemId, entryMode);
}

export const authService = {
  authSource(): AuthSource {
    return localStorage.getItem(AUTH_SOURCE_KEY) === 'api' ? 'api' : 'local';
  },

  isApiMode(): boolean {
    return isApiEnabled();
  },

  /**
   * Prefer API when VITE_API_URL is set; fall back to in-memory seed login
   * unless VITE_API_FALLBACK=false.
   */
  async login(
    username: string,
    password: string,
    targetSystemId: SystemId = 'sys-main',
  ): Promise<UserAccount | null> {
    if (isApiEnabled()) {
      try {
        const result = await apiLogin(username, password, targetSystemId);
        ensurePersonMirror(result.person);
        const account: UserAccount = {
          id: result.account.id,
          personId: result.account.personId,
          username: result.account.username,
          password: '',
        };
        writeApiAccountSnapshot(account);
        const entryMode: SessionState['entryMode'] =
          targetSystemId === 'sys-main' ? 'main' : 'direct';
        const sessionAccount = establishSession(
          account,
          targetSystemId,
          entryMode,
        );
        if (sessionAccount) return sessionAccount;
        clearApiAuth();
        return null;
      } catch (e) {
        if (!isApiFallbackEnabled()) return null;
        if (e instanceof ApiError && (e.status === 0 || e.status === 401)) {
          // API down or unknown user → local demo accounts
        } else {
          return null;
        }
      }
    }
    return loginLocal(username, password, targetSystemId);
  },

  logout() {
    localStorage.removeItem(ACCOUNT_KEY);
    clearApiAuth();
    clearSession();
  },

  getSessionAccount(): UserAccount | null {
    const session = readSession();
    if (session) {
      const api = readApiAccountSnapshot();
      if (api && api.id === session.accountId) return api;
      return findAccount(session.accountId);
    }
    const id = localStorage.getItem(ACCOUNT_KEY);
    const api = readApiAccountSnapshot();
    if (api && api.id === id) return api;
    return findAccount(id);
  },

  getSession(): SessionState | null {
    return readSession();
  },

  setCurrentSystem(
    systemId: SystemId,
    entryMode: SessionState['entryMode'],
  ) {
    const account = this.getSessionAccount();
    if (!account) return;
    preserveChoirSession({
      accountId: account.id,
      currentSystemId: systemId,
      entryMode,
    });
  },

  setActiveChoirOrgUnitId(orgUnitId: string) {
    const session = readSession();
    if (!session) return;
    preserveChoirSession({
      accountId: session.accountId,
      currentSystemId: session.currentSystemId,
      entryMode: session.entryMode,
      activeChoirOrgUnitId: orgUnitId,
    });
  },

  /** Establish session from a redeemed SSO handoff. */
  acceptHandoff(accountId: string, toSystemId: SystemId): UserAccount | null {
    const account = findAccount(accountId);
    if (!account) return null;
    return establishSession(account, toSystemId, 'handoff');
  },
};

export const peopleService = {
  list() {
    return [...PEOPLE];
  },
  getById(id: string) {
    return PEOPLE.find((p) => p.id === id) ?? null;
  },
  search(query: string) {
    const q = query.trim().toLowerCase();
    if (!q) return this.list();
    return PEOPLE.filter(
      (p) =>
        p.fullName.toLowerCase().includes(q) ||
        p.preferredName?.toLowerCase().includes(q) ||
        p.email?.toLowerCase().includes(q),
    );
  },

  familyLinks(personId: string) {
    return PERSON_FAMILY_LINKS.filter(
      (l) => l.personId === personId || l.relatedPersonId === personId,
    ).map((l) => {
      const otherId =
        l.personId === personId ? l.relatedPersonId : l.personId;
      const other = PEOPLE.find((p) => p.id === otherId);
      const relation =
        l.personId === personId
          ? l.relation
          : reverseRelation(l.relation);
      return {
        ...l,
        otherPersonId: otherId,
        otherName: other?.preferredName || other?.fullName || otherId,
        displayRelation: relation,
      };
    });
  },

  baptism(personId: string) {
    return PERSON_BAPTISMS.find((b) => b.personId === personId) ?? null;
  },

  marriage(personId: string) {
    return PERSON_MARRIAGES.find((m) => m.personId === personId) ?? null;
  },

  timeline(personId: string) {
    return PERSON_TIMELINE.filter((e) => e.personId === personId).sort(
      (a, b) => b.at.localeCompare(a.at),
    );
  },

  documents(personId: string) {
    return PERSON_DOCUMENTS.filter((d) => d.personId === personId);
  },

  certificates(personId: string) {
    return this.documents(personId).filter((d) => d.kind === 'CERTIFICATE');
  },

  create(input: Omit<Person, 'id' | 'createdAt'> & { id?: string }): Person {
    const person: Person = {
      id: input.id ?? `p-${Date.now()}`,
      fullName: input.fullName,
      preferredName: input.preferredName,
      phone: input.phone,
      email: input.email,
      dateOfBirth: input.dateOfBirth,
      gender: input.gender,
      address: input.address,
      nationalId: input.nationalId,
      joinedChurchOn: input.joinedChurchOn,
      pastoralNotes: input.pastoralNotes,
      status: input.status,
      createdAt: new Date().toISOString().slice(0, 10),
    };
    PEOPLE.push(person);
    return person;
  },

  update(
    personId: string,
    patch: Partial<Omit<Person, 'id' | 'createdAt'>>,
  ): Person | null {
    const p = PEOPLE.find((x) => x.id === personId);
    if (!p) return null;
    Object.assign(p, patch);
    return p;
  },

  saveBaptism(record: PersonBaptismRecord) {
    upsertBaptism(record);
  },

  saveMarriage(record: PersonMarriageRecord) {
    upsertMarriage(record);
  },

  addFamilyLink(input: {
    personId: string;
    relatedPersonId: string;
    relation: FamilyRelation;
    notes?: string;
  }) {
    pushFamilyLink({
      id: `pfl-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      ...input,
    });
  },

  removeFamilyLink(id: string) {
    removeFamilyLink(id);
  },

  addTimelineEvent(
    input: Omit<PersonTimelineEvent, 'id'> & { id?: string },
  ) {
    pushTimelineEvent({
      id: input.id ?? `ptl-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      personId: input.personId,
      at: input.at,
      kind: input.kind,
      title: input.title,
      detail: input.detail,
    });
  },

  addDocument(input: Omit<PersonDocumentMeta, 'id'> & { id?: string }) {
    pushDocument({
      id: input.id ?? `pdoc-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      ...input,
    });
  },
};

function reverseRelation(relation: string): string {
  if (relation === 'PARENT') return 'CHILD';
  if (relation === 'CHILD') return 'PARENT';
  return relation;
}
