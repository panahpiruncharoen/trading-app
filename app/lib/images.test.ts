import { beforeEach, expect, it, vi } from "vitest"
import { getDownloadURL } from "firebase/storage"
import { getImageUrls } from "~/lib/images"

vi.mock("~/lib/firebase", () => ({ storage: {} }))
vi.mock("firebase/storage", () => ({
  ref: (_storage: unknown, path: string) => path,
  getDownloadURL: vi.fn(),
}))

beforeEach(() => {
  vi.mocked(getDownloadURL).mockImplementation(async (path) => {
    if (String(path).includes("missing")) throw new Error("object-not-found")
    return `https://example.com/${path}`
  })
})

it("returns a url for every image, in order", async () => {
  expect(await getImageUrls(["a/0", "a/1"])).toEqual(["https://example.com/a/0", "https://example.com/a/1"])
})

it("skips images that can't be found", async () => {
  expect(await getImageUrls(["a/0", "missing/1", "a/2"])).toEqual(["https://example.com/a/0", "https://example.com/a/2"])
})

it("returns nothing when there are no images", async () => {
  expect(await getImageUrls()).toEqual([])
})
