import { describe, expect, it } from "vitest"
import { getChatId, groupBySender, type Message } from "~/lib/chat"

function message(id: string, from: string): Message {
  return { id, chatId: "ab", content: id, from, to: from === "a" ? "b" : "a", timestamp: new Date(0) }
}

describe("getChatId", () => {
  it("is the same whichever user starts the chat", () => {
    expect(getChatId("alice", "bob")).toBe(getChatId("bob", "alice"))
  })

  it("puts the smaller uid first, as firestore.rules expects", () => {
    expect(getChatId("zed", "amy")).toBe("amyzed")
    expect(getChatId("B", "a")).toBe("Ba")
  })
})

describe("groupBySender", () => {
  it("returns no groups for no messages", () => {
    expect(groupBySender([])).toEqual([])
  })

  it("groups consecutive messages from the same sender", () => {
    const messages = [message("1", "a"), message("2", "a"), message("3", "b"), message("4", "a")]
    expect(groupBySender(messages).map((group) => group.map((m) => m.id))).toEqual([["1", "2"], ["3"], ["4"]])
  })
})
