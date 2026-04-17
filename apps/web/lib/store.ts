import type { Job, JobStatus } from "@plotcut/schema";

/**
 * In-memory job store. Good enough for a hackathon demo.
 * Swap for sqlite/json file if you want persistence across restarts.
 */
const jobs = new Map<string, Job>();

export function getJob(id: string): Job | undefined {
  return jobs.get(id);
}

export function createJob(job: Job): void {
  jobs.set(job.id, job);
}

export function updateJob(id: string, patch: Partial<Job>): Job | undefined {
  const job = jobs.get(id);
  if (!job) return undefined;
  const updated = { ...job, ...patch, updatedAt: new Date().toISOString() };
  jobs.set(id, updated);
  return updated;
}

export function listJobs(): Job[] {
  return Array.from(jobs.values());
}
