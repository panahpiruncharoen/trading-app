import { readFileSync } from "node:fs"
import { afterAll, beforeAll, beforeEach, describe, it } from "vitest"
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing"
import { deleteObject, getBytes, ref, uploadBytes } from "firebase/storage"

let env: RulesTestEnvironment

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: "demo-trading-app",
    storage: { rules: readFileSync("storage.rules", "utf8") },
  })
})

beforeEach(async () => {
  await env.clearStorage()
})

afterAll(async () => {
  await env.cleanup()
})

function as(uid: string) {
  return env.authenticatedContext(uid).storage()
}

function upload(storage: ReturnType<typeof as>, path: string, size = 10, contentType = "image/png") {
  return uploadBytes(ref(storage, path), new Uint8Array(size), { contentType })
}

describe("post images", () => {
  it("can be uploaded by the post's author at index 0 to 4", async () => {
    for (const index of [0, 4]) {
      await assertSucceeds(upload(as("alice"), `images/alice/posts/p1/${index}`))
    }
  })

  it("can't be uploaded past index 4 or with another name", async () => {
    await assertFails(upload(as("alice"), "images/alice/posts/p1/5"))
    await assertFails(upload(as("alice"), "images/alice/posts/p1/10"))
    await assertFails(upload(as("alice"), "images/alice/posts/p1/photo.png"))
  })

  it("can't be uploaded into someone else's folder or while signed out", async () => {
    await assertFails(upload(as("bob"), "images/alice/posts/p1/0"))
    await assertFails(upload(env.unauthenticatedContext().storage(), "images/alice/posts/p1/0"))
  })

  it("must be an image under 5 MB", async () => {
    await assertFails(upload(as("alice"), "images/alice/posts/p1/0", 10, "text/plain"))
    await assertFails(upload(as("alice"), "images/alice/posts/p1/1", 5 * 1024 * 1024))
    await assertSucceeds(upload(as("alice"), "images/alice/posts/p1/2", 5 * 1024 * 1024 - 1))
  })

  it("can be read by anyone but only deleted by the author", async () => {
    await env.withSecurityRulesDisabled((context) =>
      uploadBytes(ref(context.storage(), "images/alice/posts/p1/0"), new Uint8Array(10), { contentType: "image/png" }))
    await assertSucceeds(getBytes(ref(env.unauthenticatedContext().storage(), "images/alice/posts/p1/0")))
    await assertFails(deleteObject(ref(as("bob"), "images/alice/posts/p1/0")))
    await assertSucceeds(deleteObject(ref(as("alice"), "images/alice/posts/p1/0")))
  })
})

it("denies every other path", async () => {
  await assertFails(upload(as("alice"), "avatars/alice"))
  await assertFails(getBytes(ref(as("alice"), "avatars/alice")))
})
