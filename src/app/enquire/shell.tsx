import { prisma } from '@/lib/prisma'

// Shared by the public enquiry pages: the club's details and its branded frame.

export async function loadClub(slug: string) {
  const client = await prisma.client.findUnique({
    where: { slug },
    select: { id: true, name: true, logoUrl: true, brandColor: true, crmSettings: { select: { enabled: true, formTypes: true, privacyPolicyUrl: true } } },
  })
  if (!client?.crmSettings?.enabled) return null
  return client
}

/** The club's colour for the header, if it's dark enough for a white logo and white text; otherwise PGM green. */
export function headerColour(brand: string | null) {
  const hex = brand?.trim().match(/^#?([0-9a-f]{6})$/i)?.[1]
  if (!hex) return '#084724'
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4))
  return 0.2126 * r + 0.7152 * g + 0.0722 * b < 0.18 ? `#${hex}` : '#084724'
}

export function Shell({ club, children }: { club: { name: string; logoUrl: string | null; brandColor: string | null }; children: React.ReactNode }) {
  const colour = headerColour(club.brandColor)
  return (
    <div className="min-h-screen bg-[#F4F6F3] text-pgm-ink" style={{ ['--club' as string]: colour }}>
      <header style={{ background: colour }}>
        <div className="max-w-xl mx-auto px-5 py-5 flex items-center gap-3.5">
          {club.logoUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={club.logoUrl} alt="" className="h-11 w-auto object-contain shrink-0" />
          )}
          <p className="font-serif text-white text-lg sm:text-xl leading-tight">{club.name}</p>
        </div>
      </header>
      <main className="max-w-xl mx-auto px-4 sm:px-5 pt-8 pb-16">{children}</main>
    </div>
  )
}
