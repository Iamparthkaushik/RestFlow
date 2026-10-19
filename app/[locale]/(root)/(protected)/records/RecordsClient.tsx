"use client";

import { useState } from "react";
import { Link } from "@/i18n/routing";
import { motion, AnimatePresence } from "framer-motion";
import {
  Award,
  CheckCircle2,
  XCircle,
  Calendar,
  ChevronLeft,
  ChevronRight,
  ArrowLeft,
  Activity,
  Flame,
  Clock,
  Sparkles,
  Dumbbell,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { getRecordsData } from "@/lib/actions/workout";

interface RecordDayItem {
  dateString: string;
  dayOfWeek: number;
  dayName: string;
  status: "completed" | "missed" | "today-pending" | "upcoming" | "rest";
  title: string;
  completedAt: string | null;
  exercises: Array<{
    exerciseId?: string;
    name: string;
    primaryMuscleGroup?: string;
    setsCount?: number;
  }>;
  isScheduled: boolean;
  isToday: boolean;
  isPast: boolean;
}

interface RecordsData {
  weekOffset: number;
  weekStart: string;
  weekEnd: string;
  items: RecordDayItem[];
  stats: {
    completedCount: number;
    missedCount: number;
    totalScheduled: number;
    rate: number;
  };
}

export default function RecordsClient({ initialData }: { initialData: RecordsData }) {
  const [data, setData] = useState<RecordsData>(initialData);
  const [isLoadingWeek, setIsLoadingWeek] = useState(false);
  const [filter, setFilter] = useState<"all" | "completed" | "missed">("all");

  const changeWeek = async (newOffset: number) => {
    setIsLoadingWeek(true);
    try {
      const res = await getRecordsData(newOffset);
      if (res) setData(res);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoadingWeek(false);
    }
  };

  // Filter items
  const filteredItems = data.items.filter((item) => {
    if (filter === "completed") return item.status === "completed";
    if (filter === "missed") return item.status === "missed";
    // For "all", show completed, missed, or scheduled days
    return item.isScheduled || item.status === "completed" || item.status === "missed";
  });

  return (
    <div className="flex flex-col items-center w-full max-w-2xl mx-auto px-4 py-8 space-y-8 flex-1">
      {/* Top Nav & Breadcrumb */}
      <div className="w-full flex items-center justify-between">
        <Link
          href="/"
          className="inline-flex items-center text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4 mr-1.5" /> Back to Dashboard
        </Link>
        <span className="text-xs text-muted-foreground">
          Calisthenics Log
        </span>
      </div>

      {/* Page Title */}
      <div className="w-full text-center space-y-2">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-semibold">
          <Award className="w-3.5 h-3.5" />
          <span>Workout History &amp; Records</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">Records</h1>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          All your completed and missed workouts throughout the week. Workouts repeat automatically every week.
        </p>
      </div>

      {/* Week Selector */}
      <div className="w-full flex items-center justify-between p-2 rounded-2xl bg-muted/50 border">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => changeWeek(data.weekOffset - 1)}
          disabled={isLoadingWeek}
          className="rounded-xl h-9 text-xs"
        >
          <ChevronLeft className="h-4 w-4 mr-1" /> Previous Week
        </Button>

        <div className="text-center">
          <p className="font-bold text-xs sm:text-sm">
            {data.weekOffset === 0 ? "This Week" : data.weekOffset === -1 ? "Last Week" : `Week (${data.weekOffset > 0 ? "+" : ""}${data.weekOffset})`}
          </p>
          <p className="text-[11px] text-muted-foreground">
            {data.weekStart} to {data.weekEnd}
          </p>
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => changeWeek(data.weekOffset + 1)}
          disabled={isLoadingWeek || data.weekOffset >= 0}
          className="rounded-xl h-9 text-xs"
        >
          Next Week <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </div>

      {/* Weekly Stats Overview Cards */}
      <div className="grid grid-cols-3 gap-3 w-full">
        <div className="p-4 rounded-2xl border bg-card text-card-foreground shadow-xs text-center space-y-1">
          <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500 w-fit mx-auto">
            <CheckCircle2 className="h-4 w-4" />
          </div>
          <p className="text-2xl font-black">{data.stats.completedCount}</p>
          <p className="text-[11px] text-muted-foreground font-medium">Completed</p>
        </div>

        <div className="p-4 rounded-2xl border bg-card text-card-foreground shadow-xs text-center space-y-1">
          <div className="p-2 rounded-xl bg-rose-500/10 text-rose-500 w-fit mx-auto">
            <XCircle className="h-4 w-4" />
          </div>
          <p className="text-2xl font-black">{data.stats.missedCount}</p>
          <p className="text-[11px] text-muted-foreground font-medium">Missed</p>
        </div>

        <div className="p-4 rounded-2xl border bg-card text-card-foreground shadow-xs text-center space-y-1">
          <div className="p-2 rounded-xl bg-primary/10 text-primary w-fit mx-auto">
            <Flame className="h-4 w-4" />
          </div>
          <p className="text-2xl font-black">{data.stats.rate}%</p>
          <p className="text-[11px] text-muted-foreground font-medium">Consistency</p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex space-x-2 w-full border-b pb-2">
        <button
          onClick={() => setFilter("all")}
          className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${
            filter === "all"
              ? "bg-foreground text-background shadow-xs"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          All Days ({data.items.filter((i) => i.isScheduled).length})
        </button>
        <button
          onClick={() => setFilter("completed")}
          className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${
            filter === "completed"
              ? "bg-emerald-600 text-white shadow-xs"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Completed ({data.stats.completedCount})
        </button>
        <button
          onClick={() => setFilter("missed")}
          className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${
            filter === "missed"
              ? "bg-rose-600 text-white shadow-xs"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Missed ({data.stats.missedCount})
        </button>
      </div>

      {/* Records Items List */}
      <div className="w-full space-y-3">
        {filteredItems.length === 0 ? (
          <div className="p-10 rounded-3xl border bg-card text-center space-y-2">
            <Clock className="h-8 w-8 text-muted-foreground mx-auto opacity-40" />
            <p className="font-semibold text-sm">No records match this filter</p>
            <p className="text-xs text-muted-foreground">
              Try selecting &quot;All Days&quot; to see the entire week.
            </p>
          </div>
        ) : (
          filteredItems.map((item) => {
            const isCompleted = item.status === "completed";
            const isMissed = item.status === "missed";
            const isPendingToday = item.status === "today-pending";
            const isUpcoming = item.status === "upcoming";

            return (
              <motion.div
                key={item.dateString}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`p-5 rounded-2xl border transition-all ${
                  isCompleted
                    ? "bg-emerald-500/5 border-emerald-500/20"
                    : isMissed
                    ? "bg-rose-500/5 border-rose-500/20"
                    : isPendingToday
                    ? "bg-primary/5 border-primary/30"
                    : "bg-card border-border/70"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div
                      className={`p-2.5 rounded-xl mt-0.5 ${
                        isCompleted
                          ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                          : isMissed
                          ? "bg-rose-500/20 text-rose-600 dark:text-rose-400"
                          : isPendingToday
                          ? "bg-primary/20 text-primary"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {isCompleted ? (
                        <CheckCircle2 className="h-5 w-5" />
                      ) : isMissed ? (
                        <XCircle className="h-5 w-5" />
                      ) : isPendingToday ? (
                        <Activity className="h-5 w-5" />
                      ) : (
                        <Calendar className="h-5 w-5" />
                      )}
                    </div>
                    <div>
                      {/* Explicit Title Display */}
                      <h3 className="font-bold text-sm sm:text-base">
                        {item.title}
                      </h3>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {item.dayName} · {item.dateString}
                        {item.completedAt && (
                          <span>
                            {" "}
                            · Finished at{" "}
                            {new Date(item.completedAt).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        )}
                      </p>

                      {/* Exercises List */}
                      {item.exercises && item.exercises.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-2.5">
                          {item.exercises.map((ex, i) => (
                            <span
                              key={i}
                              className="text-[11px] px-2.5 py-0.5 rounded-lg bg-background/80 border text-muted-foreground font-medium"
                            >
                              {ex.name}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Explanation note */}
                      {isMissed && (
                        <p className="text-[11px] text-rose-600 dark:text-rose-400 mt-2 font-medium">
                          Workout was scheduled for {item.dayName} but was not completed.
                        </p>
                      )}
                      {isPendingToday && (
                        <p className="text-[11px] text-primary mt-2 font-medium">
                          Scheduled for today · Active on your Dashboard.
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Status Badge */}
                  <div>
                    {isCompleted && (
                      <span className="text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                        Completed
                      </span>
                    )}
                    {isMissed && (
                      <span className="text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider bg-rose-500/20 text-rose-600 dark:text-rose-400">
                        Missed
                      </span>
                    )}
                    {isPendingToday && (
                      <span className="text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider bg-primary/20 text-primary">
                        Today
                      </span>
                    )}
                    {isUpcoming && (
                      <span className="text-[10px] font-medium px-2.5 py-1 rounded-full uppercase tracking-wider bg-muted text-muted-foreground">
                        Upcoming
                      </span>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })
        )}
      </div>
    </div>
  );
}
