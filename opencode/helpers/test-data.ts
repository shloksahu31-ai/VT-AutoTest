/** Timestamped data per run to avoid collisions with other runs/tenants. */
export function makeStamp(): string {
  return new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 12);
}

export function makeDirectVacancy(stamp: string): {
  jobTitle: string;
  vacancyText: string;
} {
  const jobTitle = `E2E Direct Schrijver ${stamp}`;
  const vacancyText =
    `E2E direct-schrijven ${stamp}. Functietitel: ${jobTitle}. ` +
    `Wij zoeken een klantgerichte medewerker voor ons kantoor in Utrecht (E2E ${stamp}). ` +
    `Fulltime, 32-40 uur per week. Werkzaamheden: klantcontact via telefoon en mail, ` +
    `agenda- en orderbeheer, samenwerken met het serviceteam. Wij bieden een marktconform ` +
    `salaris, 25 vakantiedagen, reiskostenvergoeding en opleidingsmogelijkheden. ` +
    `Ervaring met klantenservice is een pre, HBO-werk- en denkniveau gewenst.`;
  return { jobTitle, vacancyText };
}
