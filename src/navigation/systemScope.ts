import type { SystemId } from '../domain/types';
import { systemsService } from '../services';

const MAIN_EXIT_KEY = 'adepr.exitToMain';

/** Arm intentional leave from a peer/shared system to Main Church. */
export function armExitToMainChurch(): void {
  sessionStorage.setItem(MAIN_EXIT_KEY, '1');
}

export function consumeExitToMainChurch(): boolean {
  if (sessionStorage.getItem(MAIN_EXIT_KEY) !== '1') return false;
  sessionStorage.removeItem(MAIN_EXIT_KEY);
  return true;
}

export function clearExitToMainChurch(): void {
  sessionStorage.removeItem(MAIN_EXIT_KEY);
}

export function peekExitToMainChurch(): boolean {
  return sessionStorage.getItem(MAIN_EXIT_KEY) === '1';
}

export function isAuthOrHandoffPath(pathname: string): boolean {
  return pathname === '/login' || pathname.startsWith('/sso/');
}

export function peerBasePath(systemId: SystemId): string | null {
  if (systemId === 'sys-main') return null;
  const base = systemsService.getById(systemId)?.basePath;
  if (!base || base === '/') return null;
  return base.replace(/\/$/, '');
}

export function isInsideSystemBase(pathname: string, basePath: string): boolean {
  const base = basePath.replace(/\/$/, '');
  return pathname === base || pathname.startsWith(`${base}/`);
}
