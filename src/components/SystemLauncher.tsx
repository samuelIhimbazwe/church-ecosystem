import { useMemo, useState, type CSSProperties } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { listChoirOrgUnits } from '../domain/choirCatalog';
import { resolveAccessibleChoirs } from '../domain/choirTenancy';
import { CHOIR_ROSTER } from '../data/choirSeed';
import type { ChurchSystem, SystemId } from '../domain/types';
import {
  authService,
  missionService,
  participationService,
  peopleService,
} from '../services';
import { openSystemUrlInNewTab } from '../services/ssoService';
import { useToast } from './ui/Toast';

const PEER_ACCENT: Partial<Record<SystemId, string>> = {
  'sys-choir': '#5e6ad2',
  'sys-worship': '#7179e0',
  'sys-youth': '#0d9373',
  'sys-protocol': '#697386',
  'sys-deacon': '#df1b41',
  'sys-finance': '#5e6ad2',
  'sys-music': '#4f5bc4',
  'sys-media': '#697386',
  'sys-men': '#0a2540',
  'sys-women': '#df1b41',
  'sys-couples': '#0d9373',
  'sys-children': '#7179e0',
  'sys-elderly': '#697386',
  'sys-evangelism': '#5e6ad2',
  'sys-intercessors': '#0a2540',
};

/** Home launcher shows this many ministry tiles before “Show all”. */
const HOME_MINISTRY_LIMIT = 6;

const MINISTRY_ORDER: SystemId[] = [
  'sys-music',
  'sys-worship',
  'sys-youth',
  'sys-deacon',
  'sys-men',
  'sys-women',
  'sys-children',
  'sys-couples',
  'sys-elderly',
  'sys-evangelism',
  'sys-intercessors',
];

const OTHER_ORDER: SystemId[] = ['sys-protocol', 'sys-media'];

type LauncherTile = {
  key: string;
  systemId: SystemId;
  shortName: string;
  /** One-line story under the name (steward · next · count). */
  story: string;
  mark: string;
  planned: boolean;
  accent?: string;
  choirOrgUnitId?: string;
  loginHref?: string;
};

type LauncherCategory = 'ministries' | 'choirs' | 'others';

function personLabel(personId: string) {
  const p = peopleService.getById(personId);
  return p?.preferredName || p?.fullName || null;
}

function isLeaderPosition(p: {
  systemId?: SystemId;
  systemRole?: string | null;
  ministryOffice?: string | null;
  title?: string;
}) {
  if (p.ministryOffice === 'PRESIDENT' || p.ministryOffice === 'VP') return true;
  if (p.systemRole && /_LEADER$/.test(p.systemRole)) return true;
  if (p.title && /president|leader|director/i.test(p.title)) return true;
  return false;
}

function stewardForSystem(systemId: SystemId): string | undefined {
  const positions = participationService
    .listPositions({ status: 'ACTIVE' })
    .filter((p) => p.systemId === systemId && isLeaderPosition(p));
  const preferred =
    positions.find((p) => p.ministryOffice === 'PRESIDENT') ??
    positions.find((p) => p.systemRole && /_LEADER$/.test(p.systemRole)) ??
    positions[0];
  return preferred ? personLabel(preferred.personId) ?? undefined : undefined;
}

function nextEventLine(systemId: SystemId): string | undefined {
  const now = Date.now();
  const upcoming = missionService
    .listEvents({ ownerSystemId: systemId })
    .filter((e) => {
      if (e.status === 'CANCELLED') return false;
      if (!e.startsAt) return false;
      const t = new Date(e.startsAt).getTime();
      return !Number.isNaN(t) && t >= now - 86400000;
    })
    .sort(
      (a, b) =>
        new Date(a.startsAt!).getTime() - new Date(b.startsAt!).getTime(),
    );
  const e = upcoming[0];
  if (!e?.startsAt) return undefined;
  const when = new Date(e.startsAt).toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
  return `Next: ${e.name} · ${when}`;
}

function choirStory(orgUnitId: string): string {
  const roster = CHOIR_ROSTER.filter(
    (m) => m.orgUnitId === orgUnitId && m.status === 'ACTIVE',
  );
  const pres = roster.find((m) => m.office === 'PRESIDENT');
  const steward = pres ? personLabel(pres.personId) : undefined;
  const bits = [
    steward ? `Led by ${steward}` : undefined,
    `${roster.length} on roster`,
  ].filter(Boolean);
  return bits.join(' · ') || 'Choir ministry';
}

function ministryStory(systemId: SystemId): string {
  const steward = stewardForSystem(systemId);
  const next = nextEventLine(systemId);
  const bits = [
    steward ? `Led by ${steward}` : undefined,
    next,
  ].filter(Boolean);
  if (bits.length === 0) return 'Ministry system';
  return bits.join(' · ');
}

function systemTile(system: ChurchSystem): LauncherTile {
  return {
    key: system.id,
    systemId: system.id,
    shortName: system.shortName,
    story:
      system.kind === 'MAIN'
        ? 'Main Church home'
        : ministryStory(system.id),
    mark: (system.shortName || system.code || '?').slice(0, 2).toUpperCase(),
    planned: system.status !== 'ACTIVE',
    accent: PEER_ACCENT[system.id],
    loginHref:
      system.kind === 'MINISTRY' ? `/login?system=${system.id}` : undefined,
  };
}

function orderByIds(
  tiles: LauncherTile[],
  order: SystemId[],
): LauncherTile[] {
  const rank = new Map(order.map((id, i) => [id, i]));
  return [...tiles].sort((a, b) => {
    const ra = rank.get(a.systemId) ?? 999;
    const rb = rank.get(b.systemId) ?? 999;
    if (ra !== rb) return ra - rb;
    return a.shortName.localeCompare(b.shortName);
  });
}

function categorizeTiles(
  systems: ChurchSystem[],
  accessibleChoirIds: string[],
): Record<LauncherCategory, LauncherTile[]> {
  const ministries: LauncherTile[] = [];
  const choirs: LauncherTile[] = [];
  const others: LauncherTile[] = [];

  for (const system of systems) {
    if (system.id === 'sys-choir') {
      const named = listChoirOrgUnits().filter((c) =>
        accessibleChoirIds.includes(c.id),
      );
      if (named.length === 0) {
        choirs.push({
          ...systemTile(system),
          story: 'Open a choir you belong to',
        });
        continue;
      }
      for (const c of named) {
        choirs.push({
          key: c.id,
          systemId: 'sys-choir',
          shortName: c.name,
          story: choirStory(c.id),
          mark: c.name.slice(0, 2).toUpperCase(),
          planned: system.status !== 'ACTIVE',
          accent: PEER_ACCENT['sys-choir'],
          choirOrgUnitId: c.id,
          loginHref: `/login?system=sys-choir&choir=${encodeURIComponent(c.id)}`,
        });
      }
      continue;
    }

    if (OTHER_ORDER.includes(system.id)) {
      others.push(systemTile(system));
      continue;
    }

    if (system.kind === 'MAIN') {
      others.push(systemTile(system));
      continue;
    }

    ministries.push(systemTile(system));
  }

  return {
    ministries: orderByIds(ministries, MINISTRY_ORDER),
    choirs,
    others: orderByIds(others, OTHER_ORDER),
  };
}

function TileCard({
  tile,
  isCurrent,
  dense,
  onOpen,
}: {
  tile: LauncherTile;
  isCurrent: boolean;
  dense?: boolean;
  onOpen: (tile: LauncherTile) => void;
}) {
  const tileStyle = (
    tile.accent && !tile.planned
      ? { ['--tile-accent']: tile.accent }
      : undefined
  ) as CSSProperties | undefined;

  return (
    <div
      className={`app-tile ${tile.planned ? 'planned' : ''} ${dense ? 'app-tile-dense' : ''}`}
      style={tileStyle}
    >
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <span className="app-mark" aria-hidden>
          {tile.mark}
        </span>
        <span className={`badge ${tile.planned ? 'planned' : ''}`}>
          {tile.planned ? 'Coming soon' : 'Open'}
        </span>
      </div>
      <h3 className="title" style={{ margin: 0 }}>
        {tile.shortName}
      </h3>
      <p
        className="muted"
        style={{ margin: 0, flex: 1, fontSize: dense ? '0.78rem' : '0.85rem' }}
      >
        {tile.story}
      </p>
      <div className="row">
        {!tile.planned ? (
          <button
            type="button"
            className="btn"
            disabled={isCurrent && tile.systemId !== 'sys-main'}
            onClick={() => onOpen(tile)}
          >
            {isCurrent ? 'Current' : 'Enter'}
          </button>
        ) : (
          <button type="button" className="btn secondary" disabled>
            Soon
          </button>
        )}
        {tile.loginHref && (
          <Link
            className="muted"
            to={tile.loginHref}
            target="_blank"
            rel="noopener noreferrer"
          >
            Sign-in link
          </Link>
        )}
      </div>
    </div>
  );
}

function CategorySection({
  title,
  hint,
  tiles,
  dense,
  sessionSystemId,
  sessionChoirId,
  onOpen,
  collapsed,
  onToggle,
}: {
  title: string;
  hint?: string;
  tiles: LauncherTile[];
  dense?: boolean;
  sessionSystemId?: SystemId;
  sessionChoirId?: string | null;
  onOpen: (tile: LauncherTile) => void;
  collapsed?: boolean;
  onToggle?: () => void;
}) {
  if (tiles.length === 0) return null;

  return (
    <section className="launcher-category">
      <div className="launcher-category-head">
        <div>
          <h3 className="launcher-category-title">
            {title}
            <span className="muted" style={{ fontWeight: 500 }}>
              {' '}
              · {tiles.length}
            </span>
          </h3>
          {hint ? (
            <p className="muted" style={{ margin: '0.15rem 0 0', fontSize: '0.85rem' }}>
              {hint}
            </p>
          ) : null}
        </div>
        {onToggle ? (
          <button type="button" className="btn ghost" onClick={onToggle}>
            {collapsed ? 'Show' : 'Hide'}
          </button>
        ) : null}
      </div>
      {!collapsed && (
        <div className={`app-grid ${dense ? 'app-grid-dense' : ''}`}>
          {tiles.map((tile) => {
            const isCurrent =
              sessionSystemId === tile.systemId &&
              (!tile.choirOrgUnitId ||
                sessionChoirId === tile.choirOrgUnitId);
            return (
              <TileCard
                key={tile.key}
                tile={tile}
                isCurrent={isCurrent}
                dense={dense}
                onOpen={onOpen}
              />
            );
          })}
        </div>
      )}
    </section>
  );
}

export function SystemLauncher({
  excludeMain = false,
  /** Hide shared Finance ledger — not a ministry peer system. */
  excludeShared = true,
  /**
   * Home: ~6 ministries + categorized Choirs / Others.
   * Full (Systems page): every tile in every category.
   */
  compact = false,
}: {
  excludeMain?: boolean;
  excludeShared?: boolean;
  compact?: boolean;
}) {
  const {
    availableSystems,
    openPeerSystem,
    session,
    memberships,
    positions,
    account,
  } = useAuth();
  const navigate = useNavigate();
  const { push: toast } = useToast();
  const [showAllMinistries, setShowAllMinistries] = useState(!compact);
  const [othersOpen, setOthersOpen] = useState(!compact);
  const [choirsOpen, setChoirsOpen] = useState(!compact);

  const systems = availableSystems.filter((s) => {
    if (excludeMain && s.kind === 'MAIN') return false;
    if (excludeShared && s.kind === 'SHARED') return false;
    return true;
  });

  const accessibleChoirIds = account
    ? resolveAccessibleChoirs(memberships, positions).map((c) => c.id)
    : [];

  const categories = useMemo(
    () => categorizeTiles(systems, accessibleChoirIds),
    [systems, accessibleChoirIds],
  );

  const ministryTiles =
    compact && !showAllMinistries
      ? categories.ministries.slice(0, HOME_MINISTRY_LIMIT)
      : categories.ministries;
  const ministryHidden =
    compact && categories.ministries.length > HOME_MINISTRY_LIMIT
      ? categories.ministries.length - HOME_MINISTRY_LIMIT
      : 0;

  function handleOpen(tile: LauncherTile) {
    if (tile.systemId === 'sys-main') {
      navigate('/');
      return;
    }
    if (tile.choirOrgUnitId) {
      authService.setActiveChoirOrgUnitId(tile.choirOrgUnitId);
    }
    const result = openPeerSystem(tile.systemId);
    if (!result.ok || !result.url) {
      toast({
        title: 'Couldn’t open system',
        detail: result.reason ?? 'Try again or ask a leader for access.',
        tone: 'danger',
      });
      return;
    }
    openSystemUrlInNewTab(result.url);
  }

  return (
    <div className="launcher-categories">
      <CategorySection
        title="Ministries"
        hint={
          compact
            ? 'Who leads it, what’s next — then enter'
            : undefined
        }
        tiles={ministryTiles}
        sessionSystemId={session?.currentSystemId}
        sessionChoirId={session?.activeChoirOrgUnitId}
        onOpen={handleOpen}
      />
      {ministryHidden > 0 && (
        <button
          type="button"
          className="btn ghost"
          onClick={() => setShowAllMinistries(true)}
        >
          Show all ministries (+{ministryHidden})
        </button>
      )}
      {compact && showAllMinistries && categories.ministries.length > HOME_MINISTRY_LIMIT && (
        <button
          type="button"
          className="btn ghost"
          onClick={() => setShowAllMinistries(false)}
        >
          Show fewer ministries
        </button>
      )}

      <CategorySection
        title="Choirs"
        hint="Each choir has its own roster and steward"
        tiles={categories.choirs}
        dense
        collapsed={compact ? !choirsOpen : false}
        onToggle={compact ? () => setChoirsOpen((v) => !v) : undefined}
        sessionSystemId={session?.currentSystemId}
        sessionChoirId={session?.activeChoirOrgUnitId}
        onOpen={handleOpen}
      />

      <CategorySection
        title="Others"
        hint="Support teams"
        tiles={categories.others}
        collapsed={compact ? !othersOpen : false}
        onToggle={compact ? () => setOthersOpen((v) => !v) : undefined}
        sessionSystemId={session?.currentSystemId}
        sessionChoirId={session?.activeChoirOrgUnitId}
        onOpen={handleOpen}
      />
    </div>
  );
}
