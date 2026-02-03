'use client'

import LandlordDashboard from '@/components/dashboard/LandlordDashboard'
import { useRouter } from 'next/navigation'

export default function Page() {
    const router = useRouter()

    // For now, render the component directly
    return <LandlordDashboard onQuickFind={() => { }} />
}
