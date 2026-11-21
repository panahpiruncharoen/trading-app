// keep in sync with the allowed values of posts.type in firestore.rules
export const PostTypeList = [
  { label: "Exchange", value: "exchange", accept: "Accept trade", hint: "What you have to give, and what you want in return" },
  { label: "Donation", value: "donation", accept: "Accept donation", hint: "The things you want to give away" },
  { label: "Request", value: "request", accept: "Send items", hint: "The things you need" },
] as const

export type PostType = typeof PostTypeList[number]["value"]

export function getPostType(value: unknown) {
  return PostTypeList.find((type) => type.value === value)
}
