import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ENQUIRY_FORMS, intro } from '@/lib/enquiryForms'
import { loadClub, Shell } from '../shell'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: { club: string } }): Promise<Metadata> {
  const club = await loadClub(params.club)
  return { title: club ? `Enquire · ${club.name}` : 'Enquire', robots: { index: false } }
}

/** All of a club's enquiry forms, for a single "Enquire" link. */
export default async function EnquireIndex({ params }: { params: { club: string } }) {
  const club = await loadClub(params.club)
  if (!club) notFound()
  const forms = ENQUIRY_FORMS.filter((f) => club.crmSettings!.formTypes.includes(f.type))

  return (
    <Shell club={club}>
      <h1 className="font-serif text-[30px] sm:text-[34px] leading-tight">How can we help?</h1>
      <p className="text-[15px] text-gray-600 mt-2">Choose what your enquiry is about.</p>
      <ul className="mt-7 bg-white border border-pgm-line rounded-2xl divide-y divide-pgm-line overflow-hidden">
        {forms.map((f) => (
          <li key={f.slug}>
            <Link href={`/enquire/${params.club}/${f.slug}`}
              className="flex items-center justify-between gap-4 px-5 py-4 hover:bg-[#F4F6F3] focus:outline-none focus-visible:bg-[#F4F6F3]">
              <span>
                <span className="block text-[15px] font-semibold text-pgm-ink">{f.title}</span>
                <span className="block text-sm text-gray-500 mt-0.5">{intro(f, club.name)}</span>
              </span>
              <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden className="shrink-0 text-gray-400">
                <path d="M7.5 4.5L13 10l-5.5 5.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </Link>
          </li>
        ))}
      </ul>
    </Shell>
  )
}
