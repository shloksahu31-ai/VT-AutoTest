export const activeRuns = new Map<string, {
  logs: string[];
  status: 'running' | 'completed' | 'failed';
  subscribers: Set<(log: string) => void>;
}>();
