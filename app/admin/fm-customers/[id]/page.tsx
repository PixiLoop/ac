'use client'

import { useParams } from 'next/navigation'
import FMCustomerPage from '../new/page'

export default function EditFMCustomerPage() {
  const { id } = useParams<{ id: string }>()
  return <FMCustomerPage initialCustomerId={id} />
}
