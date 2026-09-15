/**
 * Saved report filter presets + board-packet share tokens (W5).
 */
export type ReportSavedView = {
  id: string;
  name: string;
  /** Which reports tab: leadership | mission | events | archive | finance */
  section: string;
  filters: Record<string, string>;
  createdAt: string;
};

export type BoardPacket = {
  id: string;
  title: string;
  createdAt: string;
  createdByPersonId: string;
  /** Snapshot payload for read-only share. */
  snapshot: {
    healthGreen: number;
    healthAmber: number;
    healthRed: number;
    peopleServed: number;
    impactPerFranc: number | null;
    usedCost: number;
    plannedCost: number;
    exceptions: string[];
  };
};

const VIEWS_KEY = 'adepr.reportSavedViews';
const PACKETS_KEY = 'adepr.boardPackets';

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown) {
  localStorage.setItem(key, JSON.stringify(value));
}

export const reportPrefs = {
  listViews(section?: string): ReportSavedView[] {
    const all = readJson<ReportSavedView[]>(VIEWS_KEY, []);
    return section ? all.filter((v) => v.section === section) : all;
  },

  saveView(input: {
    name: string;
    section: string;
    filters: Record<string, string>;
  }): ReportSavedView {
    const view: ReportSavedView = {
      id: `rv-${Date.now().toString(36)}`,
      name: input.name.trim() || 'Untitled view',
      section: input.section,
      filters: { ...input.filters },
      createdAt: new Date().toISOString(),
    };
    const all = this.listViews();
    writeJson(VIEWS_KEY, [view, ...all].slice(0, 40));
    return view;
  },

  deleteView(id: string) {
    writeJson(
      VIEWS_KEY,
      this.listViews().filter((v) => v.id !== id),
    );
  },

  listPackets(): BoardPacket[] {
    return readJson<BoardPacket[]>(PACKETS_KEY, []);
  },

  getPacket(id: string): BoardPacket | null {
    return this.listPackets().find((p) => p.id === id) ?? null;
  },

  createPacket(
    input: Omit<BoardPacket, 'id' | 'createdAt'>,
  ): BoardPacket {
    const packet: BoardPacket = {
      ...input,
      id: `pkt-${Date.now().toString(36)}`,
      createdAt: new Date().toISOString(),
    };
    writeJson(PACKETS_KEY, [packet, ...this.listPackets()].slice(0, 20));
    return packet;
  },
};
