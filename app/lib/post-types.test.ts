import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"
import { getPostType, PostTypeList } from "~/lib/post-types"

describe("getPostType", () => {
  it("finds each known type", () => {
    for (const type of PostTypeList) {
      expect(getPostType(type.value)).toBe(type)
    }
  })

  it("returns undefined for anything else", () => {
    expect(getPostType("Exchange")).toBeUndefined()
    expect(getPostType("")).toBeUndefined()
    expect(getPostType(null)).toBeUndefined()
    expect(getPostType(undefined)).toBeUndefined()
  })
})

it("matches the post types allowed by firestore.rules", () => {
  const rules = readFileSync(new URL("../../firestore.rules", import.meta.url), "utf8")
  const allowed = rules.match(/request\.resource\.data\.type in \[([^\]]*)\]/)![1]
  expect(allowed.split(",").map((value) => value.trim().replace(/'/g, ""))).toEqual(PostTypeList.map((type) => type.value))
})
