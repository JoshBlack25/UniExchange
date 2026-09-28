/*
  Conversation list.

  ROUTE: /messages     (the thread itself is ChatPage at /messages/:conversationId)

  Messenger layout:
    below lg   the inbox is the whole page; tapping a row opens ChatPage.
    lg and up  a fixed-height two-pane view - the inbox on the left and, since
               no conversation is chosen yet, a "Select a conversation" pane on
               the right. ChatPage renders the same two panes with the chat in
               place of the placeholder, so both routes stay deep-linkable.

  The list itself - fetching, polling, search - lives in
  components/messages/ConversationList.tsx so both routes share it.
*/

import { ChatsCircle } from '@phosphor-icons/react'

import { ConversationList } from '@/components/messages/ConversationList'
import { Seo } from '@/components/seo/Seo'

export function MessagesPage() {
  return (
    // 8rem = the lg TopBar (4rem) + <main>'s top (1.5rem) and bottom (2.5rem) padding.
    <div className="mx-auto max-w-2xl lg:mx-0 lg:flex lg:h-[calc(100dvh-8rem)] lg:max-w-none lg:gap-4">
      <Seo title="Messages" description="Your conversations with buyers and sellers on UniExchange." path="/messages" noindex />
      <div className="lg:flex lg:w-80 lg:shrink-0 lg:flex-col xl:w-88">
        <ConversationList />
      </div>

      <div className="glass-card hidden flex-1 flex-col items-center justify-center rounded-2xl border p-8 text-center shadow-glass lg:flex">
        <span className="grid size-20 place-items-center rounded-full bg-brand-50 text-brand-700">
          <ChatsCircle aria-hidden="true" weight="duotone" className="size-10" />
        </span>
        <p className="mt-4 text-lg font-semibold text-fg">Select a conversation</p>
        <p className="mt-1 max-w-xs text-sm text-fg-muted">
          Pick a chat on the left to see your messages, or open a listing and tap Message Seller
          to start a new one.
        </p>
      </div>
    </div>
  )
}
