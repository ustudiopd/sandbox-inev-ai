'use client'

import ClientMemberInviteModal from './ClientMemberInviteModal'

interface ClientMemberAddButtonProps {
  clientId: string
}

export default function ClientMemberAddButton({ clientId }: ClientMemberAddButtonProps) {
  return <ClientMemberInviteModal clientId={clientId} />
}
