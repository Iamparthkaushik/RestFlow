import { auth } from "@/auth"
import { Link } from "@/i18n/routing"
import { ArrowRight, Activity, Clock, Zap } from "lucide-react"
import { hasAnySchedule } from "@/lib/actions/workout"

export default async function Home() {
  const session = await auth()

  if (!session) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] text-center px-4 pt-16">
        <div className="max-w-3xl space-y-8">
          <div className="inline-block rounded-full bg-primary/10 px-3 py-1 text-sm text-primary dark:bg-primary/20">
            Smarter Workouts, Better Recovery
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight sm:text-6xl lg:text-7xl">
            Maximize your <span className="text-primary">Rest Efficiency</span>
          </h1>
          <p className="mx-auto max-w-2xl text-lg text-muted-foreground sm:text-xl leading-relaxed">
            RestFlow uses an advanced dynamic algorithm to calculate exactly how much rest you need between sets based on intensity, fatigue, and historical data. Never rest too little, never rest too long.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4 pt-4">
            <Link 
              href="/auth/register" 
              className="inline-flex h-12 items-center justify-center rounded-full bg-primary px-8 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90"
            >
              Get Started <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
            <Link 
              href="/auth/login" 
              className="inline-flex h-12 items-center justify-center rounded-full border border-input bg-background px-8 text-sm font-medium shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              Sign In
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-16 text-left">
            <div className="flex flex-col items-center md:items-start space-y-2">
              <div className="p-3 rounded-2xl bg-primary/10 text-primary">
                <Activity className="h-6 w-6" />
              </div>
              <h3 className="font-bold text-xl">Dynamic Adaptation</h3>
              <p className="text-sm text-muted-foreground text-center md:text-left">Your rest timer automatically adjusts based on RPE, exercise type, and cumulative fatigue.</p>
            </div>
            <div className="flex flex-col items-center md:items-start space-y-2">
              <div className="p-3 rounded-2xl bg-primary/10 text-primary">
                <Clock className="h-6 w-6" />
              </div>
              <h3 className="font-bold text-xl">Minimalist Tracking</h3>
              <p className="text-sm text-muted-foreground text-center md:text-left">Designed for mobile. A single tap after each set is all you need to log performance.</p>
            </div>
            <div className="flex flex-col items-center md:items-start space-y-2">
              <div className="p-3 rounded-2xl bg-primary/10 text-primary">
                <Zap className="h-6 w-6" />
              </div>
              <h3 className="font-bold text-xl">Learns From You</h3>
              <p className="text-sm text-muted-foreground text-center md:text-left">Manually adjust the timer and RestFlow learns your preferences over time.</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const hasSchedule = await hasAnySchedule();

  return (
    <div className="flex flex-col items-center min-h-[calc(100vh-4rem)] w-full max-w-md mx-auto px-4 pt-24 space-y-8">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Welcome, {session.user?.name || "Athlete"}</h1>
        <p className="text-muted-foreground">Ready to crush your workout today?</p>
      </div>

      {!hasSchedule ? (
        <div className="w-full p-8 rounded-3xl border bg-card text-card-foreground shadow-sm flex flex-col items-center text-center space-y-4">
          <div className="p-4 rounded-full bg-primary/10 text-primary">
            <Activity className="h-8 w-8" />
          </div>
          <h2 className="text-xl font-semibold">No Schedule Set</h2>
          <p className="text-sm text-muted-foreground">
            You haven't scheduled any exercises yet. Set up your weekly routine to get started.
          </p>
          <Link 
            href="/schedule" 
            className="w-full inline-flex h-12 items-center justify-center rounded-full bg-primary px-8 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90 mt-4"
          >
            Create Schedule
          </Link>
        </div>
      ) : (
        <div className="w-full space-y-4">
          <div className="p-6 rounded-3xl border bg-card text-card-foreground shadow-sm flex flex-col space-y-4">
            <h2 className="text-lg font-semibold">Today's Plan</h2>
            <div className="space-y-2">
              {/* Placeholder for today's exercises */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-muted/50">
                <span className="font-medium text-sm">Pull-ups</span>
                <span className="text-xs text-muted-foreground">4 sets</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl bg-muted/50">
                <span className="font-medium text-sm">Dips</span>
                <span className="text-xs text-muted-foreground">4 sets</span>
              </div>
            </div>
            <Link 
              href="/workout" 
              className="w-full inline-flex h-12 items-center justify-center rounded-full bg-primary px-8 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90"
            >
              Start Workout <Zap className="ml-2 h-4 w-4" />
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
