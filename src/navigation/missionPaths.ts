/** List path for mission detail "back" links — peer system or Main. */
export function missionListPath(
  pathname: string,
  kind: 'programs' | 'events' | 'tasks' | 'projects',
): string {
  const m = pathname.match(/^(\/systems\/[^/]+)\//);
  if (m) return `${m[1]}/${kind}`;
  return `/${kind}`;
}
