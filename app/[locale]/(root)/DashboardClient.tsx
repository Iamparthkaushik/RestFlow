"use client";

import { useState, useTransition } from "react";
import { Link } from "@/i18n/routing";
import { motion, AnimatePresence } from "framer-motion";
import {
  Activity,
  Zap,
  CheckCircle2,
  XCircle,
  Calendar,
  Clock,
  Edit3,
  Plus,
  Trash2,
  ChevronRight,
  Flame,
  Award,
  ArrowRight,
  Loader2,
  Check,
  Dumbbell,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  saveSchedule,
  deleteSchedule,
  completeWorkoutSession,
  getUserDashboardData,
} from "@/lib/actions/workout";

const DAYS_ORDER = [
  { day: 1, name: "Monday", short: "Mon" },
  { day: 2, name: "Tuesday", short: "Tue" },
  { day: 3, name: "Wednesday", short: "Wed" },
  { day: 4, name: "Thursday", short: "Thu" },
  { day: 5, name: "Friday", short: "Fri" },
  { day: 6, name: "Saturday", short: "Sat" },
  { day: 0, name: "Sunday", short: "Sun" },
];

interface ExerciseItem {
  _id: string;
  name: string;
  icon?: string;
  primaryMuscleGroup?: string;
}

interface ActiveSession {
  dayOfWeek: number;
  dayName: string;
  headerTitle: string; // "Today's Plan", "Tomorrow's Plan", "Wednesday's Plan", etc.
  offset: number;
  isToday: boolean;
  isTomorrow: boolean;
  exercises: ExerciseItem[];
}

interface RecordItem {
  _id: string;
  dateString: string;
  dayOfWeek: number;
  dayName: string;
  status: "completed" | "missed";
  title: string;
  completedAt: string | null;
  exercises: Array<{
    exerciseId?: string;
    name: string;
    primaryMuscleGroup?: string;
    setsCount?: number;
  }>;
}

interface DashboardData {
  todayDateString: string;
  todayDayOfWeek: number;
  todayDayName: string;
  todayCompleted: boolean;
  hasAnySchedule: boolean;
  activeSessions: ActiveSession[];
  records: RecordItem[];
  allExercises: ExerciseItem[];
  schedulesByDay: Record<number, any>;
}

export default function DashboardClient({
  initialData,
  userName,
}: {
  initialData: DashboardData;
  userName?: string;
}) {
  const [data, setData] = useState<DashboardData>(initialData);
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();

  // Edit Modal State
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingDay, setEditingDay] = useState<number>(initialData.todayDayOfWeek);
  const [editingExercises, setEditingExercises] = useState<ExerciseItem[]>([]);
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Refresh dashboard data
  const refreshData = async () => {
    try {
      const fresh = await getUserDashboardData();
      if (fresh) setData(fresh);
    } catch (e) {
      console.error(e);
    }
  };

  // Open modal for a specific day
  const handleOpenEdit = (dayOfWeek: number) => {
    setEditingDay(dayOfWeek);
    const existing = data.schedulesByDay[dayOfWeek]?.exercises || [];
    setEditingExercises(existing);
    setEditModalOpen(true);
  };

  // Save changes from modal
  const handleSaveModal = async () => {
    setIsSavingEdit(true);
    try {
      await saveSchedule(
        editingDay,
        editingExercises.map((e) => e._id)
      );
      toast({
        title: "Session updated!",
        description: `Your workout session for ${DAYS_ORDER.find((d) => d.day === editingDay)?.name} has been saved and will repeat weekly.`,
      });
      setEditModalOpen(false);
      await refreshData();
    } catch (e) {
      toast({
        title: "Failed to save session",
        variant: "destructive",
      });
    } finally {
      setIsSavingEdit(false);
    }
  };

  // Clear day (make rest day)
  const handleClearDay = async () => {
    setIsSavingEdit(true);
    try {
      await deleteSchedule(editingDay);
      toast({
        title: "Session cleared",
        description: `${DAYS_ORDER.find((d) => d.day === editingDay)?.name} is now set as a rest day.`,
      });
      setEditModalOpen(false);
      await refreshData();
    } catch (e) {
      toast({
        title: "Failed to clear session",
        variant: "destructive",
      });
    } finally {
      setIsSavingEdit(false);
    }
  };

  // Quick mark today's workout as complete
  const handleQuickCompleteToday = async () => {
    startTransition(async () => {
      try {
        const todaySession = data.activeSessions.find((s) => s.isToday);
        const exerciseIds = todaySession?.exercises.map((e) => e._id) || [];
        await completeWorkoutSession({
          dayOfWeek: data.todayDayOfWeek,
          exerciseIds,
        });
        toast({
          title: "🎉 Workout Finished!",
          description: "Today's workout completed and secured in Records. It has been cleared from active dashboard.",
        });
        await refreshData();
      } catch (e) {
        toast({
          title: "Failed to mark workout complete",
          variant: "destructive",
        });
      }
    });
  };

  // Toggle exercise in modal
  const toggleModalExercise = (ex: ExerciseItem) => {
    if (editingExercises.find((e) => e._id === ex._id)) {
      setEditingExercises(editingExercises.filter((e) => e._id !== ex._id));
    } else {
      setEditingExercises([...editingExercises, ex]);
    }
  };

  const editingDayObj = DAYS_ORDER.find((d) => d.day === editingDay) || DAYS_ORDER[0];

  return (
    <div className="flex flex-col items-center w-full max-w-2xl mx-auto px-4 py-8 space-y-8 flex-1">
      {/* Top Welcome Header */}
      <div className="w-full text-center space-y-2">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold">
          <Sparkles className="w-3.5 h-3.5" />
          <span>7-Day Recurring Schedule</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
          Welcome back, {userName || "Athlete"}
        </h1>
        <p className="text-sm text-muted-foreground">
          {data.todayCompleted
            ? "You've finished your workout for today! Recovery is just as important as training."
            : "Plan, train, and track your weekly calisthenics routine."}
        </p>
      </div>

      {/* If No Schedule Configured At All */}
      {!data.hasAnySchedule ? (
        <div className="w-full p-8 rounded-3xl border bg-card text-card-foreground shadow-sm flex flex-col items-center text-center space-y-4">
          <div className="p-4 rounded-full bg-primary/10 text-primary">
            <Activity className="h-8 w-8" />
          </div>
          <h2 className="text-xl font-bold">No Schedule Set Yet</h2>
          <p className="text-sm text-muted-foreground max-w-sm">
            Set up your weekly routine from Monday to Sunday. Each day can have one workout session that automatically repeats every week.
          </p>
          <Link
            href="/schedule"
            className="inline-flex h-12 items-center justify-center rounded-full bg-primary px-8 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90 mt-2"
          >
            Create Weekly Schedule <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </div>
      ) : (
        <>
          {/* Today's Completed Celebration Banner */}
          {data.todayCompleted && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="w-full p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-between shadow-sm"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-500">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-semibold text-sm">Today&apos;s Workout Completed!</p>
                  <p className="text-xs text-muted-foreground">
                    Saved in Records · Showing upcoming days below
                  </p>
                </div>
              </div>
              <a
                href="#records-section"
                className="text-xs font-semibold underline underline-offset-4 hover:opacity-80"
              >
                View Records
              </a>
            </motion.div>
          )}

          {/* ACTIVE SESSIONS LIST (Strictly ordered: Today, Tomorrow, Wednesday, etc.) */}
          <div className="w-full space-y-4">
            <div className="flex items-center justify-between px-1">
              <h2 className="text-lg font-bold tracking-tight flex items-center gap-2">
                <Dumbbell className="h-5 w-5 text-primary" />
                <span>Active Workout Sessions</span>
              </h2>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleOpenEdit(data.todayDayOfWeek)}
                className="rounded-full text-xs h-8"
              >
                <Plus className="h-3.5 w-3.5 mr-1" /> Add / Plan Session
              </Button>
            </div>

            {data.activeSessions.length === 0 ? (
              <div className="p-8 rounded-3xl border bg-card text-center space-y-3">
                <div className="p-3 rounded-full bg-primary/10 text-primary w-fit mx-auto">
                  <Award className="h-6 w-6" />
                </div>
                <h3 className="font-bold text-base">All Scheduled Workouts Done!</h3>
                <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                  No active workouts pending for the rest of this cycle. All completed workouts are safely stored in your Records below.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleOpenEdit(data.todayDayOfWeek)}
                  className="rounded-full mt-2"
                >
                  <Plus className="h-3.5 w-3.5 mr-1" /> Plan Another Session
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {data.activeSessions.map((session, index) => {
                  const isTopSession = index === 0;

                  return (
                    <motion.div
                      key={session.dayOfWeek}
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.06 }}
                      className={`rounded-3xl border bg-card text-card-foreground shadow-sm transition-all overflow-hidden ${
                        session.isToday
                          ? "ring-2 ring-primary/40 border-primary/40 shadow-md"
                          : "hover:border-primary/20"
                      }`}
                    >
                      {/* Card Header with respected title */}
                      <div className="p-5 sm:p-6 pb-4 border-b bg-muted/20 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div
                            className={`p-2.5 rounded-2xl ${
                              session.isToday
                                ? "bg-primary text-primary-foreground shadow-sm"
                                : "bg-muted text-muted-foreground"
                            }`}
                          >
                            <Calendar className="h-5 w-5" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              {/* Header title: "Today's Plan", "Tomorrow's Plan", "Wednesday's Plan", etc. */}
                              <h3 className="text-lg font-bold tracking-tight">
                                {session.headerTitle}
                              </h3>
                              {session.isToday && (
                                <span className="px-2 py-0.5 rounded-full bg-primary/20 text-primary text-[10px] font-bold uppercase tracking-wider">
                                  Today
                                </span>
                              )}
                              {session.isTomorrow && (
                                <span className="px-2 py-0.5 rounded-full bg-muted text-muted-foreground text-[10px] font-semibold uppercase tracking-wider">
                                  Tomorrow
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {session.dayName} · Repeats every week
                            </p>
                          </div>
                        </div>

                        {/* Edit Button on the Dashboard */}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenEdit(session.dayOfWeek)}
                          className="rounded-full text-xs h-8 px-3 text-muted-foreground hover:text-foreground"
                          title="Edit this session"
                        >
                          <Edit3 className="h-3.5 w-3.5 mr-1.5" />
                          <span>Edit</span>
                        </Button>
                      </div>

                      {/* Exercises List */}
                      <div className="p-5 sm:p-6 space-y-3">
                        <div className="space-y-2">
                          {session.exercises.map((ex, exIdx) => (
                            <div
                              key={ex._id || exIdx}
                              className="flex items-center justify-between p-3 rounded-2xl bg-muted/40 border border-border/50 text-sm"
                            >
                              <div className="flex items-center gap-3">
                                <div className="p-2 rounded-xl bg-background shadow-xs text-primary">
                                  <Activity className="h-4 w-4" />
                                </div>
                                <span className="font-semibold text-sm">{ex.name}</span>
                              </div>
                              {ex.primaryMuscleGroup && (
                                <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-background/80 text-muted-foreground capitalize border">
                                  {ex.primaryMuscleGroup}
                                </span>
                              )}
                            </div>
                          ))}
                        </div>

                        {/* Action buttons */}
                        <div className="pt-2 flex flex-col sm:flex-row gap-2">
                          {session.isToday ? (
                            <>
                              <Link
                                href="/workout"
                                className="flex-1 inline-flex h-12 items-center justify-center rounded-full bg-primary px-6 text-sm font-semibold text-primary-foreground shadow transition-colors hover:bg-primary/90"
                              >
                                Start Workout <Zap className="ml-2 h-4 w-4 fill-current" />
                              </Link>
                              <Button
                                variant="outline"
                                onClick={handleQuickCompleteToday}
                                disabled={isPending}
                                className="h-12 rounded-full px-5 text-xs font-semibold"
                              >
                                {isPending ? (
                                  <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
                                ) : (
                                  <Check className="h-4 w-4 mr-1.5 text-emerald-500" />
                                )}
                                Mark Completed
                              </Button>
                            </>
                          ) : (
                            <div className="w-full flex items-center justify-between text-xs text-muted-foreground pt-1">
                              <span>Ready for {session.dayName}</span>
                              <Link
                                href={`/workout?day=${session.dayOfWeek}`}
                                className="inline-flex items-center font-medium text-primary hover:underline"
                              >
                                Start Early <ChevronRight className="h-3.5 w-3.5 ml-0.5" />
                              </Link>
                            </div>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>

          {/* RECORDS SECTION */}
          {/* Exact requirement: "make this section name as 'Records' here all the workout that are completed and not completed through out the week are stored if the workout is completed for the day it is stored as completed if it is not completed it is stored as missed it should just be shown as the days workout missed" */}
          <div id="records-section" className="w-full space-y-4 pt-4">
            <div className="flex items-center justify-between px-1">
              <div>
                <h2 className="text-xl font-bold tracking-tight flex items-center gap-2">
                  <Award className="h-5 w-5 text-emerald-500" />
                  <span>Records</span>
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Completed & missed workouts throughout the week
                </p>
              </div>
              <Link
                href="/records"
                className="text-xs font-medium text-primary hover:underline inline-flex items-center"
              >
                View Full Log <ArrowRight className="h-3.5 w-3.5 ml-1" />
              </Link>
            </div>

            {data.records.length === 0 ? (
              <div className="p-6 rounded-3xl border bg-card text-center space-y-2">
                <Clock className="h-8 w-8 text-muted-foreground mx-auto opacity-40" />
                <p className="font-medium text-sm">No Records Logged Yet This Week</p>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                  When you complete a workout it will appear here as completed and disappear from the active plans. Any missed workout day will be recorded as missed.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {data.records.map((record) => {
                  const isCompleted = record.status === "completed";

                  return (
                    <motion.div
                      key={record._id || record.dateString}
                      initial={{ opacity: 0, scale: 0.98 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className={`p-4 sm:p-5 rounded-2xl border transition-all ${
                        isCompleted
                          ? "bg-emerald-500/5 border-emerald-500/20 text-card-foreground"
                          : "bg-rose-500/5 border-rose-500/20 text-card-foreground"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3">
                          <div
                            className={`p-2 rounded-xl mt-0.5 ${
                              isCompleted
                                ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                                : "bg-rose-500/20 text-rose-600 dark:text-rose-400"
                            }`}
                          >
                            {isCompleted ? (
                              <CheckCircle2 className="h-5 w-5" />
                            ) : (
                              <XCircle className="h-5 w-5" />
                            )}
                          </div>
                          <div>
                            {/* Title format: e.g. "Monday's workout - Completed" or "Monday's workout missed" */}
                            <h4 className="font-bold text-sm sm:text-base">
                              {record.title}
                            </h4>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {record.dayName} · {record.dateString}
                              {record.completedAt && (
                                <span>
                                  {" "}
                                  · Finished at{" "}
                                  {new Date(record.completedAt).toLocaleTimeString([], {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}
                                </span>
                              )}
                            </p>

                            {/* Exercises in this record */}
                            {record.exercises && record.exercises.length > 0 && (
                              <div className="flex flex-wrap gap-1.5 mt-2.5">
                                {record.exercises.map((ex, i) => (
                                  <span
                                    key={i}
                                    className="text-[11px] px-2 py-0.5 rounded-lg bg-background/80 border text-muted-foreground font-medium"
                                  >
                                    {ex.name}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Status Badge */}
                        <span
                          className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider ${
                            isCompleted
                              ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                              : "bg-rose-500/20 text-rose-600 dark:text-rose-400"
                          }`}
                        >
                          {isCompleted ? "Completed" : "Missed"}
                        </span>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}

      {/* SESSION EDITOR MODAL (Can edit any day's workout from dashboard) */}
      <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
        <DialogContent className="max-w-md rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center justify-between">
              <span>Edit {editingDayObj.name}&apos;s Session</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Workouts are scheduled once per day (Monday to Sunday) and repeat every week on that same day.
            </DialogDescription>
          </DialogHeader>

          {/* Day Selector inside Modal */}
          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">
                Select Day of the Week:
              </label>
              <div className="flex space-x-1.5 overflow-x-auto pb-1 scrollbar-hide">
                {DAYS_ORDER.map((d) => (
                  <button
                    key={d.day}
                    type="button"
                    onClick={() => {
                      setEditingDay(d.day);
                      const existing = data.schedulesByDay[d.day]?.exercises || [];
                      setEditingExercises(existing);
                    }}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                      editingDay === d.day
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "bg-muted text-muted-foreground hover:bg-muted/80"
                    }`}
                  >
                    {d.short}
                  </button>
                ))}
              </div>
            </div>

            {/* Current Exercises in this session */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-muted-foreground">
                  Exercises for {editingDayObj.name} ({editingExercises.length})
                </label>
                {/* Dropdown to add exercises */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="rounded-full text-xs h-7">
                      <Plus className="h-3.5 w-3.5 mr-1" /> Add Exercise
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56 max-h-[250px] overflow-y-auto rounded-xl">
                    {data.allExercises
                      .filter((ex) => !editingExercises.find((e) => e._id === ex._id))
                      .map((ex) => (
                        <DropdownMenuItem
                          key={ex._id}
                          onClick={() => toggleModalExercise(ex)}
                          className="cursor-pointer rounded-lg py-2"
                        >
                          <Activity className="h-3.5 w-3.5 mr-2 text-primary" />
                          <span>{ex.name}</span>
                        </DropdownMenuItem>
                      ))}
                    {data.allExercises.filter(
                      (ex) => !editingExercises.find((e) => e._id === ex._id)
                    ).length === 0 && (
                      <DropdownMenuItem disabled className="text-center justify-center opacity-50">
                        All exercises added
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {editingExercises.length === 0 ? (
                <div className="p-6 rounded-2xl border border-dashed text-center text-xs text-muted-foreground space-y-1">
                  <p className="font-medium">No exercises planned</p>
                  <p>This day will be saved as a Rest Day.</p>
                </div>
              ) : (
                <div className="max-h-[200px] overflow-y-auto space-y-1.5 pr-1">
                  {editingExercises.map((ex) => (
                    <div
                      key={ex._id}
                      className="flex items-center justify-between p-2.5 rounded-xl bg-muted/50 border text-sm"
                    >
                      <div className="flex items-center gap-2.5">
                        <Activity className="h-4 w-4 text-primary" />
                        <span className="font-medium text-xs">{ex.name}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => toggleModalExercise(ex)}
                        className="p-1 text-muted-foreground hover:text-destructive transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-between pt-4 border-t gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleClearDay}
                disabled={isSavingEdit || editingExercises.length === 0}
                className="text-xs text-destructive hover:bg-destructive/10 rounded-full"
              >
                Clear Day
              </Button>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setEditModalOpen(false)}
                  className="rounded-full text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={handleSaveModal}
                  disabled={isSavingEdit}
                  className="rounded-full text-xs px-5 shadow-sm"
                >
                  {isSavingEdit ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                  ) : (
                    <Check className="h-3.5 w-3.5 mr-1.5" />
                  )}
                  Save Session
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
