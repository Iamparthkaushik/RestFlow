import { auth } from "@/auth"
import { Link } from "@/i18n/routing"
import { ArrowRight, Activity, Clock, Zap } from "lucide-react"
import { getUserDashboardData } from "@/lib/actions/workout"
import DashboardClient from "./DashboardClient"

export default async function Home() {
  const session = await auth()

  if (!session) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 w-full text-center px-4 py-12">
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

  const dashboardData = await getUserDashboardData();

  if (!dashboardData) {
    return null;
  }

  return (
    <DashboardClient 
      initialData={dashboardData} 
      userName={session.user?.name || "Athlete"} 
    />
  );
}
