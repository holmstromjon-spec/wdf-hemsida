// Runs every day: deletes job applications (and their files) older than 6 months.
import { purgeExpired } from '../lib/applications.mjs';

export default async () => {
  const n = await purgeExpired();
  console.log(`Deleted ${n} expired job application(s)`);
};

export const config = { schedule: '@daily' };
