import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { formBySlug, intro, consentWording } from '@/lib/enquiryForms'
import { loadClub, Shell } from '../../shell'
import EnquiryFormView from './EnquiryFormView'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: { club: string; form: string } }): Promise<Metadata> {
  const club = await loadClub(params.club)
  const form = formBySlug(params.form)
  return {
    title: club && form ? `${form.title} · ${club.name}` : 'Enquiry',
    robots: { index: false },
  }
}

/** A club's hosted enquiry form, e.g. /enquire/hennerton/membership. */
export default async function EnquiryPage({ params }: { params: { club: string; form: string } }) {
  const club = await loadClub(params.club)
  const form = formBySlug(params.form)
  if (!club || !form || !club.crmSettings!.formTypes.includes(form.type)) notFound()

  return (
    <Shell club={club}>
      <h1 className="font-serif text-[30px] sm:text-[34px] leading-tight text-pgm-ink">{form.title}</h1>
      <p className="text-[15px] text-gray-600 mt-2 leading-relaxed">{intro(form, club.name)}</p>
      <EnquiryFormView
        clubSlug={params.club}
        clubName={club.name}
        form={form}
        consentText={consentWording(club.name)}
        privacyUrl={club.crmSettings!.privacyPolicyUrl}
      />
    </Shell>
  )
}
