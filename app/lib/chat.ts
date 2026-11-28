export type Message = {
  id: string
  chatId: string
  content: string
  from: string
  to: string
  timestamp: Date
}

// sorted so both users end up with the same chatId
// keep in sync with the chatId check in firestore.rules
export function getChatId(uid1: string, uid2: string) {
  return [uid1, uid2].sort().join("")
}

// consecutive messages from the same sender are shown as one group
export function groupBySender(messages: Message[]) {
  const groups: Message[][] = []
  for (const message of messages) {
    const last = groups.at(-1)
    if (last && last[0].from === message.from) {
      last.push(message)
    } else {
      groups.push([message])
    }
  }
  return groups
}
