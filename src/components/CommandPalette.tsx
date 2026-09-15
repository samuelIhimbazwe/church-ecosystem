import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { useAttention } from '../hooks/useAttention';
import { missionService, peopleService } from '../services';
import { useToast } from './ui/Toast';

type PaletteItem = {
  id: string;
  label: string;
  hint?: string;
  href: string;
  group: string;
  /** Non-navigation action (e.g. keyboard help toast). */
  action?: 'keyboard-help';
};

function buildDestinations(input: {
  canViewPeople: boolean;
  canAdmin: boolean;
  canTreasury: boolean;
  profilePath: string;
  attentionHrefs: Array<{ id: string; title: string; href: string }>;
}): PaletteItem[] {
  const dest: PaletteItem[] = [
    { id: 'home', label: 'Dashboard', href: '/', group: 'Go to' },
    { id: 'inbox', label: 'Inbox', href: '/inbox', group: 'Go to' },
    { id: 'mission', label: 'Mission', href: '/mission', group: 'Go to' },
    { id: 'programs', label: 'Programs', href: '/programs', group: 'Go to' },
    { id: 'events', label: 'Events', href: '/events', group: 'Go to' },
    { id: 'tasks', label: 'Tasks', href: '/tasks', group: 'Go to' },
    { id: 'projects', label: 'Projects', href: '/projects', group: 'Go to' },
    {
      id: 'reports',
      label: 'Reports (Leadership)',
      href: '/reports/leadership',
      group: 'Go to',
    },
    { id: 'calendar', label: 'Calendar', href: '/calendar', group: 'Go to' },
    {
      id: 'people',
      label: input.canViewPeople ? 'People' : 'My profile',
      href: input.canViewPeople ? '/people' : input.profilePath,
      group: 'Go to',
    },
    {
      id: 'org',
      label: 'Organisation',
      href: '/organization',
      group: 'Go to',
    },
    {
      id: 'participation',
      label: 'Participation',
      href: '/participation',
      group: 'Go to',
    },
    { id: 'systems', label: 'Systems', href: '/systems', group: 'Go to' },
  ];
  if (input.canTreasury) {
    dest.push(
      { id: 'finance', label: 'Church treasury', href: '/finance', group: 'Go to' },
      {
        id: 'collections',
        label: 'Collections',
        href: '/finance/collections',
        group: 'Go to',
      },
    );
  }
  if (input.canAdmin) {
    dest.push({
      id: 'access',
      label: 'Access engine',
      href: '/access',
      group: 'Go to',
    });
  }
  for (const a of input.attentionHrefs.slice(0, 8)) {
    dest.push({
      id: `att-${a.id}`,
      label: a.title,
      hint: 'Needs me',
      href: a.href,
      group: 'Needs me',
    });
  }
  return dest;
}

function matchQuery(label: string, query: string) {
  if (!query) return true;
  return label.toLowerCase().includes(query);
}

function buildPeopleItems(input: {
  canViewPeople: boolean;
  personId: string;
  query: string;
}): PaletteItem[] {
  const needle = input.query.trim().toLowerCase();
  const people = input.canViewPeople
    ? needle
      ? peopleService.search(needle)
      : peopleService.list()
    : (() => {
        const self = peopleService.getById(input.personId);
        return self ? [self] : [];
      })();
  return people.slice(0, 8).map((p) => ({
    id: `person-${p.id}`,
    label: p.preferredName || p.fullName,
    hint: p.email,
    href: `/people/${p.id}`,
    group: 'People',
  }));
}

function buildWorkItems(query: string): PaletteItem[] {
  const needle = query.trim().toLowerCase();
  const out: PaletteItem[] = [];
  const programs = missionService
    .listPrograms({ viewerSystemId: 'sys-main' })
    .filter((p) => matchQuery(p.name, needle))
    .slice(0, 8);
  for (const p of programs) {
    out.push({
      id: `prog-${p.id}`,
      label: p.name,
      hint: 'Program',
      href: `/programs/${p.id}`,
      group: 'Work',
    });
  }
  const events = missionService
    .listEvents({ viewerSystemId: 'sys-main' })
    .filter((e) => matchQuery(e.name, needle))
    .slice(0, 8);
  for (const e of events) {
    out.push({
      id: `evt-${e.id}`,
      label: e.name,
      hint: 'Event',
      href: `/events/${e.id}`,
      group: 'Work',
    });
  }
  const tasks = missionService
    .listTasks({ viewerSystemId: 'sys-main' })
    .filter((t) => matchQuery(t.title, needle))
    .slice(0, 8);
  for (const t of tasks) {
    out.push({
      id: `task-${t.id}`,
      label: t.title,
      hint: 'Task',
      href: `/tasks/${t.id}`,
      group: 'Work',
    });
  }
  const projects = missionService
    .listProjects({ viewerSystemId: 'sys-main' })
    .filter((p) => matchQuery(p.name, needle))
    .slice(0, 8);
  for (const p of projects) {
    out.push({
      id: `proj-${p.id}`,
      label: p.name,
      hint: 'Project',
      href: `/projects/${p.id}`,
      group: 'Work',
    });
  }
  return out;
}

function buildActionItems(input: {
  canManageTask: boolean;
  canManageEvent: boolean;
  canManageProgram: boolean;
}): PaletteItem[] {
  const out: PaletteItem[] = [];
  if (input.canManageTask) {
    out.push({
      id: 'action-create-task',
      label: 'Create task',
      hint: 'Actions',
      href: '/tasks',
      group: 'Actions',
    });
  }
  if (input.canManageEvent) {
    out.push({
      id: 'action-create-event',
      label: 'Create event',
      hint: 'Actions',
      href: '/events',
      group: 'Actions',
    });
  }
  if (input.canManageProgram) {
    out.push({
      id: 'action-create-program',
      label: 'Create program',
      hint: 'Actions',
      href: '/programs',
      group: 'Actions',
    });
  }
  return out;
}

function buildHelpItems(): PaletteItem[] {
  return [
    {
      id: 'help-keys',
      label: 'Keyboard shortcuts',
      hint: 'Help',
      href: '#keyboard-help',
      group: 'Help',
      action: 'keyboard-help',
    },
    {
      id: 'help-inbox',
      label: 'Go to Inbox',
      hint: 'Needs me',
      href: '/inbox',
      group: 'Help',
    },
    {
      id: 'help-mission',
      label: 'Go to Mission board',
      hint: 'Work',
      href: '/mission',
      group: 'Help',
    },
  ];
}

const RECENTS_KEY = 'adepr.cmdk.recents';

function loadRecents(): string[] {
  try {
    const raw = localStorage.getItem(RECENTS_KEY);
    const arr = raw ? (JSON.parse(raw) as string[]) : [];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function pushRecent(id: string) {
  const next = [id, ...loadRecents().filter((x) => x !== id)].slice(0, 8);
  localStorage.setItem(RECENTS_KEY, JSON.stringify(next));
}

/**
 * Ctrl/Cmd+K: destinations + Needs-me + People/Work/Actions + recents.
 */
export function CommandPalette() {
  const navigate = useNavigate();
  const {
    account,
    canViewPeople,
    can,
  } = useAuth();
  const { items: attention } = useAttention();
  const { push: toast } = useToast();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [recents, setRecents] = useState<string[]>([]);

  const canAdmin = can('AUDIT', 'VIEW', 'sys-main');
  const canTreasury = can('FINANCE', 'VIEW', 'sys-main');
  const canManageTask = can('TASK', 'MANAGE');
  const canManageEvent = can('EVENT', 'MANAGE');
  const canManageProgram = can('PROGRAM', 'MANAGE');

  const items = useMemo(() => {
    if (!account) return [];
    const dest = buildDestinations({
      canViewPeople,
      canAdmin,
      canTreasury,
      profilePath: `/people/${account.personId}`,
      attentionHrefs: attention.map((a) => ({
        id: a.id,
        title: a.title,
        href: a.href,
      })),
    });
    const people = buildPeopleItems({
      canViewPeople,
      personId: account.personId,
      query: q,
    });
    const work = buildWorkItems(q);
    const actions = buildActionItems({
      canManageTask,
      canManageEvent,
      canManageProgram,
    });
    const help = buildHelpItems();
    return [...dest, ...people, ...work, ...actions, ...help];
  }, [
    account,
    canViewPeople,
    canAdmin,
    canTreasury,
    attention,
    q,
    canManageTask,
    canManageEvent,
    canManageProgram,
  ]);

  useEffect(() => {
    function openPalette() {
      setRecents(loadRecents());
      setOpen(true);
      setQ('');
    }
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (open) setOpen(false);
        else openPalette();
      }
      if (e.key === 'Escape') setOpen(false);
    }
    function onCustom() {
      openPalette();
    }
    window.addEventListener('keydown', onKey);
    window.addEventListener('adepr:cmdk', onCustom);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('adepr:cmdk', onCustom);
    };
  }, [open]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    let list = items;
    if (needle) {
      list = items.filter(
        (i) =>
          i.label.toLowerCase().includes(needle) ||
          i.hint?.toLowerCase().includes(needle) ||
          i.href.toLowerCase().includes(needle) ||
          i.group.toLowerCase().includes(needle),
      );
    } else if (recents.length) {
      const recentItems = recents
        .map((id) => items.find((i) => i.id === id))
        .filter(Boolean) as PaletteItem[];
      const rest = items.filter((i) => !recents.includes(i.id));
      list = [...recentItems, ...rest];
    }
    return list.slice(0, 28);
  }, [items, q, recents]);

  function go(item: PaletteItem) {
    pushRecent(item.id);
    setOpen(false);
    setQ('');
    if (item.action === 'keyboard-help') {
      toast({
        title: 'Keyboard shortcuts',
        detail:
          '⌘/Ctrl+K search · Esc close · Tab cycle · Enter confirm · Skip link to content',
        tone: 'info',
        durationMs: 8000,
      });
      return;
    }
    navigate(item.href);
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (filtered[0]) go(filtered[0]);
  }

  if (!open || !account) return null;

  return (
    <div className="cmdk-root" role="dialog" aria-label="Command palette">
      <button
        type="button"
        className="cmdk-backdrop"
        aria-label="Close"
        onClick={() => setOpen(false)}
      />
      <div className="cmdk-panel">
        <form onSubmit={onSubmit}>
          <input
            autoFocus
            className="cmdk-input"
            placeholder="Go to… people, work, actions"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </form>
        <ul className="cmdk-list">
          {filtered.length === 0 ? (
            <li className="cmdk-empty muted">No matches</li>
          ) : (
            filtered.map((item) => (
              <li key={item.id}>
                <button type="button" className="cmdk-item" onClick={() => go(item)}>
                  <span>
                    <strong>{item.label}</strong>
                    {item.hint && (
                      <span className="muted"> · {item.hint}</span>
                    )}
                  </span>
                  <span className="muted cmdk-group">{item.group}</span>
                </button>
              </li>
            ))
          )}
        </ul>
        <p className="cmdk-foot muted">
          <kbd>Ctrl</kbd>/<kbd>⌘</kbd>+<kbd>K</kbd> · <kbd>↑</kbd>
          <kbd>↓</kbd> · <kbd>Enter</kbd> · <kbd>Esc</kbd> · type “shortcuts”
          for help
        </p>
      </div>
    </div>
  );
}
