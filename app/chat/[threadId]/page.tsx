import MessageThread from '@/app/components/chat/MessageThread'

export default async function ThreadPage({
  params,
}: {
  params: Promise<{ threadId: string }>
}) {
  const { threadId } = await params
  return <MessageThread threadId={threadId} />
}
