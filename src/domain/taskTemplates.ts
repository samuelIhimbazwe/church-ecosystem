/**
 * Lightweight task checklists spawned from program/project templates (W4).
 */
import type { ProgramType, TaskContextType } from './types';

export type TaskTemplateItem = {
  title: string;
  description?: string;
};

export type TaskTemplate = {
  id: string;
  label: string;
  /** When set, offered for matching program types. */
  programTypes?: ProgramType[];
  /** When true, offered on projects. */
  forProject?: boolean;
  items: TaskTemplateItem[];
};

export const TASK_TEMPLATES: TaskTemplate[] = [
  {
    id: 'tpl-project-kickoff',
    label: 'Project kickoff',
    forProject: true,
    items: [
      { title: 'Confirm lead & collaborators' },
      { title: 'Lock funding plan (or document gap)' },
      { title: 'Publish first delivery milestone' },
    ],
  },
  {
    id: 'tpl-class-session',
    label: 'Class / cohort session prep',
    programTypes: ['CLASS', 'DISCIPLESHIP', 'SMALL_GROUP'],
    items: [
      { title: 'Prepare session materials' },
      { title: 'Confirm facilitators' },
      { title: 'Send reminder to enrolled' },
    ],
  },
  {
    id: 'tpl-fellowship',
    label: 'Fellowship gathering',
    programTypes: ['FELLOWSHIP', 'OTHER'],
    items: [
      { title: 'Book space / logistics' },
      { title: 'Assign welcome team' },
    ],
  },
];

export function templatesForProgramType(ptype?: ProgramType): TaskTemplate[] {
  if (!ptype) return TASK_TEMPLATES.filter((t) => t.programTypes?.length);
  return TASK_TEMPLATES.filter((t) => t.programTypes?.includes(ptype));
}

export function projectTemplates(): TaskTemplate[] {
  return TASK_TEMPLATES.filter((t) => t.forProject);
}

export type SpawnContext = {
  contextType: TaskContextType;
  contextId: string;
  contextLabel?: string;
  systemId?: string;
};
