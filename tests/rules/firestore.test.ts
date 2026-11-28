import { readFileSync } from "node:fs"
import { afterAll, beforeAll, beforeEach, describe, it } from "vitest"
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing"
import {
  Timestamp,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
  type Firestore,
} from "firebase/firestore"

let env: RulesTestEnvironment

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: "demo-trading-app",
    firestore: { rules: readFileSync("firestore.rules", "utf8") },
  })
})

beforeEach(async () => {
  await env.clearFirestore()
})

afterAll(async () => {
  await env.cleanup()
})

function as(uid: string) {
  return env.authenticatedContext(uid, { email: `${uid}@example.com` }).firestore()
}

function signedOut() {
  return env.unauthenticatedContext().firestore()
}

// writes data the way an admin would, so a test can start from any state
async function seed(path: string, data: Record<string, unknown>) {
  await env.withSecurityRulesDisabled((context) => setDoc(doc(context.firestore(), path), data))
}

function post(uid: string, overrides: Record<string, unknown> = {}) {
  return { uid, type: "donation", title: "Rice", content: "2 bags of rice", images: [], timestamp: serverTimestamp(), ...overrides }
}

function profile(uid: string, overrides: Record<string, unknown> = {}) {
  return {
    firstName: "Alice",
    lastName: "Smith",
    country: "Thailand",
    phoneNumber: "0800000000",
    email: `${uid}@example.com`,
    createdAt: serverTimestamp(),
    ...overrides,
  }
}

// sends a message the way app/routes/chat.tsx does, together with its rate limit update
function sendMessage(db: Firestore, from: string, to: string, overrides: Record<string, unknown> = {}) {
  const batch = writeBatch(db)
  batch.set(doc(collection(db, "chats")), {
    chatId: [from, to].sort().join(""),
    content: "hello",
    from,
    to,
    timestamp: serverTimestamp(),
    ...overrides,
  })
  batch.set(doc(db, "rateLimits", from), { lastMessageAt: serverTimestamp() })
  return batch.commit()
}

describe("posts", () => {
  it("can be read by anyone", async () => {
    await seed("posts/p1", { uid: "alice", title: "Rice" })
    await assertSucceeds(getDoc(doc(signedOut(), "posts/p1")))
  })

  it("can be created by a signed in user for themselves", async () => {
    await assertSucceeds(setDoc(doc(as("alice"), "posts/p1"), post("alice")))
  })

  it("can't be created while signed out or for someone else", async () => {
    await assertFails(setDoc(doc(signedOut(), "posts/p1"), post("alice")))
    await assertFails(setDoc(doc(as("bob"), "posts/p1"), post("alice")))
  })

  it.each(["exchange", "donation", "request"])("accepts the %s type", async (type) => {
    await assertSucceeds(setDoc(doc(as("alice"), "posts/p1"), post("alice", { type })))
  })

  it("rejects unknown types, extra fields and client timestamps", async () => {
    const db = as("alice")
    await assertFails(setDoc(doc(db, "posts/p1"), post("alice", { type: "sale" })))
    await assertFails(setDoc(doc(db, "posts/p1"), post("alice", { status: "open" })))
    await assertFails(setDoc(doc(db, "posts/p1"), post("alice", { timestamp: Timestamp.fromMillis(0) })))
  })

  it("rejects empty or too long titles and content", async () => {
    const db = as("alice")
    await assertFails(setDoc(doc(db, "posts/p1"), post("alice", { title: "" })))
    await assertFails(setDoc(doc(db, "posts/p1"), post("alice", { title: "a".repeat(201) })))
    await assertFails(setDoc(doc(db, "posts/p1"), post("alice", { content: "a".repeat(5001) })))
    await assertSucceeds(setDoc(doc(db, "posts/p1"), post("alice", { title: "a".repeat(200), content: "a".repeat(5000) })))
  })

  it("only accepts up to 5 images stored under the post, in index order", async () => {
    const db = as("alice")
    const paths = [0, 1, 2, 3, 4, 5].map((i) => `images/alice/posts/p1/${i}`)
    await assertSucceeds(setDoc(doc(db, "posts/p1"), post("alice", { images: paths.slice(0, 5) })))
    await assertFails(setDoc(doc(db, "posts/p2"), post("alice", { images: paths.slice(0, 5) })))
    await assertFails(setDoc(doc(db, "posts/p3"), post("alice", { images: ["images/alice/posts/p3/1"] })))
    await assertFails(setDoc(doc(db, "posts/p4"), post("alice", { images: ["images/bob/posts/p4/0"] })))
    await assertFails(setDoc(doc(db, "posts/p1"), post("alice", { images: paths })))
  })

  it("can have only its title and content edited, only by its author", async () => {
    await seed("posts/p1", { uid: "alice", type: "donation", title: "Rice", content: "rice", images: [] })
    await assertSucceeds(updateDoc(doc(as("alice"), "posts/p1"), { title: "Beans", content: "beans" }))
    await assertFails(updateDoc(doc(as("alice"), "posts/p1"), { type: "request" }))
    await assertFails(updateDoc(doc(as("alice"), "posts/p1"), { title: "" }))
    await assertFails(updateDoc(doc(as("bob"), "posts/p1"), { title: "Mine now" }))
  })

  it("can only be deleted by its author", async () => {
    await seed("posts/p1", { uid: "alice", title: "Rice" })
    await assertFails(deleteDoc(doc(as("bob"), "posts/p1")))
    await assertSucceeds(deleteDoc(doc(as("alice"), "posts/p1")))
  })
})

describe("users", () => {
  it("can only be read while signed in", async () => {
    await seed("users/alice", { firstName: "Alice" })
    await assertSucceeds(getDoc(doc(as("bob"), "users/alice")))
    await assertFails(getDoc(doc(signedOut(), "users/alice")))
  })

  it("can create only their own profile, with the email they signed in with", async () => {
    await assertSucceeds(setDoc(doc(as("alice"), "users/alice"), profile("alice")))
    await assertFails(setDoc(doc(as("bob"), "users/carol"), profile("carol")))
    await assertFails(setDoc(doc(as("dave"), "users/dave"), profile("dave", { email: "someone@example.com" })))
  })

  it("rejects profiles with missing, too long or extra fields", async () => {
    const db = as("alice")
    await assertFails(setDoc(doc(db, "users/alice"), profile("alice", { firstName: "" })))
    await assertFails(setDoc(doc(db, "users/alice"), profile("alice", { phoneNumber: "0".repeat(31) })))
    await assertFails(setDoc(doc(db, "users/alice"), profile("alice", { isAdmin: true })))
  })

  it("can update their own details but not their email", async () => {
    await seed("users/alice", { ...profile("alice"), createdAt: Timestamp.now() })
    await assertSucceeds(updateDoc(doc(as("alice"), "users/alice"), { country: "China" }))
    await assertFails(updateDoc(doc(as("alice"), "users/alice"), { email: "new@example.com" }))
    await assertFails(updateDoc(doc(as("bob"), "users/alice"), { country: "China" }))
  })
})

describe("blocked", () => {
  it("can only be managed by the user who blocks", async () => {
    await assertSucceeds(setDoc(doc(as("alice"), "users/alice/blocked/bob"), { createdAt: serverTimestamp() }))
    await assertSucceeds(getDoc(doc(as("alice"), "users/alice/blocked/bob")))
    await assertFails(getDoc(doc(as("bob"), "users/alice/blocked/bob")))
    await assertFails(deleteDoc(doc(as("bob"), "users/alice/blocked/bob")))
    await assertSucceeds(deleteDoc(doc(as("alice"), "users/alice/blocked/bob")))
  })

  it("can't block yourself or someone else's contacts", async () => {
    await assertFails(setDoc(doc(as("alice"), "users/alice/blocked/alice"), { createdAt: serverTimestamp() }))
    await assertFails(setDoc(doc(as("bob"), "users/alice/blocked/carol"), { createdAt: serverTimestamp() }))
  })
})

describe("rateLimits", () => {
  it("can only be read by its own user", async () => {
    await seed("rateLimits/alice", { lastMessageAt: Timestamp.now() })
    await assertSucceeds(getDoc(doc(as("alice"), "rateLimits/alice")))
    await assertFails(getDoc(doc(as("bob"), "rateLimits/alice")))
  })

  it("only moves forward to the server time, at most every 2 seconds", async () => {
    await assertFails(setDoc(doc(as("alice"), "rateLimits/alice"), { lastMessageAt: Timestamp.fromMillis(0) }))
    await seed("rateLimits/alice", { lastMessageAt: Timestamp.fromMillis(Date.now() - 10_000) })
    await assertSucceeds(setDoc(doc(as("alice"), "rateLimits/alice"), { lastMessageAt: serverTimestamp() }))
    await assertFails(setDoc(doc(as("alice"), "rateLimits/alice"), { lastMessageAt: serverTimestamp() }))
  })
})

describe("chats", () => {
  beforeEach(async () => {
    await seed("users/alice", { firstName: "Alice" })
    await seed("users/bob", { firstName: "Bob" })
  })

  it("can be sent to another user together with a rate limit update", async () => {
    await assertSucceeds(sendMessage(as("alice"), "alice", "bob"))
  })

  it("can't be sent without updating the rate limit", async () => {
    const db = as("alice")
    await assertFails(setDoc(doc(collection(db, "chats")), {
      chatId: "alicebob", content: "hello", from: "alice", to: "bob", timestamp: serverTimestamp(),
    }))
  })

  it("can't be sent again within 2 seconds", async () => {
    const db = as("alice")
    await assertSucceeds(sendMessage(db, "alice", "bob"))
    await assertFails(sendMessage(db, "alice", "bob"))
  })

  it("can be sent again once 2 seconds have passed", async () => {
    await seed("rateLimits/alice", { lastMessageAt: Timestamp.fromMillis(Date.now() - 3_000) })
    await assertSucceeds(sendMessage(as("alice"), "alice", "bob"))
  })

  it("can't be sent by a user who was blocked by the recipient", async () => {
    await seed("users/bob/blocked/alice", { createdAt: Timestamp.now() })
    await assertFails(sendMessage(as("alice"), "alice", "bob"))
  })

  it("can't be sent to yourself, to a missing user or as someone else", async () => {
    await assertFails(sendMessage(as("alice"), "alice", "alice"))
    await assertFails(sendMessage(as("alice"), "alice", "nobody"))
    await assertFails(sendMessage(as("carol"), "alice", "bob"))
  })

  it("rejects a wrong chatId, empty or too long content and extra fields", async () => {
    await assertFails(sendMessage(as("alice"), "alice", "bob", { chatId: "bobalice" }))
    await assertFails(sendMessage(as("alice"), "alice", "bob", { content: "" }))
    await assertFails(sendMessage(as("alice"), "alice", "bob", { content: "a".repeat(2001) }))
    await assertFails(sendMessage(as("alice"), "alice", "bob", { read: false }))
  })

  it("can only be read by the sender and the recipient", async () => {
    await seed("chats/m1", { chatId: "alicebob", content: "hello", from: "alice", to: "bob", timestamp: Timestamp.now() })
    await assertSucceeds(getDoc(doc(as("alice"), "chats/m1")))
    await assertSucceeds(getDoc(doc(as("bob"), "chats/m1")))
    await assertFails(getDoc(doc(as("carol"), "chats/m1")))
    await assertFails(getDoc(doc(signedOut(), "chats/m1")))
  })

  it("allows the queries the chat page makes, but not listing every message", async () => {
    const db = as("alice")
    await assertSucceeds(getDocs(query(collection(db, "chats"), where("from", "==", "alice"))))
    await assertSucceeds(getDocs(query(collection(db, "chats"), where("to", "==", "alice"))))
    await assertFails(getDocs(collection(db, "chats")))
    await assertFails(getDocs(query(collection(db, "chats"), where("to", "==", "bob"))))
  })
})

it("denies every other collection", async () => {
  await assertFails(getDoc(doc(as("alice"), "transactions/t1")))
  await assertFails(setDoc(doc(as("alice"), "transactions/t1"), { status: "open" }))
})
