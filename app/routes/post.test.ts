import { beforeEach, describe, expect, it, vi } from "vitest"
import { getDoc, setDoc } from "firebase/firestore"
import { deleteObject, uploadBytes } from "firebase/storage"
import { clientAction } from "~/routes/post"

const auth = vi.hoisted(() => ({ authStateReady: async () => {}, currentUser: null as { uid: string } | null }))

vi.mock("~/lib/firebase", () => ({
  auth,
  db: {},
  storage: {},
}))
vi.mock("firebase/firestore", () => ({
  collection: vi.fn(),
  doc: (_db: unknown, _collection: string, id: string) => ({ id }),
  getDoc: vi.fn(),
  serverTimestamp: () => "now",
  setDoc: vi.fn(),
}))
vi.mock("firebase/storage", () => ({
  ref: (_storage: unknown, path: string) => path,
  uploadBytes: vi.fn(),
  deleteObject: vi.fn(),
}))

function image(name = "photo.png", size = 10, type = "image/png") {
  return new File([new Uint8Array(size)], name, { type })
}

function submit(fields: Record<string, string>, images: File[] = []) {
  const formData = new FormData()
  for (const [key, value] of Object.entries(fields)) formData.set(key, value)
  for (const file of images) formData.append("images", file)
  const request = new Request("http://localhost/post", { method: "POST", body: formData })
  return clientAction({ request } as Parameters<typeof clientAction>[0])
}

const valid = { title: "Rice", content: "2 bags of rice", type: "donation", postId: "post1" }

function redirectsTo(response: unknown, location: string) {
  expect(response).toBeInstanceOf(Response)
  expect((response as Response).headers.get("Location")).toBe(location)
}

beforeEach(() => {
  vi.clearAllMocks()
  auth.currentUser = { uid: "user1" }
  vi.mocked(getDoc).mockResolvedValue({ exists: () => false } as never)
  vi.mocked(uploadBytes).mockResolvedValue({} as never)
  vi.mocked(setDoc).mockResolvedValue()
})

describe("post clientAction", () => {
  it("sends signed out users to the login page", async () => {
    auth.currentUser = null
    redirectsTo(await submit(valid), "/login")
  })

  it.each(["title", "content", "type"])("asks for a missing %s", async (field) => {
    expect(await submit({ ...valid, [field]: " " })).toBe("Please fill in all fields")
  })

  it("rejects an unknown post type", async () => {
    expect(await submit({ ...valid, type: "sale" })).toBe("Please fill in all fields")
  })

  it("rejects more than 5 images", async () => {
    expect(await submit(valid, Array.from({ length: 6 }, () => image()))).toBe("You can attach at most 5 images")
  })

  it("rejects files that aren't images or are 5 MB or more", async () => {
    expect(await submit(valid, [image("notes.txt", 10, "text/plain")])).toBe("Images must be image files under 5 MB")
    expect(await submit(valid, [image("big.png", 5 * 1024 * 1024 + 1)])).toBe("Images must be image files under 5 MB")
  })

  it.each(["", "a/b"])("rejects the post id %j", async (postId) => {
    expect(await submit({ ...valid, postId })).toBe("Could not create your post, please try again")
    expect(setDoc).not.toHaveBeenCalled()
  })

  it("uploads images by index and creates the post", async () => {
    redirectsTo(await submit(valid, [image(), image()]), "/profile")
    expect(vi.mocked(uploadBytes).mock.calls.map(([path]) => path)).toEqual([
      "images/user1/posts/post1/0",
      "images/user1/posts/post1/1",
    ])
    expect(setDoc).toHaveBeenCalledWith({ id: "post1" }, {
      uid: "user1",
      type: "donation",
      title: "Rice",
      content: "2 bags of rice",
      images: ["images/user1/posts/post1/0", "images/user1/posts/post1/1"],
      timestamp: "now",
    })
  })

  it("ignores the empty file an empty input sends", async () => {
    redirectsTo(await submit(valid, [new File([], "")]), "/profile")
    expect(uploadBytes).not.toHaveBeenCalled()
    expect(vi.mocked(setDoc).mock.calls[0][1]).toMatchObject({ images: [] })
  })

  it("does nothing when the same request already created the post", async () => {
    vi.mocked(getDoc).mockResolvedValue({ exists: () => true, data: () => ({ uid: "user1" }) } as never)
    redirectsTo(await submit(valid, [image()]), "/profile")
    expect(uploadBytes).not.toHaveBeenCalled()
    expect(setDoc).not.toHaveBeenCalled()
  })

  it("deletes only the images it uploaded when the post can't be created", async () => {
    vi.mocked(uploadBytes)
      .mockResolvedValueOnce({} as never)
      .mockRejectedValueOnce(new Error("storage/unauthorized"))
    vi.spyOn(console, "error").mockImplementation(() => {})
    expect(await submit(valid, [image(), image()])).toBe("Could not create your post, please try again")
    expect(setDoc).not.toHaveBeenCalled()
    expect(vi.mocked(deleteObject).mock.calls.map(([path]) => path)).toEqual(["images/user1/posts/post1/0"])
  })
})
