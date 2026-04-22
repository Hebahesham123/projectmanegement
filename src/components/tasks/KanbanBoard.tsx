'use client';

import { useMemo, useState } from 'react';
import { DndContext, DragOverlay, PointerSensor, useSensor, useSensors, closestCorners, type DragEndEvent, type DragStartEvent, useDraggable, useDroppable } from '@dnd-kit/core';
import { createClient } from '@/lib/supabase/client';
import type { Task, TaskStatus } from '@/lib/types';
import { taskStatusMeta, cn, formatDate } from '@/lib/utils';
import { Avatar } from '@/components/ui/Avatar';
import { useI18n } from '@/lib/i18n/LanguageProvider';
import { Badge } from '@/components/ui/Badge';

const COLUMNS: TaskStatus[] = ['todo', 'in_progress', 'blocked', 'done'];

function TaskCard({ task, onClick }: { task: Task; onClick?: () => void }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: task.id });
  const style = transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` } : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      onClick={onClick}
      className={cn(
        'mb-2 cursor-grab rounded-xl border border-slate-200 bg-white p-3 shadow-soft transition hover:shadow-md active:cursor-grabbing dark:border-slate-800 dark:bg-slate-900',
        isDragging && 'opacity-50'
      )}
    >
      <div className="text-sm font-medium text-slate-900 dark:text-slate-100">{task.title}</div>
      {task.description && <div className="mt-1 line-clamp-2 text-xs text-slate-500">{task.description}</div>}
      <div className="mt-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {task.assignee_id && <Avatar size={22} name={task.assignee_name} email={task.assignee_email} />}
          <span className="text-[11px] text-slate-500">{task.completion_percentage}%</span>
        </div>
        {task.due_date && <Badge className="bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">{formatDate(task.due_date, 'MMM d')}</Badge>}
      </div>
    </div>
  );
}

function Column({ status, tasks, onCardClick }: { status: TaskStatus; tasks: Task[]; onCardClick: (t: Task) => void }) {
  const { t } = useI18n();
  const { setNodeRef, isOver } = useDroppable({ id: status });
  const meta = taskStatusMeta[status];

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'flex min-h-[420px] w-72 shrink-0 flex-col rounded-2xl border border-slate-200 bg-slate-50/60 p-3 transition dark:border-slate-800 dark:bg-slate-900/40',
        isOver && 'ring-2 ring-brand-500/50'
      )}
    >
      <div className="mb-3 flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <span className={cn('h-2 w-2 rounded-full', meta.dot)} />
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">{t(meta.labelKey)}</h3>
        </div>
        <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">{tasks.length}</span>
      </div>
      <div className="flex-1 overflow-y-auto">
        {tasks.length === 0 ? (
          <div className="flex h-24 items-center justify-center text-xs text-slate-400">—</div>
        ) : (
          tasks.map(t => <TaskCard key={t.id} task={t} onClick={() => onCardClick(t)} />)
        )}
      </div>
    </div>
  );
}

export function KanbanBoard({ tasks, onCardClick }: { tasks: Task[]; onCardClick: (t: Task) => void }) {
  const supabase = createClient();
  const [active, setActive] = useState<Task | null>(null);
  const [local, setLocal] = useState(tasks);

  // keep local state in sync when props change
  useMemo(() => setLocal(tasks), [tasks]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const byColumn = useMemo(() => {
    const map: Record<TaskStatus, Task[]> = { todo: [], in_progress: [], blocked: [], done: [] };
    for (const t of local) map[t.status].push(t);
    return map;
  }, [local]);

  const onDragStart = (e: DragStartEvent) => {
    const found = local.find(t => t.id === e.active.id);
    setActive(found ?? null);
  };

  const onDragEnd = async (e: DragEndEvent) => {
    setActive(null);
    const newStatus = e.over?.id as TaskStatus | undefined;
    if (!newStatus || !COLUMNS.includes(newStatus)) return;
    const task = local.find(t => t.id === e.active.id);
    if (!task || task.status === newStatus) return;

    const patch: Partial<Task> = { status: newStatus };
    if (newStatus === 'done') patch.completion_percentage = 100;
    setLocal(local.map(t => (t.id === task.id ? { ...t, ...patch } : t)));

    const { error } = await supabase.from('tasks').update(patch).eq('id', task.id);
    if (error) setLocal(local); // revert on failure
  };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={onDragStart} onDragEnd={onDragEnd}>
      <div className="flex gap-4 overflow-x-auto pb-2">
        {COLUMNS.map(c => (
          <Column key={c} status={c} tasks={byColumn[c]} onCardClick={onCardClick} />
        ))}
      </div>
      <DragOverlay>
        {active ? <TaskCard task={active} /> : null}
      </DragOverlay>
    </DndContext>
  );
}
