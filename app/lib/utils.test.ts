import { expect, it } from "vitest"
import { cn } from "~/lib/utils"

it("joins classes, skips falsy ones and lets later tailwind classes win", () => {
  expect(cn("p-2", false && "hidden", undefined, "text-sm", "p-4")).toBe("text-sm p-4")
})
