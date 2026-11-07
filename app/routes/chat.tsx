import type { Route } from "./+types/chat";
import { NavLink, useFetcher } from "react-router";
import { redirect } from "react-router";
import { useContext, useEffect, useRef, useState } from "react";
import { UserContext } from "~/lib/context"
import { auth, db } from "~/lib/firebase"
import {
  addDoc,
  collection,
  doc,
  getDoc,
  onSnapshot,
  or,
  query,
  serverTimestamp,
  where,
} from "firebase/firestore";
import { LogoutButton } from "~/components/logout-button"
import { Bubble, BubbleContent, BubbleGroup } from "~/components/ui/bubble"
import { Button } from "~/components/ui/button"
import { Input } from "~/components/ui/input"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "~/components/ui/card"

// sorted so both users end up with the same chatId
function getChatId(uid1: string, uid2: string) {
  return [uid1, uid2].sort().join("")
}

async function getUsername(uid: string) {
  const user = await getDoc(doc(db, "users", uid))
  return `${user.data()?.firstName ?? ""} ${user.data()?.lastName ?? ""}`.trim() || "Unknown user"
}

type Message = {
  id: string
  chatId: string
  content: string
  from: string
  to: string
  timestamp: Date
}

export async function clientLoader({ params }: Route.ClientLoaderArgs) {
  await auth.authStateReady()
  const user = auth.currentUser
  if(!user) {
    return redirect("/login")
  }
  if (params.uid === user.uid) {
    return redirect("/chat")
  }
  return {
    partnerUid: params.uid ?? null,
    partnerName: params.uid ? await getUsername(params.uid) : null,
  }
}

export async function clientAction({
  request,
  params,
}: Route.ClientActionArgs) {
  await auth.authStateReady()
  const user = auth.currentUser
  if (!user) {
    return redirect("/login")
  }
  const formData = await request.formData();
  const content = String(formData.get("content") ?? "").trim();
  if (!params.uid || !content) {
    return { error: null }
  }
  try {
    await addDoc(collection(db, "chats"), {
      chatId: getChatId(user.uid, params.uid),
      content,
      from: user.uid,
      to: params.uid,
      timestamp: serverTimestamp(),
    })
  } catch (error) {
    console.error(error)
    return { error: "Could not send your message, please try again" }
  }
  return { error: null }
}

export function meta({}: Route.MetaArgs) {
  return [
    { title: "New React Router App" },
    { name: "description", content: "Welcome to React Router!" },
  ];
}

// all messages the current user has sent or received, kept up to date
function useMessages(uid: string | undefined) {
  const [messages, setMessages] = useState<Message[]>([])
  useEffect(() => {
    if (!uid) return
    const q = query(collection(db, "chats"), or(where("from", "==", uid), where("to", "==", uid)))
    return onSnapshot(q, (snapshot) => {
      const messages = snapshot.docs.map((message) => {
        // estimate so our own message shows up before the server sets the timestamp
        const data = message.data({ serverTimestamps: "estimate" })
        return {
          id: message.id,
          chatId: data.chatId,
          content: data.content,
          from: data.from,
          to: data.to,
          timestamp: data.timestamp?.toDate() ?? new Date(),
        }
      })
      messages.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())
      setMessages(messages)
    }, (error) => console.error(error))
  }, [uid])
  return messages
}

// consecutive messages from the same sender are shown as one group
function groupBySender(messages: Message[]) {
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

function formatTime(date: Date) {
  return date.toLocaleString("en-GB", { dateStyle: "short", timeStyle: "short" })
}

function Conversations({uid, messages, partnerUid}: {uid: string, messages: Message[], partnerUid: string | null}) {
  const [names, setNames] = useState<Record<string, string>>({})
  // latest message per conversation, newest conversation first
  const latest = new Map<string, Message>()
  for (const message of messages) {
    latest.delete(message.chatId)
    latest.set(message.chatId, message)
  }
  const conversations = [...latest.values()].reverse().map((message) => ({
    partner: message.from === uid ? message.to : message.from,
    message,
  }))
  const partners = conversations.map((conversation) => conversation.partner).join(",")

  useEffect(() => {
    const missing = partners.split(",").filter((partner) => partner && !(partner in names))
    if (missing.length === 0) return
    Promise.all(missing.map(async (partner) => [partner, await getUsername(partner)] as const))
      .then((entries) => setNames((names) => ({...names, ...Object.fromEntries(entries)})))
  }, [partners])

  return (
    <Card className="w-1/4">
      <CardHeader>
        <CardTitle>Chats</CardTitle>
        <CardDescription>Your conversations</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-1">
        {conversations.length === 0 && (
          <p className="text-sm text-muted-foreground">
            No chats yet. Open someone's profile and press Chat to start one.
          </p>
        )}
        {conversations.map(({partner, message}) => (
          <NavLink
            key={partner}
            to={`/chat/${partner}`}
            className={`rounded-lg p-2 hover:bg-muted ${partner === partnerUid ? "bg-muted" : ""}`}
          >
            <p className="font-semibold">{names[partner] ?? "..."}</p>
            <p className="text-sm text-muted-foreground truncate">
              {message.from === uid ? "You: " : ""}{message.content}
            </p>
          </NavLink>
        ))}
      </CardContent>
    </Card>
  )
}

function Conversation({uid, partnerUid, partnerName, messages}: {uid: string, partnerUid: string, partnerName: string, messages: Message[]}) {
  const fetcher = useFetcher<typeof clientAction>()
  const formRef = useRef<HTMLFormElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const chatId = getChatId(uid, partnerUid)
  const conversation = messages.filter((message) => message.chatId === chatId)

  // clear the input once a message has been sent
  useEffect(() => {
    if (fetcher.state === "idle" && fetcher.data && !fetcher.data.error) {
      formRef.current?.reset()
    }
  }, [fetcher.state, fetcher.data])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" })
  }, [conversation.length])

  return (
    <Card className="w-1/2">
      <CardHeader>
        <CardTitle>
          <NavLink to={`/profile/${partnerUid}`} className="hover:underline">{partnerName}</NavLink>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 h-[60vh] overflow-y-auto">
        {conversation.length === 0 && (
          <p className="text-sm text-muted-foreground">No messages yet. Say hello!</p>
        )}
        {groupBySender(conversation).map((group) => {
          const isMine = group[0].from === uid
          const align = isMine ? "end" : "start"
          return (
            <BubbleGroup key={group[0].id}>
              {group.map((message) => (
                <Bubble key={message.id} align={align} variant={isMine ? "default" : "secondary"}>
                  <BubbleContent className="whitespace-pre-wrap">{message.content}</BubbleContent>
                </Bubble>
              ))}
              <p className={`text-xs text-muted-foreground ${isMine ? "self-end" : ""}`}>
                {formatTime(group.at(-1)!.timestamp)}
              </p>
            </BubbleGroup>
          )
        })}
        <div ref={bottomRef} />
      </CardContent>
      <CardFooter className="flex-col gap-2">
        <fetcher.Form method="post" ref={formRef} className="flex w-full gap-2">
          <Input type="text" name="content" placeholder="Type a message..." autoComplete="off" required />
          <Button type="submit" disabled={fetcher.state !== "idle"}>Send</Button>
        </fetcher.Form>
        {fetcher.data?.error}
      </CardFooter>
    </Card>
  )
}

export default function Chat({ loaderData }: Route.ComponentProps) {
  const { user } = useContext(UserContext)
  const messages = useMessages(user?.uid)
  const { partnerUid, partnerName } = loaderData
  return <>
    <div id="top-bar" className="flex gap-5 me-5 mt-3 justify-end">
      <NavLink to="/">home</NavLink>
      <NavLink to="/exchanges">exchanges</NavLink>
      <NavLink to="/chat" className="text-red-500">chat</NavLink>
      <NavLink to="/history">history</NavLink>
      <NavLink to="/profile">profile</NavLink>
      <NavLink to="/settings">settings</NavLink>
      <LogoutButton />
    </div>
    {user && (
      <div className="w-full flex justify-center gap-4 mt-10">
        <Conversations uid={user.uid} messages={messages} partnerUid={partnerUid} />
        {partnerUid && partnerName ? (
          <Conversation uid={user.uid} partnerUid={partnerUid} partnerName={partnerName} messages={messages} />
        ) : (
          <Card className="w-1/2">
            <CardContent>
              <p className="text-muted-foreground">Select a chat to start messaging.</p>
            </CardContent>
          </Card>
        )}
      </div>
    )}
  </>
}
