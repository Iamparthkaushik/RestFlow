"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { getUserSchedule, saveSchedule } from "@/lib/actions/workout";
import { Activity, Plus, Trash2, Save, Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type Exercise = {
  _id: string;
  name: string;
  icon: string;
  primaryMuscleGroup: string;
};

const DAYS = [
  { index: 1, name: "Monday", short: "Mon" },
  { index: 2, name: "Tuesday", short: "Tue" },
  { index: 3, name: "Wednesday", short: "Wed" },
  { index: 4, name: "Thursday", short: "Thu" },
  { index: 5, name: "Friday", short: "Fri" },
  { index: 6, name: "Saturday", short: "Sat" },
  { index: 0, name: "Sunday", short: "Sun" },
];

export default function ScheduleClient({ allExercises }: { allExercises: Exercise[] }) {
  const [activeDay, setActiveDay] = useState(new Date().getDay());
  const [selectedExercises, setSelectedExercises] = useState<Exercise[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const dayParam = params.get("day");
      if (dayParam !== null && !isNaN(Number(dayParam))) {
        setActiveDay(Number(dayParam));
      }
    }
  }, []);

  useEffect(() => {
    loadSchedule(activeDay);
  }, [activeDay]);

  const loadSchedule = async (day: number) => {
    setIsLoading(true);
    try {
      const schedule = await getUserSchedule(day);
      if (schedule && schedule.exercises) {
        // Map populated exercise objects back to our state
        const mapped = schedule.exercises.map((e: any) => e.exerciseId);
        setSelectedExercises(mapped.filter(Boolean));
      } else {
        setSelectedExercises([]);
      }
    } catch (e) {
      console.error(e);
      toast({ title: "Failed to load schedule", variant: "destructive" });
    }
    setIsLoading(false);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await saveSchedule(activeDay, selectedExercises.map(e => e._id));
      toast({ title: "Schedule saved!" });
    } catch (e) {
      toast({ title: "Failed to save schedule", variant: "destructive" });
    }
    setIsSaving(false);
  };

  const toggleExercise = (ex: Exercise) => {
    if (selectedExercises.find(e => e._id === ex._id)) {
      setSelectedExercises(selectedExercises.filter(e => e._id !== ex._id));
    } else {
      setSelectedExercises([...selectedExercises, ex]);
    }
  };

  const currentDayObj = DAYS.find(d => d.index === activeDay) || DAYS[0];

  return (
    <div className="space-y-6">
      {/* Day Selector - Monday through Sunday */}
      <div className="flex space-x-2 overflow-x-auto pb-2 scrollbar-hide">
        {DAYS.map((d) => (
          <button
            key={d.name}
            onClick={() => setActiveDay(d.index)}
            className={`px-4 py-2 rounded-full whitespace-nowrap text-sm transition-all ${
              activeDay === d.index 
                ? "bg-primary text-primary-foreground font-semibold shadow-md" 
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            {d.short}
          </button>
        ))}
      </div>

      <div className="bg-card border rounded-3xl p-6 shadow-sm min-h-[400px] flex flex-col">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-xl font-bold">{currentDayObj.name}</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Repeats every {currentDayObj.name}. 1 session per day.</p>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="rounded-full">
                <Plus className="h-4 w-4 mr-1" /> Add Exercise
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 max-h-[300px] overflow-y-auto rounded-xl">
              {allExercises
                .filter(ex => !selectedExercises.find(e => e._id === ex._id))
                .map((ex) => (
                  <DropdownMenuItem 
                    key={ex._id} 
                    onClick={() => toggleExercise(ex)}
                    className="cursor-pointer rounded-lg py-2"
                  >
                    <Activity className="h-4 w-4 mr-2 text-muted-foreground" />
                    <span>{ex.name}</span>
                  </DropdownMenuItem>
              ))}
              {allExercises.filter(ex => !selectedExercises.find(e => e._id === ex._id)).length === 0 && (
                <DropdownMenuItem disabled className="text-center justify-center opacity-50">
                  All exercises added
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {isLoading ? (
          <div className="flex-1 flex justify-center items-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="flex-1 flex flex-col">
            {selectedExercises.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center space-y-3 opacity-50">
                <Activity className="h-12 w-12 text-muted-foreground" />
                <p>Rest Day.<br/>No exercises scheduled.</p>
              </div>
            ) : (
              <div className="flex-1 space-y-2">
                <AnimatePresence>
                  {selectedExercises.map((ex) => (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      key={ex._id}
                      className="flex items-center justify-between p-3 rounded-2xl bg-muted/50 border"
                    >
                      <div className="flex items-center space-x-3">
                        <div className="p-2 rounded-xl bg-background shadow-sm">
                          <Activity className="h-5 w-5 text-primary" />
                        </div>
                        <p className="font-medium text-sm">{ex.name}</p>
                      </div>
                      <button 
                        onClick={() => toggleExercise(ex)}
                        className="p-2 text-muted-foreground hover:text-destructive transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex justify-end">
        <Button 
          className="rounded-full shadow-lg px-8 h-12" 
          onClick={handleSave} 
          disabled={isLoading || isSaving}
        >
          {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
          Save Schedule
        </Button>
      </div>
    </div>
  );
}
