/** Timestamped data per run to avoid collisions with other runs/tenants. */
export function makeStamp(): string {
  return new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 12);
}

export function makeDirectVacancy(stamp: string): {
  jobTitle: string;
  vacancyText: string;
} {
  const jobTitle = `E2E Direct Writer ${stamp}`;
  const vacancyText =
    `E2E write-directly ${stamp}. Job title: ${jobTitle}. ` +
    `We are looking for a customer-focused employee for our office in Utrecht (E2E ${stamp}). ` +
    `Full-time, 32-40 hours per week. Tasks: customer contact by phone and email, ` +
    `calendar and order management, working with the service team. We offer a market-rate ` +
    `salary, 25 vacation days, travel allowance and training opportunities. ` +
    `Customer service experience is a plus, higher vocational working level preferred.`;
  return { jobTitle, vacancyText };
}
