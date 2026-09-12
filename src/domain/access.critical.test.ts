import { describe, expect, it } from 'vitest';
import { authorize, buildEffectiveAccess } from './authorize';
import {
  ministryOfficeMayAccessModule,
  resolveMinistryBoardOffice,
} from './ministryNavAccess';
import { authorizeFinanceFund, visibleFundIds } from './financeAccess';
import { choirOfficeMayAccess } from './choirNav';
import {
  ASSIGNMENTS,
  MEMBERSHIPS,
  POSITIONS,
  SYSTEMS,
  TASKS,
} from '../data/seed';
import type { SystemId } from './types';

function participation() {
  return {
    memberships: MEMBERSHIPS,
    positions: POSITIONS,
    assignments: ASSIGNMENTS,
    tasks: TASKS,
    allSystemIds: SYSTEMS.map((s) => s.id) as SystemId[],
  };
}

function grantsFor(personId: string) {
  return buildEffectiveAccess(personId, participation());
}

describe('ministry member module allow-list', () => {
  it('blocks finance suite for MEMBER on youth', () => {
    expect(
      ministryOfficeMayAccessModule('sys-youth', 'MEMBER', 'finance'),
    ).toBe(false);
    expect(
      ministryOfficeMayAccessModule('sys-youth', 'MEMBER', 'donations'),
    ).toBe(false);
    expect(
      ministryOfficeMayAccessModule('sys-youth', 'MEMBER', 'my-contributions'),
    ).toBe(true);
  });

  it('allows treasurer full suite and president finance+reports only', () => {
    expect(
      ministryOfficeMayAccessModule('sys-youth', 'TREASURER', 'donations'),
    ).toBe(true);
    expect(
      ministryOfficeMayAccessModule('sys-youth', 'PRESIDENT', 'finance'),
    ).toBe(true);
    expect(
      ministryOfficeMayAccessModule('sys-youth', 'PRESIDENT', 'donations'),
    ).toBe(false);
  });

  it('protocol members only get schedule surface', () => {
    expect(
      ministryOfficeMayAccessModule('sys-protocol', 'MEMBER', 'teams'),
    ).toBe(false);
    expect(
      ministryOfficeMayAccessModule('sys-protocol', 'MEMBER', 'mine'),
    ).toBe(true);
  });
});

describe('resolveMinistryBoardOffice', () => {
  it('resolves youth president from seeded positions', () => {
    const office = resolveMinistryBoardOffice(
      'p-youth-leader',
      'sys-youth',
      POSITIONS,
    );
    expect(office).toBe('PRESIDENT');
  });
});

describe('choir office nav', () => {
  it('members cannot open finance; treasurer can', () => {
    expect(choirOfficeMayAccess('MEMBER', 'finance')).toBe(false);
    expect(choirOfficeMayAccess('TREASURER', 'finance')).toBe(true);
    expect(choirOfficeMayAccess('MUSIC_DIRECTOR', 'finance')).toBe(false);
  });
});

describe('ORG_PRIVATE fund vaults', () => {
  it('pastor cannot open youth vault without grant', () => {
    const grants = grantsFor('p-pastor');
    const decision = authorizeFinanceFund(
      'p-pastor',
      'fund-youth',
      'VIEW',
      grants,
    );
    expect(decision.allowed).toBe(false);
  });

  it('youth treasurer can manage youth vault', () => {
    const grants = grantsFor('p-youth-treas');
    const decision = authorizeFinanceFund(
      'p-youth-treas',
      'fund-youth',
      'MANAGE',
      grants,
    );
    expect(decision.allowed).toBe(true);
    expect(visibleFundIds('p-youth-treas', grants)).toContain('fund-youth');
  });

  it('church treasurer can manage general fund', () => {
    const grants = grantsFor('p-church-treas');
    const decision = authorizeFinanceFund(
      'p-church-treas',
      'fund-general',
      'MANAGE',
      grants,
    );
    expect(decision.allowed).toBe(true);
  });
});

describe('membership does not grant ministry finance VIEW', () => {
  it('plain membership grants lack MINISTRY_FINANCE', () => {
    // Patrick is a church member with limited grants — not a youth treasurer.
    const grants = grantsFor('p-member');
    const fin = authorize({
      personId: 'p-member',
      systemId: 'sys-youth',
      resource: 'MINISTRY_FINANCE',
      action: 'VIEW',
    }, grants);
    expect(fin.allowed).toBe(false);
  });
});
