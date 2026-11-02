import { prisma } from '@/lib/prisma'

/** Sample enquiries, goals and notes for a new demo club. */
export async function seedDemoClub(clientId: string) {
  const daysAgo = (n: number) => { const d = new Date(); d.setDate(d.getDate() - n); d.setHours(10, 0, 0, 0); return d }
  const people = [
    ['Sarah Mitchell', 'Christmas party', 'Fri 12 Dec', 'BOOKED', 2400],
    ['James Carter', 'Christmas party', 'Sat 13 Dec', 'BOOKED', 1850],
    ['Priya Shah', 'Christmas party', 'Thu 18 Dec', 'CONTACTED', null],
    ['Tom Reed', 'Wedding', 'June 2027', 'CONTACTED', null],
    ['Emma Lawson', 'Christmas lunch', 'Sun 21 Dec', 'BOOKED', 640],
    ['Dan Hughes', 'Christmas party', 'Fri 19 Dec', 'NEW', null],
    ['Lucy Brennan', 'Sunday lunch', 'This Sunday', 'BOOKED', 180],
    ['Mark Ellis', 'Christmas party', 'Sat 6 Dec', 'LOST', null],
    ['Hannah Cole', 'Christmas party', 'Fri 5 Dec', 'NEW', null],
  ] as const
  await prisma.enquiry.createMany({
    data: people.map(([name, category, eventDate, status, value], i) => ({
      clientId, source: i % 3 === 2 ? 'manual' : 'form', receivedAt: daysAgo(2 + i * 3),
      name, email: `${name.split(' ')[0].toLowerCase()}@example.com`, category, eventDate,
      message: category === 'Christmas party' ? `Party of ${20 + i * 5}, looking at the buffet package.` : null,
      status, bookedValue: value, bookedAt: status === 'BOOKED' ? daysAgo(1 + i * 3) : null,
    })),
  })
  const deadline = new Date(); deadline.setDate(deadline.getDate() + 24)
  await prisma.goal.createMany({
    data: [
      { clientId, name: 'Christmas parties booked', metric: 'BOOKINGS', category: 'Christmas party', target: 8, startDate: daysAgo(30), deadline },
      { clientId, name: 'Festive revenue', metric: 'REVENUE', target: 12000, startDate: daysAgo(30), deadline },
    ],
  })
  await prisma.note.createMany({
    data: [
      { clientId, date: daysAgo(24), text: 'Christmas party page live' },
      { clientId, date: daysAgo(17), text: 'Facebook & Instagram ads started' },
      { clientId, date: daysAgo(4), text: 'Christmas email sent to 1,840 contacts' },
    ],
  })
}
