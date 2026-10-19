"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Activity, Zap, Check, Play, Pause, ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { logSetAndGetRest, completeRest } from "@/lib/actions/workout";

// A mock version for MVP. Real app would call Server Actions and save to DB.
export default function WorkoutClient({ initialSchedule }: { initialSchedule: any[] }) {
  const [phase, setPhase] = useState<"ready" | "warmup" | "workout" | "rest" | "done">("ready");
  const [warmupTime, setWarmupTime] = useState(600); // 10 minutes
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [exercises, setExercises] = useState(initialSchedule.map(e => e.exerciseId));
  const [currentExIndex, setCurrentExIndex] = useState(0);
  
  // Rest logic state
  const [restTime, setRestTime] = useState(0);
  const [suggestedRest, setSuggestedRest] = useState(0);
  
  // Set tracking
  const [reps, setReps] = useState<string>("");
  const [weight, setWeight] = useState<string>("0");
  const [rpe, setRpe] = useState<"easy"|"solid"|"hard"|"limit">("solid");
  
  const [sessionId, setSessionId] = useState<string | undefined>(undefined);
  const [currentSetId, setCurrentSetId] = useState<string | undefined>(undefined);
  const [isLogging, setIsLogging] = useState(false);

  // Timer effect
  useEffect(() => {
    let interval: any;
    if (isTimerRunning && (phase === "warmup" || phase === "rest")) {
      interval = setInterval(() => {
        if (phase === "warmup") {
          setWarmupTime(prev => {
            if (prev <= 1) {
              setIsTimerRunning(false);
              return 0;
            }
            return prev - 1;
          });
        } else if (phase === "rest") {
          setRestTime(prev => {
            if (prev <= 1) {
              setIsTimerRunning(false);
              setPhase("workout");
              // Fire and forget complete rest
              if (sessionId && currentSetId) {
                completeRest(sessionId, currentSetId, suggestedRest, suggestedRest);
              }
              return 0;
            }
            return prev - 1;
          });
        }
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning, phase]);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const logSet = async () => {
    setIsLogging(true);
    try {
      const res = await logSetAndGetRest({
        sessionId,
        exerciseId: activeExercise._id,
        reps: Number(reps),
        weightKg: Number(weight) || 0,
        rpeRating: rpe
      });
      
      setSessionId(res.sessionId);
      setCurrentSetId(res.setId);
      setSuggestedRest(res.suggestedRest);
      setRestTime(res.restTime);
      setPhase("rest");
      setIsTimerRunning(true);
      setReps("");
      setRpe("solid");
    } catch (error) {
      console.error("Failed to log set:", error);
    } finally {
      setIsLogging(false);
    }
  };

  const handleSkipRest = () => {
    setIsTimerRunning(false);
    setPhase("workout");
    if (sessionId && currentSetId) {
      // Record actual rest taken (suggestedRest - restTime remaining)
      const actualRest = Math.max(0, suggestedRest - restTime);
      completeRest(sessionId, currentSetId, actualRest, suggestedRest);
    }
  };

  const nextExercise = () => {
    if (currentExIndex < exercises.length - 1) {
      setCurrentExIndex(prev => prev + 1);
      setPhase("workout");
      setIsTimerRunning(false);
    } else {
      setPhase("done");
    }
  };

  if (exercises.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center space-y-4">
        <Activity className="h-12 w-12 text-muted-foreground" />
        <h2 className="text-xl font-bold">No Workout Today</h2>
        <p className="text-muted-foreground">You don't have any exercises scheduled for today.</p>
      </div>
    );
  }

  const activeExercise = exercises[currentExIndex];

  return (
    <div className="flex-1 flex flex-col justify-center max-w-md w-full mx-auto">
      <AnimatePresence mode="wait">
        
        {/* READY PHASE */}
        {phase === "ready" && (
          <motion.div
            key="ready"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, y: -20 }}
            className="flex flex-col items-center justify-center text-center space-y-8"
          >
            <div className="p-6 rounded-full bg-primary/10 text-primary">
              <Zap className="h-12 w-12" />
            </div>
            <div className="space-y-2">
              <h2 className="text-3xl font-extrabold">Ready to go?</h2>
              <p className="text-muted-foreground">You have {exercises.length} exercises planned.</p>
            </div>
            <Button 
              size="lg" 
              className="rounded-full px-12 h-14 text-lg shadow-xl"
              onClick={() => { setPhase("warmup"); setIsTimerRunning(true); }}
            >
              Start Warmup
            </Button>
          </motion.div>
        )}

        {/* WARMUP PHASE */}
        {phase === "warmup" && (
          <motion.div
            key="warmup"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, y: -20 }}
            className="flex flex-col items-center justify-center w-full space-y-8"
          >
            <h2 className="text-2xl font-bold tracking-tight text-muted-foreground uppercase">Warmup</h2>
            <div className="text-6xl sm:text-8xl font-black tabular-nums tracking-tighter">
              {formatTime(warmupTime)}
            </div>
            <div className="flex space-x-4">
              <Button 
                variant="outline" 
                size="icon" 
                className="h-16 w-16 rounded-full"
                onClick={() => setIsTimerRunning(!isTimerRunning)}
              >
                {isTimerRunning ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6 ml-1" />}
              </Button>
              <Button 
                variant="outline" 
                className="h-16 px-6 rounded-full"
                onClick={() => setWarmupTime(prev => prev + 60)}
              >
                +1 min
              </Button>
            </div>
            <Button 
              className="w-full rounded-full h-14 shadow-lg text-lg"
              onClick={() => { setPhase("workout"); setIsTimerRunning(false); }}
            >
              Skip to Workout
            </Button>
          </motion.div>
        )}

        {/* WORKOUT PHASE */}
        {phase === "workout" && (
          <motion.div
            key="workout"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="flex flex-col flex-1 w-full"
          >
            <div className="mb-8">
              <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-2">
                Exercise {currentExIndex + 1} of {exercises.length}
              </p>
              <h2 className="text-3xl sm:text-4xl font-black leading-tight">{activeExercise?.name}</h2>
            </div>
            
            <div className="bg-card border rounded-3xl p-6 shadow-sm space-y-6">
              <div className="space-y-4">
                <label className="text-sm font-medium text-muted-foreground">Reps Completed</label>
                <div className="flex items-center bg-muted rounded-2xl overflow-hidden h-16">
                  <Button variant="ghost" className="h-full px-6 text-xl" onClick={() => setReps(prev => String(Math.max(0, Number(prev)-1)))}>-</Button>
                  <input 
                    type="number" 
                    value={reps}
                    onChange={e => setReps(e.target.value)}
                    className="flex-1 bg-transparent text-center text-2xl font-bold focus:outline-none"
                    placeholder="0"
                  />
                  <Button variant="ghost" className="h-full px-6 text-xl" onClick={() => setReps(prev => String(Number(prev)+1))}>+</Button>
                </div>
              </div>

              <div className="space-y-4">
                <label className="text-sm font-medium text-muted-foreground">Weight (kg) - Optional</label>
                <div className="flex items-center bg-muted rounded-2xl overflow-hidden h-16">
                  <Button variant="ghost" className="h-full px-6 text-xl" onClick={() => setWeight(prev => String(Math.max(0, Number(prev)-2.5)))}>-</Button>
                  <input 
                    type="number" 
                    value={weight}
                    onChange={e => setWeight(e.target.value)}
                    className="flex-1 bg-transparent text-center text-2xl font-bold focus:outline-none"
                    placeholder="0"
                  />
                  <Button variant="ghost" className="h-full px-6 text-xl" onClick={() => setWeight(prev => String(Number(prev)+2.5))}>+</Button>
                </div>
              </div>

              <div className="space-y-4">
                <label className="text-sm font-medium text-muted-foreground">Difficulty (RPE)</label>
                <div className="grid grid-cols-4 gap-2">
                  {(["easy", "solid", "hard", "limit"] as const).map((level) => (
                    <button
                      key={level}
                      onClick={() => setRpe(level)}
                      className={`py-3 rounded-xl text-xs font-semibold capitalize transition-all ${
                        rpe === level 
                          ? "bg-primary text-primary-foreground ring-2 ring-primary ring-offset-2 dark:ring-offset-background" 
                          : "bg-muted text-muted-foreground hover:bg-muted/80"
                      }`}
                    >
                      {level}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-auto space-y-4 pt-8">
              <Button 
                className="w-full rounded-full h-14 shadow-lg text-lg"
                onClick={logSet}
                disabled={!reps || isLogging}
              >
                {isLogging ? <Loader2 className="h-6 w-6 animate-spin" /> : "Log Set & Rest"}
              </Button>
              <Button 
                variant="ghost"
                className="w-full rounded-full h-14"
                onClick={nextExercise}
              >
                Finish Exercise <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </motion.div>
        )}

        {/* REST PHASE */}
        {phase === "rest" && (
          <motion.div
            key="rest"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, y: -20 }}
            className="flex flex-col items-center justify-center w-full space-y-8"
          >
            <div className="space-y-2 text-center">
              <h2 className="text-xl font-bold tracking-tight text-primary uppercase">RestFlow Algorithm</h2>
              <p className="text-sm text-muted-foreground">Optimal recovery time computed.</p>
            </div>
            
            <div className="relative flex items-center justify-center w-48 h-48 sm:w-64 sm:h-64">
              <svg className="absolute inset-0 w-full h-full transform -rotate-90" viewBox="0 0 256 256">
                <circle cx="128" cy="128" r="120" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-muted" />
                <motion.circle 
                  cx="128" 
                  cy="128" 
                  r="120" 
                  stroke="currentColor" 
                  strokeWidth="8" 
                  fill="transparent" 
                  className="text-primary"
                  strokeDasharray="753.98"
                  initial={{ strokeDashoffset: 0 }}
                  animate={{ strokeDashoffset: 753.98 * (1 - restTime / suggestedRest) }}
                  transition={{ duration: 1, ease: "linear" }}
                />
              </svg>
              <div className="text-5xl sm:text-6xl font-black tabular-nums tracking-tighter absolute">
                {formatTime(restTime)}
              </div>
            </div>

            <div className="flex space-x-4 w-full">
              <Button 
                variant="outline" 
                className="flex-1 h-14 rounded-full"
                onClick={() => setRestTime(Math.max(0, restTime - 15))}
              >
                -15s
              </Button>
              <Button 
                variant="outline" 
                className="flex-1 h-14 rounded-full"
                onClick={() => setRestTime(restTime + 15)}
              >
                +15s
              </Button>
            </div>

            <Button 
              className="w-full rounded-full h-14 shadow-lg text-lg"
              onClick={handleSkipRest}
            >
              Skip Rest
            </Button>
          </motion.div>
        )}

        {/* DONE PHASE */}
        {phase === "done" && (
          <motion.div
            key="done"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center justify-center text-center space-y-8"
          >
            <div className="p-6 rounded-full bg-green-500/10 text-green-500">
              <Check className="h-12 w-12" />
            </div>
            <div className="space-y-2">
              <h2 className="text-3xl font-extrabold">Workout Complete!</h2>
              <p className="text-muted-foreground">Great job today. Your RestFlow metrics have been recorded.</p>
            </div>
            <Button 
              size="lg" 
              className="rounded-full px-12 h-14 text-lg shadow-xl"
              onClick={() => window.location.href = "/"}
            >
              Back to Dashboard
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
