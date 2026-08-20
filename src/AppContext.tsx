import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import type {
  DailyEntry,
  CsatNote,
  TaskItem,
  EscalationItem,
  KPITarget,
  MoodCheckIn,
  MoodType,
  Reflection,
  JournalEntry,
  Insight,
  Achievement,
  QaEntry,
  CoachingPlan,
} from './types';
import { makeEmptyEntry } from './defaults';
import {
  loadEntries, saveEntry,
  loadCsatNotes, saveCsatNote, deleteCsatNote,
  loadTasks, saveTask, deleteTask,
  loadEscalations, saveEscalation, deleteEscalation,
  loadTargets, saveTargets,
  loadMoodCheckins, saveMoodCheckIn,
  loadReflections, saveReflection,
  loadJournal, saveJournalEntry, updateJournalEntryDb,
  loadInsights, saveInsight, updateInsightDismissed,
  loadAchievements, saveAchievement,
  loadQaEntries, saveQaEntry, deleteQaEntry,
  loadCoachingPlans, saveCoachingPlan, deleteCoachingPlan,
  nextTaskId, nextEscalationId,
  genId,
} from './storage';
import {
  generateRuleBasedInsights,
  checkAchievements,
} from './insights';

interface AppState {
  entries: Record<string, DailyEntry>;
  csatNotes: CsatNote[];
  tasks: TaskItem[];
  escalations: EscalationItem[];
  targets: KPITarget[];
  taskCounter: number;
  escalationCounter: number;
  moodCheckins: MoodCheckIn[];
  reflections: Record<string, Reflection>;
  qaEntries: Record<string, QaEntry>;
  coachingPlans: CoachingPlan[];
  journal: JournalEntry[];
  insights: Insight[];
  achievements: Achievement[];
  dismissedInsightIds: Set<string>;
}

interface Toast {
  id: number;
  message: string;
  severity: 'success' | 'info' | 'warning' | 'error';
}

interface AppContextValue extends AppState {
  loading: boolean;
  loadError: string | null;
  updateEntry: (date: string, patch: Partial<DailyEntry>) => void;
  getOrCreateEntry: (date: string) => DailyEntry;
  addCsatNote: (entryDate: string, rating: number, note: string | null) => void;
  removeCsatNote: (id: string) => void;
  addTask: (task: Omit<TaskItem, 'task_id' | 'created_at' | 'submitted_at'>) => void;
  updateTask: (task_id: string, patch: Partial<TaskItem>) => void;
  removeTask: (task_id: string) => void;
  addEscalation: (esc: Omit<EscalationItem, 'escalation_id' | 'created_at' | 'escalated_at'>) => void;
  updateEscalation: (escalation_id: string, patch: Partial<EscalationItem>) => void;
  removeEscalation: (escalation_id: string) => void;
  saveTargetsAndUpdate: (targets: KPITarget[]) => void;
  addMoodCheckIn: (mood: MoodType, checkinType: 'start' | 'reflection') => void;
  getMoodForDate: (date: string, checkinType?: 'start' | 'reflection') => MoodCheckIn | null;
  saveReflection: (date: string, reflection: Omit<Reflection, 'created_at'>) => void;
  getReflection: (date: string) => Reflection | null;
  upsertQaEntry: (weekStart: string, entry: Omit<QaEntry, 'created_at' | 'updated_at'>) => void;
  removeQaEntry: (weekStart: string) => void;
  upsertCoachingPlan: (plan: CoachingPlan) => void;
  removeCoachingPlan: (id: string) => void;
  addJournalEntry: (entry: Omit<JournalEntry, 'id' | 'created_at'>) => JournalEntry;
  updateJournalEntry: (id: string, patch: Partial<JournalEntry>) => void;
  addInsight: (insight: Omit<Insight, 'id' | 'created_at' | 'dismissed'>) => void;
  dismissInsight: (id: string) => void;
  refreshInsights: () => void;
  addAchievements: (achievements: Array<{ achievement_key: string; title: string; description: string }>) => void;
  notify: (message: string, severity?: Toast['severity']) => void;
}

const AppContext = createContext<AppContextValue | null>(null);

const EMPTY_STATE: AppState = {
  entries: {},
  csatNotes: [],
  tasks: [],
  escalations: [],
  targets: [],
  taskCounter: 0,
  escalationCounter: 0,
  moodCheckins: [],
  reflections: {},
  qaEntries: {},
  coachingPlans: [],
  journal: [],
  insights: [],
  achievements: [],
  dismissedInsightIds: new Set(),
};

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AppState>(EMPTY_STATE);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const toastIdRef = useRef(0);

  // Load all data from Supabase on mount
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [
          entries, csatNotes, tasks, escalations, targets,
          moodCheckins, reflections, journal, insights, achievements, qaEntries, coachingPlans,
        ] = await Promise.all([
          loadEntries(),
          loadCsatNotes(),
          loadTasks(),
          loadEscalations(),
          loadTargets(),
          loadMoodCheckins(),
          loadReflections(),
          loadJournal(),
          loadInsights(),
          loadAchievements(),
          loadQaEntries(),
          loadCoachingPlans(),
        ]);

        if (cancelled) return;

        setState({
          entries,
          csatNotes,
          tasks,
          escalations,
          targets,
          taskCounter: tasks.length,
          escalationCounter: escalations.length,
          moodCheckins,
          reflections,
          qaEntries,
          coachingPlans,
          journal,
          insights,
          achievements,
          dismissedInsightIds: new Set(insights.filter((i) => i.dismissed).map((i) => i.id)),
        });
        setLoading(false);
      } catch (err) {
        if (cancelled) return;
        setLoadError(err instanceof Error ? err.message : 'Failed to load your data.');
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const notify = useCallback((message: string, severity: Toast['severity'] = 'success') => {
    const id = ++toastIdRef.current;
    setToasts((prev) => [...prev, { id, message, severity }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
  }, []);

  const updateEntry = useCallback((date: string, patch: Partial<DailyEntry>) => {
    setState((prev) => {
      const existing = prev.entries[date] ?? makeEmptyEntry(date);
      const updated = { ...existing, ...patch };
      const nextEntries = { ...prev.entries, [date]: updated };
      saveEntry(date, updated).catch((e) => notify(`Save failed: ${e.message}`, 'error'));
      return { ...prev, entries: nextEntries };
    });
  }, [notify]);

  const getOrCreateEntry = useCallback(
    (date: string): DailyEntry => {
      return state.entries[date] ?? makeEmptyEntry(date);
    },
    [state.entries],
  );

  const addCsatNote = useCallback((entryDate: string, rating: number, note: string | null) => {
    setState((prev) => {
      const newNote: CsatNote = {
        id: genId(),
        entry_date: entryDate,
        rating,
        note,
        created_at: new Date().toISOString(),
      };
      const nextNotes = [newNote, ...prev.csatNotes];
      saveCsatNote(newNote).catch((e) => notify(`Save failed: ${e.message}`, 'error'));

      const existing = prev.entries[entryDate] ?? makeEmptyEntry(entryDate);
      const updatedEntry = {
        ...existing,
        csat_ratings: [...existing.csat_ratings, rating],
      };
      const nextEntries = { ...prev.entries, [entryDate]: updatedEntry };
      saveEntry(entryDate, updatedEntry).catch((e) => notify(`Save failed: ${e.message}`, 'error'));

      return { ...prev, csatNotes: nextNotes, entries: nextEntries };
    });
  }, [notify]);

  const removeCsatNote = useCallback((id: string) => {
    setState((prev) => {
      const note = prev.csatNotes.find((n) => n.id === id);
      if (!note) return prev;

      const nextNotes = prev.csatNotes.filter((n) => n.id !== id);
      deleteCsatNote(id).catch((e) => notify(`Delete failed: ${e.message}`, 'error'));

      const existing = prev.entries[note.entry_date] ?? makeEmptyEntry(note.entry_date);
      const idx = existing.csat_ratings.indexOf(note.rating);
      const newRatings = [...existing.csat_ratings];
      if (idx !== -1) newRatings.splice(idx, 1);
      const updatedEntry = { ...existing, csat_ratings: newRatings };
      const nextEntries = { ...prev.entries, [note.entry_date]: updatedEntry };
      saveEntry(note.entry_date, updatedEntry).catch((e) => notify(`Save failed: ${e.message}`, 'error'));

      return { ...prev, csatNotes: nextNotes, entries: nextEntries };
    });
  }, [notify]);

  const addTask = useCallback(
    (task: Omit<TaskItem, 'task_id' | 'created_at' | 'submitted_at'>) => {
      setState((prev) => {
        const counter = prev.taskCounter + 1;
        const newTaskId = nextTaskId(counter);
        const newTask: TaskItem = {
          ...task,
          source_task_id: task.source_task_id ?? newTaskId,
          completion_date: task.completion_date ?? task.linked_date,
          task_id: newTaskId,
          created_at: new Date().toISOString(),
          submitted_at: null,
        };
        const nextTasks = [newTask, ...prev.tasks];
        saveTask(newTask).catch((e) => notify(`Save failed: ${e.message}`, 'error'));
        const hours = Number(newTask.task_hours ?? 0);
        const nextEntries = hours > 0
          ? adjustEntryHours(prev.entries, newTask.linked_date, 'task_hours_logged', hours)
          : prev.entries;
        return { ...prev, tasks: nextTasks, taskCounter: counter, entries: nextEntries };
      });
    },
    [notify],
  );

  const updateTask = useCallback((task_id: string, patch: Partial<TaskItem>) => {
    setState((prev) => {
      const task = prev.tasks.find((t) => t.task_id === task_id);
      if (!task) return prev;
      const updated = { ...task, ...patch };
      const nextTasks = prev.tasks.map((t) =>
        t.task_id === task_id ? updated : t,
      );
      saveTask(updated).catch((e) => notify(`Save failed: ${e.message}`, 'error'));
      let nextEntries = prev.entries;
      const oldHours = Number(task.task_hours ?? 0);
      const newHours = Number(updated.task_hours ?? 0);
      const hourDelta = newHours - oldHours;

      if (hourDelta !== 0) {
        nextEntries = adjustEntryHours(nextEntries, updated.linked_date, 'task_hours_logged', hourDelta);
      }

      const oldCompletionDate = task.completion_date ?? task.linked_date;
      const newCompletionDate = updated.completion_date ?? updated.linked_date;
      if (task.status !== 'submitted' && updated.status === 'submitted') {
        nextEntries = adjustEntryHours(nextEntries, newCompletionDate, 'task_hours_submitted', newHours);
      } else if (task.status === 'submitted' && updated.status !== 'submitted') {
        nextEntries = adjustEntryHours(nextEntries, oldCompletionDate, 'task_hours_submitted', -oldHours);
      } else if (task.status === 'submitted' && updated.status === 'submitted' && oldCompletionDate !== newCompletionDate) {
        nextEntries = adjustEntryHours(nextEntries, oldCompletionDate, 'task_hours_submitted', -oldHours);
        nextEntries = adjustEntryHours(nextEntries, newCompletionDate, 'task_hours_submitted', newHours);
      } else if (task.status === 'submitted' && updated.status === 'submitted' && hourDelta !== 0) {
        nextEntries = adjustEntryHours(nextEntries, newCompletionDate, 'task_hours_submitted', hourDelta);
      }

      return { ...prev, tasks: nextTasks, entries: nextEntries };
    });
  }, [notify]);

  const removeTask = useCallback((task_id: string) => {
    setState((prev) => {
      const task = prev.tasks.find((t) => t.task_id === task_id);
      const nextTasks = prev.tasks.filter((t) => t.task_id !== task_id);
      deleteTask(task_id).catch((e) => notify(`Delete failed: ${e.message}`, 'error'));
      let nextEntries = prev.entries;
      if (task) {
        const hours = Number(task.task_hours ?? 0);
        if (hours > 0) {
          nextEntries = adjustEntryHours(nextEntries, task.linked_date, 'task_hours_logged', -hours);
          if (task.status === 'submitted') {
            nextEntries = adjustEntryHours(
              nextEntries,
              task.completion_date ?? task.linked_date,
              'task_hours_submitted',
              -hours,
            );
          }
        }
      }
      return { ...prev, tasks: nextTasks, entries: nextEntries };
    });
  }, [notify]);

  const addEscalation = useCallback(
    (esc: Omit<EscalationItem, 'escalation_id' | 'created_at' | 'escalated_at'>) => {
      setState((prev) => {
        const counter = prev.escalationCounter + 1;
        const newEsc: EscalationItem = {
          ...esc,
          escalation_id: nextEscalationId(counter),
          created_at: new Date().toISOString(),
          escalated_at: null,
        };
        const nextEscalations = [newEsc, ...prev.escalations];
        saveEscalation(newEsc).catch((e) => notify(`Save failed: ${e.message}`, 'error'));

        const today = new Date().toISOString().slice(0, 10);
        const existing = prev.entries[today] ?? makeEmptyEntry(today);
        const updatedEntry = {
          ...existing,
          escalations_raised: existing.escalations_raised + 1,
        };
        const nextEntries = { ...prev.entries, [today]: updatedEntry };
        saveEntry(today, updatedEntry).catch((e) => notify(`Save failed: ${e.message}`, 'error'));

        return {
          ...prev,
          escalations: nextEscalations,
          escalationCounter: counter,
          entries: nextEntries,
        };
      });
    },
    [notify],
  );

  const updateEscalation = useCallback(
    (escalation_id: string, patch: Partial<EscalationItem>) => {
      setState((prev) => {
        const esc = prev.escalations.find((e) => e.escalation_id === escalation_id);
        if (!esc) return prev;
        const updated = { ...esc, ...patch };
        const nextEscalations = prev.escalations.map((e) =>
          e.escalation_id === escalation_id ? updated : e,
        );
        saveEscalation(updated).catch((e) => notify(`Save failed: ${e.message}`, 'error'));
        return { ...prev, escalations: nextEscalations };
      });
    },
    [notify],
  );

  const removeEscalation = useCallback((escalation_id: string) => {
    setState((prev) => {
      const nextEscalations = prev.escalations.filter((e) => e.escalation_id !== escalation_id);
      deleteEscalation(escalation_id).catch((e) => notify(`Delete failed: ${e.message}`, 'error'));
      return { ...prev, escalations: nextEscalations };
    });
  }, [notify]);

  const saveTargetsAndUpdate = useCallback((targets: KPITarget[]) => {
    setState((prev) => {
      saveTargets(targets).catch((e) => notify(`Save failed: ${e.message}`, 'error'));
      return { ...prev, targets };
    });
  }, [notify]);

  const addMoodCheckIn = useCallback((mood: MoodType, checkinType: 'start' | 'reflection') => {
    setState((prev) => {
      const today = new Date().toISOString().slice(0, 10);
      const filtered = prev.moodCheckins.filter(
        (m) => !(m.entry_date === today && m.checkin_type === checkinType),
      );
      const newCheckIn: MoodCheckIn = {
        id: genId(),
        entry_date: today,
        mood,
        checkin_type: checkinType,
        created_at: new Date().toISOString(),
      };
      const nextCheckins = [...filtered, newCheckIn];
      saveMoodCheckIn(newCheckIn).catch((e) => notify(`Save failed: ${e.message}`, 'error'));
      return { ...prev, moodCheckins: nextCheckins };
    });
  }, [notify]);

  const getMoodForDate = useCallback(
    (date: string, checkinType: 'start' | 'reflection' = 'start'): MoodCheckIn | null => {
      const found = state.moodCheckins.find(
        (m) => m.entry_date === date && m.checkin_type === checkinType,
      );
      return found ?? null;
    },
    [state.moodCheckins],
  );

  const saveReflectionAction = useCallback((date: string, reflection: Omit<Reflection, 'created_at'>) => {
    setState((prev) => {
      const full: Reflection = {
        ...reflection,
        created_at: new Date().toISOString(),
      };
      const nextReflections = { ...prev.reflections, [date]: full };
      saveReflection(date, full).catch((e) => notify(`Save failed: ${e.message}`, 'error'));
      return { ...prev, reflections: nextReflections };
    });
  }, [notify]);

  const getReflection = useCallback(
    (date: string): Reflection | null => {
      return state.reflections[date] ?? null;
    },
    [state.reflections],
  );

  const upsertQaEntry = useCallback(
    (weekStart: string, entry: Omit<QaEntry, 'created_at' | 'updated_at'>) => {
      setState((prev) => {
        const now = new Date().toISOString();
        const existing = prev.qaEntries[weekStart];
        const full: QaEntry = {
          ...entry,
          week_start: weekStart,
          created_at: existing?.created_at ?? now,
          updated_at: now,
        };
        const nextQa = { ...prev.qaEntries, [weekStart]: full };
        saveQaEntry(weekStart, full).catch((e) => notify(`Save failed: ${e.message}`, 'error'));
        return { ...prev, qaEntries: nextQa };
      });
    },
    [notify],
  );

  const removeQaEntry = useCallback((weekStart: string) => {
    setState((prev) => {
      const nextQa = { ...prev.qaEntries };
      delete nextQa[weekStart];
      deleteQaEntry(weekStart).catch((e) => notify(`Delete failed: ${e.message}`, 'error'));
      return { ...prev, qaEntries: nextQa };
    });
  }, [notify]);

  const adjustEntryHours = (
    entries: Record<string, DailyEntry>,
    date: string,
    key: 'task_hours_logged' | 'task_hours_submitted',
    delta: number,
  ): Record<string, DailyEntry> => {
    if (delta === 0) return entries;
    const existing = entries[date] ?? makeEmptyEntry(date);
    const updated = {
      ...existing,
      [key]: Math.max(0, (existing[key] as number) + delta),
    } as DailyEntry;
    const nextEntries = { ...entries, [date]: updated };
    saveEntry(date, updated).catch((e) => notify(`Save failed: ${e.message}`, 'error'));
    return nextEntries;
  };

  const upsertCoachingPlan = useCallback((plan: CoachingPlan) => {
    setState((prev) => {
      const now = new Date().toISOString();
      const existing = prev.coachingPlans.find((p) => p.id === plan.id);
      const full: CoachingPlan = {
        ...plan,
        created_at: existing?.created_at ?? plan.created_at ?? now,
        updated_at: now,
      };
      const nextPlans = existing
        ? prev.coachingPlans.map((p) => (p.id === full.id ? full : p))
        : [full, ...prev.coachingPlans];
      saveCoachingPlan(full).catch((e) => notify(`Save failed: ${e.message}`, 'error'));
      return { ...prev, coachingPlans: nextPlans };
    });
  }, [notify]);

  const removeCoachingPlan = useCallback((id: string) => {
    setState((prev) => {
      const nextPlans = prev.coachingPlans.filter((p) => p.id !== id);
      deleteCoachingPlan(id).catch((e) => notify(`Delete failed: ${e.message}`, 'error'));
      return { ...prev, coachingPlans: nextPlans };
    });
  }, [notify]);

  const addJournalEntry = useCallback((entry: Omit<JournalEntry, 'id' | 'created_at'>): JournalEntry => {
    const newEntry: JournalEntry = {
      ...entry,
      id: genId(),
      created_at: new Date().toISOString(),
    };
    setState((prev) => {
      const nextJournal = [...prev.journal, newEntry];
      saveJournalEntry(newEntry).catch((e) => notify(`Save failed: ${e.message}`, 'error'));
      return { ...prev, journal: nextJournal };
    });
    return newEntry;
  }, [notify]);

  const updateJournalEntry = useCallback((id: string, patch: Partial<JournalEntry>) => {
    setState((prev) => {
      const nextJournal = prev.journal.map((j) =>
        j.id === id ? { ...j, ...patch } : j,
      );
      updateJournalEntryDb(id, patch).catch((e) => notify(`Save failed: ${e.message}`, 'error'));
      return { ...prev, journal: nextJournal };
    });
  }, [notify]);

  const addInsight = useCallback((insight: Omit<Insight, 'id' | 'created_at' | 'dismissed'>) => {
    setState((prev) => {
      const newInsight: Insight = {
        ...insight,
        id: genId(),
        dismissed: false,
        created_at: new Date().toISOString(),
      };
      const nextInsights = [newInsight, ...prev.insights];
      saveInsight(newInsight).catch((e) => notify(`Save failed: ${e.message}`, 'error'));
      return { ...prev, insights: nextInsights };
    });
  }, [notify]);

  const dismissInsight = useCallback((id: string) => {
    setState((prev) => {
      const nextInsights = prev.insights.map((i) =>
        i.id === id ? { ...i, dismissed: true } : i,
      );
      updateInsightDismissed(id, true).catch((e) => notify(`Save failed: ${e.message}`, 'error'));
      const nextDismissed = new Set([...prev.dismissedInsightIds, id]);
      return { ...prev, insights: nextInsights, dismissedInsightIds: nextDismissed };
    });
  }, [notify]);

  const refreshInsights = useCallback(() => {
    setState((prev) => {
      const existingTitles = new Set(prev.insights.map((i) => i.title));
      const newInsights = generateRuleBasedInsights(
        prev.entries,
        prev.targets,
        prev.reflections,
        prev.journal,
        prev.moodCheckins,
        existingTitles,
      );

      if (newInsights.length === 0) return prev;

      const newFull: Insight[] = newInsights.map((i) => ({
        ...i,
        id: genId(),
        dismissed: false,
        created_at: new Date().toISOString(),
      }));

      for (const insight of newFull) {
        saveInsight(insight).catch((e) => notify(`Save failed: ${e.message}`, 'error'));
      }

      const nextInsights = [...newFull, ...prev.insights];

      const newAchievements = checkAchievements(
        prev.reflections,
        prev.entries,
        prev.journal,
        prev.moodCheckins,
        new Set(prev.achievements.map((a) => a.achievement_key)),
      );

      let nextAchievements = prev.achievements;
      if (newAchievements.length > 0) {
        const newFullAch: Achievement[] = newAchievements.map((a) => ({
          ...a,
          unlocked_at: new Date().toISOString(),
        }));
        nextAchievements = [...newFullAch, ...prev.achievements];
        for (const a of newFullAch) {
          saveAchievement(a).catch((e) => notify(`Save failed: ${e.message}`, 'error'));
        }
      }

      return { ...prev, insights: nextInsights, achievements: nextAchievements };
    });
  }, [notify]);

  const addAchievements = useCallback(
    (achievements: Array<{ achievement_key: string; title: string; description: string }>) => {
      setState((prev) => {
        const newFull: Achievement[] = achievements.map((a) => ({
          ...a,
          unlocked_at: new Date().toISOString(),
        }));
        const nextAchievements = [...newFull, ...prev.achievements];
        for (const a of newFull) {
          saveAchievement(a).catch((e) => notify(`Save failed: ${e.message}`, 'error'));
        }
        return { ...prev, achievements: nextAchievements };
      });
    },
    [notify],
  );

  useEffect(() => {
    if (loading) return;
    const timeout = setTimeout(() => {
      refreshInsights();
    }, 1500);
    return () => clearTimeout(timeout);
  }, [loading, refreshInsights]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', gap: 2 }}>
        <CircularProgress />
        <Typography color="text.secondary">Loading your data...</Typography>
      </Box>
    );
  }

  if (loadError) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', gap: 2, p: 3 }}>
        <Alert severity="error" sx={{ maxWidth: 400 }}>
          {loadError}
        </Alert>
        <Typography variant="body2" color="text.secondary">
          Please refresh the page to try again.
        </Typography>
      </Box>
    );
  }

  return (
    <AppContext.Provider
      value={{
        ...state,
        loading,
        loadError,
        updateEntry,
        getOrCreateEntry,
        addCsatNote,
        removeCsatNote,
        addTask,
        updateTask,
        removeTask,
        addEscalation,
        updateEscalation,
        removeEscalation,
        saveTargetsAndUpdate,
        addMoodCheckIn,
        getMoodForDate,
        saveReflection: saveReflectionAction,
        getReflection,
        upsertQaEntry,
        removeQaEntry,
        upsertCoachingPlan,
        removeCoachingPlan,
        addJournalEntry,
        updateJournalEntry,
        addInsight,
        dismissInsight,
        refreshInsights,
        addAchievements,
        notify,
      }}
    >
      {children}
      {toasts.map((toast) => (
        <Snackbar
          key={toast.id}
          open
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
          sx={{ bottom: { xs: 16, sm: 24 } }}
        >
          <Alert
            severity={toast.severity}
            variant="filled"
            sx={{ width: '100%', borderRadius: 2, boxShadow: 6 }}
          >
            {toast.message}
          </Alert>
        </Snackbar>
      ))}
    </AppContext.Provider>
  );
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
