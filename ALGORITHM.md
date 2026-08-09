noWe w present the final, fully specified MVP rest‑timer system. It requires only a single RPE tap after each set. All adaptation, learning from overrides, and session fatigue tracking happen automatically.

---

## 1. Final Real‑Time Rest Formula

### Mathematical Definition

$$
\begin{aligned}
\text{Rest}_{\text{next}} = \operatorname{clamp}\Bigl(
    &\bigl[\, 120 \;\times\; M_{\text{intensity}} \;\times\; M_{\text{experience}} \;\times\; M_{\text{tax}}^{\text{(next)}} \;\times\; A_{\text{workCapacity}} \;\times\; \text{ADJ}_{\text{user, ex}} \;\times\; M_{\text{overlap}} \,\bigr] \\
    &\;+\; \Delta_{\text{set}} \;+\; \Delta_{\text{session}} \;+\; \Delta_{\text{perf\_drop}},\quad 30,\;300\Bigr)
\end{aligned}
$$

---

### Parameter Sources & Values

| Parameter | Source | Value / Calculation |
|-----------|--------|---------------------|
| **Base** | Constant | `120` seconds |
| `M_intensity` | Last completed set’s RPE tap | easy → 0.65<br>solid → 0.85<br>hard → 1.00<br>limit → 1.40 |
| `M_experience` | `users.experienceLevel` | beginner → 1.15<br>intermediate → 1.00<br>advanced → 0.85 |
| `M_tax (next)` | `exercises.mTax` of the **upcoming** exercise | 0.55 + `energyTaxLevel` × 0.15 (range 0.70–1.30) |
| `A_workCapacity` | `users.workCapacityFactor` | Scalar 0.85–1.00, updated weekly |
| `ADJ` | `user_exercise_adjustments.adjustmentFactor` for (user, next exercise) | Default 1.0; learned via EMA from manual overrides |
| `M_overlap` | 1.2 if **previous** exercise and **next** exercise share the same `primaryMuscleGroup`, else 1.0 | Only applied when exercises differ |
| `Δ_set` | (number of sets already done for the **same** exercise) × (`5 + nextExercise.energyTaxLevel × 5`) | e.g. after 2 sets of level‑4 exercise → 2 × 25 = 50 s |
| `Δ_session` | `floor( session.systemicFatiguePoints / 5 ) × 20` | Cumulative whole‑body fatigue |
| `Δ_perf_drop` | +45 s if the last set’s `reps` fell below 80% of the user’s historical average for that exercise + weight, else 0 | Safety net; requires background tracking |
| `clamp` | final result forced into [30, 300] seconds | |

**Special rule for the very first set of a new exercise:**  
There is no `M_intensity` yet, so the system defaults to `M_intensity = 1.0` (hard). The `Δ_set` = 0. All other parameters apply normally.

---

## 2. Python Implementation

```python
import math

# Lookup tables
INTENSITY_MAP = {"easy": 0.65, "solid": 0.85, "hard": 1.00, "limit": 1.40}
EXPERIENCE_MAP = {"beginner": 1.15, "intermediate": 1.00, "advanced": 0.85}

BASE_REST = 120
MIN_REST = 30
MAX_REST = 300
PERF_DROP_PENALTY = 45      # seconds
PERF_DROP_THRESHOLD = 0.8   # 80% of historical average

def calculate_rest(
    user: dict,               # {experienceLevel, workCapacityFactor}
    session: dict,            # {systemicFatiguePoints}
    last_set: dict or None,   # {exerciseId, setNumber, reps, rpeRating}
    next_exercise: dict,      # {_id, energyTaxLevel, mTax, primaryMuscleGroup}
    adj_factor: float,        # from user_exercise_adjustments (default 1.0)
    previous_exercise: dict or None,  # the exercise just completed (if any)
    historical_avg_reps: float or None, # average reps for that load
) -> int:
    # ---- 1. Intensity multiplier ----
    if last_set is None:
        m_intensity = 1.0        # default before first RPE tap
    else:
        m_intensity = INTENSITY_MAP[last_set["rpeRating"]]

    # ---- 2. Experience multiplier ----
    m_experience = EXPERIENCE_MAP[user["experienceLevel"]]

    # ---- 3. Exercise tax ----
    m_tax_next = next_exercise["mTax"]

    # ---- 4. Work capacity ----
    a_wc = user["workCapacityFactor"]

    # ---- 5. Personal adjustment ----
    adj = adj_factor

    # ---- 6. Overlap ----
    if previous_exercise is not None and previous_exercise["_id"] != next_exercise["_id"]:
        if previous_exercise.get("primaryMuscleGroup") == next_exercise.get("primaryMuscleGroup"):
            m_overlap = 1.2
        else:
            m_overlap = 1.0
    else:
        m_overlap = 1.0

    # ---- 7. Cumulative set fatigue (for next exercise) ----
    # Calculate how many sets already done for this same exercise in the session
    # For simplicity, we'll pass the number of completed sets for this exercise (sameSetCount)
    # The function needs to receive that; for now we assume last_set has setNumber (1‑based)
    # We'll compute delta based on that setNumber (the set just finished).
    # The next set number will be last_set["setNumber"]+1 if same exercise, else 1.
    # But delta uses (setNumber just finished) as (setsDone). We'll receive sets_done_same_exercise.
    # So we'll add a parameter: sets_done_same_exercise (number of sets already logged for next_exercise)
    # We'll include that in the function call. For now, we'll derive from last_set if same exercise:
    if last_set and last_set.get("exerciseId") == next_exercise["_id"]:
        sets_done = last_set["setNumber"]  # number of completed sets for that exercise
    else:
        sets_done = 0
    delta_set = sets_done * (5 + next_exercise["energyTaxLevel"] * 5)

    # ---- 8. Session systemic fatigue ----
    systemic_points = session.get("systemicFatiguePoints", 0)
    delta_session = math.floor(systemic_points / 5) * 20

    # ---- 9. Performance drop penalty ----
    delta_perf = 0
    if last_set is not None and historical_avg_reps is not None and historical_avg_reps > 0:
        if last_set["reps"] / historical_avg_reps < PERF_DROP_THRESHOLD:
            delta_perf = PERF_DROP_PENALTY

    # ---- Core calculation ----
    raw = (
        BASE_REST * m_intensity * m_experience * m_tax_next * a_wc * adj * m_overlap
        + delta_set
        + delta_session
        + delta_perf
    )
    return max(MIN_REST, min(MAX_REST, round(raw)))
```

---

## 3. MongoDB Schemas (Final MVP)

### `users`
```javascript
{
  _id: ObjectId,
  experienceLevel: String,        // "beginner" | "intermediate" | "advanced"
  workCapacityFactor: Number,     // 1.0 → 0.85, auto‑adjusted weekly
  lastWorkCapacityUpdate: Date,
  weeklyWorkoutCount: Number      // rolling 7‑day total
}
```

### `exercises`
```javascript
{
  _id: ObjectId,
  name: String,                   // e.g., "Weighted Pull‑ups"
  energyTaxLevel: Number,         // 1‑5
  mTax: Number,                   // 0.55 + level×0.15 (pre‑computed)
  systemicLoadPoints: Number,     // level × 0.5 (0.5–2.5)
  primaryMuscleGroup: String      // "chest","back","legs","shoulders","arms"
}
```

### `sessions`
```javascript
{
  _id: ObjectId,
  userId: ObjectId,
  startedAt: Date,
  plan: [                         // optional, allows overlap detection
    { exerciseId: ObjectId, plannedSets: Number }
  ],
  systemicFatiguePoints: Number,  // cumulative sum of completed sets' systemicLoadPoints
  sets: [
    {
      exerciseId: ObjectId,
      setNumber: Number,          // 1‑based within exercise
      reps: Number,
      weightKg: Number,
      rpeRating: String,          // "easy","solid","hard","limit"
      suggestedRest: Number,      // calculated rest in seconds
      actualRestTaken: Number,    // after possible user override
      manualOverride: Boolean     // true if user changed the timer
    }
  ]
}
```

### `user_exercise_adjustments`
```javascript
{
  _id: ObjectId,
  userId: ObjectId,
  exerciseId: ObjectId,
  adjustmentFactor: Number        // default 1.0, EMA‑updated after overrides
}
```

---

## 4. How the System Learns & Remembers Custom Rest Times

Every time a user manually overrides the suggested timer:

1. The app records `actualRestTaken`.
2. It recomputes `raw_without_adj` – the same formula but with `ADJ = 1.0`.
3. It computes the ratio: `R = actualRestTaken / raw_without_adj`.
4. It updates the adjustment factor using an exponential moving average (α = 0.3):
   ```
   newADJ = oldADJ + 0.3 × (R − oldADJ)
   ```
5. The new factor is stored in `user_exercise_adjustments` for that (user, exercise) pair.

Over multiple sessions, if the user consistently shortens rests for an exercise (R < 1), the factor drifts below 1, systematically reducing future suggestions. Conversely, if they always add time, the factor rises above 1.

**Example:**  
After 3 weighted pull‑up sessions with manual trims from 163s to 120s, the factor might settle around 0.8. From then on, the base part of the formula is scaled by 0.8 for that exercise, and the user rarely needs to override again.

---

## 5. Use Cases Explained

### Case A – Complete beginner, first workout, bodyweight squats
- User: `experienceLevel = "beginner"`, `A_workCapacity = 1.0`, no ADJ history.
- Exercise: Squat (energyTaxLevel 4 → mTax 1.15, “legs”).
- Set 1: taps “hard”.  
  Calculation: `M_intensity=1.0`, `M_experience=1.15`, no overlap, no systemic fatigue yet.  
  `raw = 120×1.0×1.15×1.15 + 0 + 0 = 158.7` → **2:39**.
- Set 2: taps “limit”. Now `Δ_set = 1×25 = 25`, systemicFatiguePoints=2.0 (set1) → `Δ_session = 0`.  
  `raw = 120×1.40×1.15×1.15 + 25 = 221.2 + 25 = 246.2` → **4:06**.

### Case B – Advanced lifter, high consistency, weighted pull‑ups
- User: `experienceLevel = "advanced"`, `A_workCapacity = 0.85` (trained 3×/week for weeks), ADJ = 0.9 for pull‑ups.
- Pull‑ups: energyTaxLevel 4, mTax 1.15, “back”.
- Set 3, last set was “limit”:  
  `Δ_set = 2×25 = 50`, systemic points from first two sets = 4.0 → `Δ_session = floor(4/5)×20 = 0`.  
  `raw = 120×1.40×0.85×1.15×0.85×0.9 + 50 + 0`  
  = 120 × (1.40×0.85×1.15×0.85×0.9) = 120 × 1.046 = 125.5 + 50 = 175.5 → **2:56**.

### Case C – Switching from deadlifts to bicep curls (no overlap)
- Deadlifts (5 heavy sets) have left systemicFatiguePoints = 12.5.
- Next exercise: Bicep Curl (energyTaxLevel 2, mTax 0.85, primaryMuscleGroup “arms”).
- No RPE yet → default M_intensity=1.0. Overlap: different muscle group → M_overlap=1.0.
- Sets done for curls = 0 → Δ_set = 0.
- `Δ_session = floor(12.5/5)×20 = 40`.  
  `raw = 120×1.0×1.0×0.85×1.0×1.0×1.0 + 0 + 40 = 102 + 40 = 142` → **2:22**.
- The systemic fatigue from deadlifts still adds 40s, but the low exercise tax keeps the rest manageable.

### Case D – Manual override adapts over weeks
Session 1: Squat set 2 suggests **200s**. User manually sets **150s**.  
`raw_without_adj` (using ADJ=1.0) = 200s. R = 150/200 = 0.75.  
newADJ = 1.0 + 0.3×(0.75-1.0) = 0.925.

Session 2: Squat set 2. Now `raw_without_adj` = 195s (slightly different because of work capacity change).  
With ADJ=0.925, suggestion = 195×0.925 ≈ 180s. User still trims to 150s.  
R = 150/195 = 0.769. newADJ = 0.925 + 0.3×(0.769-0.925) = 0.878.

After a few sessions, suggestion hovers near 150s, and the override habit fades.

### E – Performance drop triggers emergency extra rest
- Bench press historical average at 80 kg = 8 reps.
- Today user manages only 5 reps (“limit”). Ratio = 5/8 = 0.625 < 0.8 → Δ_perf_drop = +45s.
- The rest timer automatically adds 45 seconds on top of the normal calculation, giving extra recovery to prevent further breakdown.

---

## 6. Potential Issues & Mitigations

| Issue | Mitigation |
|-------|------------|
| **Cold start for ADJ** – No override history exists. | Default factor = 1.0; no impact. The first suggestion relies purely on the generic formula. |
| **Inconsistent overrides** – User sometimes shortens, sometimes lengthens. | EMA gradually averages them; after ~10 overrides, factor stabilises around the user’s mean preference. |
| **Overlap too simplistic** – Only checks `primaryMuscleGroup`. A deadlift and a barbell row both hit back, but the overlap is partial. | Acceptable for MVP; the `M_overlap = 1.2` is a mild penalty. Future versions can introduce a muscle‑group impact vector. |
| **Missing RPE for new exercise** – Before the first set, no intensity signal. | Defaults to “hard” (1.0), which is a safe middle ground. Once the user taps after the first set, the timer for set‑2 will use real RPE. |
| **Performance drop relies on historical data** – New user has no history. | Only activate after at least 5 logged sets for that (exercise, weight) combination. Otherwise Δ_perf_drop = 0. |
| **Weekly work capacity update** – The app must reliably count workouts. | A background cron job every Sunday counts sessions in the last 7 days, updates `A_workCapacity` using `A_new = A_old × (1 − min(1, weeklyCount/3) × 0.03)`, clamped to [0.85, 1.0]. |
| **Clamping hides overly extreme suggestions** – A “limit” deadlift set 5 might request >300s but gets capped. | The cap is a safety floor; the user can still manually increase rest beyond 5 min if desired. The system logs that override and learns. |
| **Systemic fatigue points only increase, never decay during a session** – They keep accumulating even after a long warm‑up or between‑exercise pause. | Realistically, fatigue decays over time. For MVP we ignore decay; the Δ_session term is small (max ~120s after an extreme session) and acts as a gentle nudge. Future versions can decay points exponentially with rest time. |

---

## 7. Summary of What the System Does

- **Before any set:** reads user profile, looks up next exercise card.
- **Uses the last set’s RPE** to gauge current internal strain.
- **Checks if the next exercise targets the same muscle group** as the previous, and penalises rest if so.
- **Counts how many sets of that exercise have already been done**, adding more rest as fatigue accumulates.
- **Adds a bonus from the whole‑body fatigue** built up across exercises.
- **Applies a long‑term fitness factor** (work capacity) that gradually shortens rest when the user trains consistently.
- **Applies a personal adjustment** learned from previous manual overrides.
- **Adds an emergency buffer** if the last set’s performance collapsed relative to history.
- **Clamps the result** between 30 seconds and 5 minutes, and presents the timer.
- If the user **changes** the timer, the new value is silently used to **update the personal adjustment factor** for that exercise, so the system gets better over time.

No extra inputs, no wearables, no age or weight – the entire adaptation runs automatically from the single RPE tap and the natural act of occasionally adjusting the timer.
