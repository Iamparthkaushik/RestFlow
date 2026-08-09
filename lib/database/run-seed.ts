import { seedExercises } from "./seed";

async function run() {
  await seedExercises();
  process.exit(0);
}

run();
