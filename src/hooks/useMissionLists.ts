import { useCallback, useEffect, useState } from 'react';
import {
  loadEventsPreferApi,
  loadProgramsPreferApi,
  loadProjectsPreferApi,
  loadTasksPreferApi,
} from '../api/missionApi';
import { isApiEnabled } from '../api';
import type {
  ChurchEvent,
  ChurchProject,
  Program,
  SystemId,
  WorkTask,
} from '../domain/types';
import { missionService } from '../services';
import { useAuth } from '../auth/AuthContext';

/**
 * Lists programs from the API when enabled+reachable; otherwise seed missionService.
 */
export function useProgramsList(opts?: {
  ownerSystemId?: SystemId;
  viewerSystemId?: SystemId;
}) {
  const { account, positions, authSource } = useAuth();
  const [programs, setPrograms] = useState<Program[]>([]);
  const [source, setSource] = useState<'api' | 'seed'>('seed');
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);
  const reload = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const remote = await loadProgramsPreferApi(opts?.ownerSystemId);
      if (cancelled) return;
      if (remote) {
        setPrograms(remote);
        setSource('api');
      } else {
        const viewOpts = {
          personId: account?.personId,
          positions,
          canEnterOwner: true,
        };
        setPrograms(
          missionService.listPrograms({
            ownerSystemId: opts?.ownerSystemId,
            viewerSystemId: opts?.viewerSystemId,
            viewOpts,
          }),
        );
        setSource('seed');
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [
    opts?.ownerSystemId,
    opts?.viewerSystemId,
    account?.personId,
    positions,
    authSource,
    tick,
  ]);

  return { programs, source, loading, reload, apiEnabled: isApiEnabled() };
}

export function useEventsList(opts?: { ownerSystemId?: SystemId }) {
  const { account, positions, authSource } = useAuth();
  const [events, setEvents] = useState<ChurchEvent[]>([]);
  const [source, setSource] = useState<'api' | 'seed'>('seed');
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);
  const reload = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const remote = await loadEventsPreferApi(opts?.ownerSystemId);
      if (cancelled) return;
      if (remote) {
        setEvents(remote);
        setSource('api');
      } else {
        const viewOpts = {
          personId: account?.personId,
          positions,
          canEnterOwner: true,
        };
        setEvents(
          missionService.listEvents({
            ownerSystemId: opts?.ownerSystemId,
            viewerSystemId: opts?.ownerSystemId ?? 'sys-main',
            viewOpts,
          }),
        );
        setSource('seed');
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [opts?.ownerSystemId, account?.personId, positions, authSource, tick]);

  return { events, source, loading, reload };
}

export function useTasksList(opts?: { systemId?: SystemId }) {
  const { account, authSource } = useAuth();
  const [tasks, setTasks] = useState<WorkTask[]>([]);
  const [source, setSource] = useState<'api' | 'seed'>('seed');
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);
  const reload = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const remote = await loadTasksPreferApi(opts?.systemId);
      if (cancelled) return;
      if (remote) {
        setTasks(remote);
        setSource('api');
      } else {
        setTasks(
          missionService.listTasks({
            systemId: opts?.systemId,
            personId: account?.personId,
          }),
        );
        setSource('seed');
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [opts?.systemId, account?.personId, authSource, tick]);

  return { tasks, source, loading, reload };
}

export function useProjectsList(opts?: { ownerSystemId?: SystemId }) {
  const { account, positions, authSource } = useAuth();
  const [projects, setProjects] = useState<ChurchProject[]>([]);
  const [source, setSource] = useState<'api' | 'seed'>('seed');
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);
  const reload = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const remote = await loadProjectsPreferApi(opts?.ownerSystemId);
      if (cancelled) return;
      if (remote) {
        setProjects(remote);
        setSource('api');
      } else {
        const viewOpts = {
          personId: account?.personId,
          positions,
          canEnterOwner: true,
        };
        setProjects(
          missionService.listProjects({
            ownerSystemId: opts?.ownerSystemId,
            viewerSystemId: opts?.ownerSystemId ?? 'sys-main',
            viewOpts,
          }),
        );
        setSource('seed');
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [opts?.ownerSystemId, account?.personId, positions, authSource, tick]);

  return { projects, source, loading, reload };
}
