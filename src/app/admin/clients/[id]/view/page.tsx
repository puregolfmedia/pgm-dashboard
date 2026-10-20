import { redirect } from 'next/navigation'

// Admin "View" now opens the real dashboard for that club, so every tab works.
export default function ViewClientPage({ params }: { params: { id: string } }) {
  redirect(`/dashboard?viewAs=${encodeURIComponent(params.id)}`)
}
