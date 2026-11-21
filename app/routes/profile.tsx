import type { Route } from "./+types/profile";
import { NavLink, useNavigate, useSearchParams } from "react-router";
import { redirect, Form } from "react-router";
import { auth, db } from "~/lib/firebase"
import { CountryList } from "~/lib/countries"
import { updateProfile } from "firebase/auth";
import { collection, deleteDoc, doc, getDoc, getDocs, query, serverTimestamp, setDoc, updateDoc, where } from "firebase/firestore";
import { LogoutButton } from "~/components/logout-button"
import { Button } from "~/components/ui/button"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "~/components/ui/card"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select"
import { Input } from "~/components/ui/input"
import { Label } from "~/components/ui/label"
import { getPostType } from "~/lib/post-types"

export async function clientLoader({ params }: Route.ClientLoaderArgs) {
  await auth.authStateReady()
  const user = auth.currentUser
  if(!user) {
    return redirect("/login")
  }
  const uid = params.uid ?? user.uid
  const isOwnProfile = uid === user.uid
  const profile = await getDoc(doc(db, "users", uid))
  const data = profile.data()
  const isBlocked = !isOwnProfile && (await getDoc(doc(db, "users", user.uid, "blocked", uid))).exists()
  // sorted here rather than with orderBy, which would need a composite index
  const postDocs = await getDocs(query(collection(db, "posts"), where("uid", "==", uid)))
  const posts = postDocs.docs
    .map((post) => ({ id: post.id, ...post.data() }))
    .sort((a, b) => (b.timestamp?.toMillis() ?? 0) - (a.timestamp?.toMillis() ?? 0))
    .map((post) => ({
      id: post.id,
      type: post.type,
      title: post.title ?? "",
      content: post.content ?? "",
      timestamp: post.timestamp?.toDate().toLocaleDateString("en-GB") ?? "",
    }))
  return {
    uid,
    isOwnProfile,
    isBlocked,
    firstName: data?.firstName ?? "",
    lastName: data?.lastName ?? "",
    country: data?.country ?? "",
    phoneNumber: data?.phoneNumber ?? "",
    email: (isOwnProfile ? user.email : data?.email) ?? "",
    createdAt: data?.createdAt?.toDate().toLocaleDateString("en-GB") ?? "",
    posts,
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
  const intent = formData.get("intent")
  if (intent === "editPost") {
    const postId = String(formData.get("postId") ?? "")
    const title = String(formData.get("title") ?? "").trim()
    const content = String(formData.get("content") ?? "").trim()
    if (!postId || !title || !content) {
      return "Please fill in all fields"
    }
    try {
      // only the author can update, and only title and content, see firestore.rules
      await updateDoc(doc(db, "posts", postId), { title, content })
    } catch (error) {
      console.error(error)
      return "Could not save your post, please try again"
    }
    return redirect("/profile")
  }
  if (intent === "block" || intent === "unblock") {
    if (!params.uid || params.uid === user.uid) {
      return null
    }
    // blocked users can't send this user new messages, see firestore.rules
    const blocked = doc(db, "users", user.uid, "blocked", params.uid)
    try {
      if (intent === "block") {
        await setDoc(blocked, { createdAt: serverTimestamp() })
      } else {
        await deleteDoc(blocked)
      }
    } catch (error) {
      console.error(error)
      return "Could not update, please try again"
    }
    return null
  }
  const firstName = String(formData.get("firstName") ?? "").trim();
  const lastName = String(formData.get("lastName") ?? "").trim();
  const country = String(formData.get("country") ?? "");
  const phoneNumber = String(formData.get("phoneNumber") ?? "").trim();
  if (!firstName || !lastName || !country || !phoneNumber) {
    return "Please fill in all fields"
  }
  try {
    // email is linked to the login, so it is never written here
    await setDoc(doc(db, "users", user.uid), {
      firstName,
      lastName,
      country,
      phoneNumber,
    }, { merge: true })
    await updateProfile(user, { displayName: `${firstName} ${lastName}` })
  } catch (error) {
    console.error(error)
    return "Could not save your changes, please try again"
  }
  return redirect("/profile");
}

export function meta({}: Route.MetaArgs) {
  return [
    { title: "New React Router App" },
    { name: "description", content: "Welcome to React Router!" },
  ];
}

function ProfileRow({label, value}: {label: string, value: string}) {
  return (
    <div className="grid gap-1">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p>{value || "-"}</p>
    </div>
  )
}

type ProfilePostProps = {
  id: string,
  type: unknown,
  title: string,
  timestamp: string,
  content: string,
  canEdit: boolean,
  isEditing: boolean,
  error: string | null | undefined,
  onEdit: () => void,
  onCancel: () => void,
}

function ProfilePost({id, type, title, timestamp, content, canEdit, isEditing, error, onEdit, onCancel}: ProfilePostProps) {
  // posts made before types existed have no type
  const postType = getPostType(type)
  if (isEditing) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Edit post</CardTitle>
          <CardDescription>Posted on {timestamp}</CardDescription>
        </CardHeader>
        <Form method="post">
          <input type="hidden" name="intent" value="editPost" />
          <input type="hidden" name="postId" value={id} />
          <CardContent>
            <div className="flex flex-col gap-6">
              <div className="grid gap-2">
                <Label htmlFor={`title-${id}`}>Title</Label>
                <Input id={`title-${id}`} type="text" name="title" defaultValue={title} maxLength={200} required />
              </div>
              <div className="grid gap-2">
                <Label htmlFor={`content-${id}`}>Information</Label>
                <textarea
                  id={`content-${id}`}
                  name="content"
                  rows={5}
                  defaultValue={content}
                  maxLength={5000}
                  className="w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                  required
                />
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex-col gap-2 mt-6">
            <Button type="submit" className="w-full">Save</Button>
            <Button type="button" variant="outline" className="w-full" onClick={onCancel}>Cancel</Button>
            {error}
          </CardFooter>
        </Form>
      </Card>
    )
  }
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>Posted on {timestamp}</CardDescription>
        {(postType || canEdit) && (
          <CardAction className="flex items-center gap-2">
            {postType && (
              <span className="rounded-full border px-2.5 py-0.5 text-xs font-medium">{postType.label}</span>
            )}
            {canEdit && (
              <Button type="button" variant="outline" size="sm" onClick={onEdit}>Edit</Button>
            )}
          </CardAction>
        )}
      </CardHeader>
      <CardContent>
        <p className="whitespace-pre-wrap">{content}</p>
      </CardContent>
    </Card>
  )
}

export default function Profile({ loaderData, actionData }: Route.ComponentProps) {
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const { isOwnProfile } = loaderData
  // only the owner can edit, even if ?edit is in the url
  const isEditing = isOwnProfile && searchParams.has("edit")
  const editingPostId = isOwnProfile ? searchParams.get("editPost") : null
  return <>
    <div id="top-bar" className="flex gap-5 me-5 mt-3 justify-end">
      <NavLink to="/">home</NavLink>
      <NavLink to="/exchanges">exchanges</NavLink>
      <NavLink to="/chat">chat</NavLink>
      <NavLink to="/history">history</NavLink>
      <NavLink to="/profile" className="text-red-500">profile</NavLink>
      <NavLink to="/settings">settings</NavLink>
      <LogoutButton />
    </div>
    <div className="w-full flex justify-center items-start gap-6 mt-10 px-5">
      <Card className="w-2/5">
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>
            {isEditing ? "Update your information below" : isOwnProfile ? "Your account information" : "Account information"}
          </CardDescription>
          {!isEditing && (
            <CardAction className="flex gap-2">
              {isOwnProfile ? (
                <Button type="button" variant="outline" disabled={!isOwnProfile} onClick={() => setSearchParams({edit: "true"})}>Edit</Button>
              ) : (
                <>
                  <Button type="button" onClick={() => navigate(`/chat/${loaderData.uid}`)}>Chat</Button>
                  <Form method="post">
                    <input type="hidden" name="intent" value={loaderData.isBlocked ? "unblock" : "block"} />
                    <Button type="submit" variant="outline">{loaderData.isBlocked ? "Unblock" : "Block"}</Button>
                  </Form>
                </>
              )}
            </CardAction>
          )}
        </CardHeader>
        {isEditing ? (
          <Form method="post">
            <CardContent>
              <div className="flex flex-col gap-6">
                <div className="grid gap-2">
                  <Label htmlFor="firstName">First name</Label>
                  <Input
                    id="firstName"
                    type="text"
                    name="firstName"
                    defaultValue={loaderData.firstName}
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="lastName">Last name</Label>
                  <Input
                    id="lastName"
                    type="text"
                    name="lastName"
                    defaultValue={loaderData.lastName}
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="country">Country</Label>
                  <Select items={CountryList} name="country" defaultValue={loaderData.country} required>
                    <SelectTrigger id="country" className="w-[180px]">
                      <SelectValue placeholder="Country" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {CountryList.map((item) => (
                          <SelectItem key={item.value} value={item.value}>
                            {item.label}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="phoneNumber">Phone number</Label>
                  <Input
                    id="phoneNumber"
                    type="tel"
                    name="phoneNumber"
                    defaultValue={loaderData.phoneNumber}
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" value={loaderData.email} disabled readOnly />
                  <p className="text-sm text-muted-foreground">Your email is linked to your login and can't be changed.</p>
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex-col gap-2 mt-6">
              <Button type="submit" className="w-full">
                Save
              </Button>
              <Button type="button" variant="outline" className="w-full" onClick={() => setSearchParams({})}>
                Cancel
              </Button>
              {actionData}
            </CardFooter>
          </Form>
        ) : (
          <CardContent>
            <div className="flex flex-col gap-6">
              <ProfileRow label="First name" value={loaderData.firstName} />
              <ProfileRow label="Last name" value={loaderData.lastName} />
              <ProfileRow label="Country" value={loaderData.country} />
              <ProfileRow label="Phone number" value={loaderData.phoneNumber} />
              <ProfileRow label="Email" value={loaderData.email} />
              <ProfileRow label="Member since" value={loaderData.createdAt} />
            </div>
            {!editingPostId && actionData}
          </CardContent>
        )}
      </Card>
      <div className="w-2/5 flex flex-col gap-4">
        <h2 className="font-semibold">{isOwnProfile ? "Your posts" : "Posts"}</h2>
        {loaderData.posts.length === 0 ? (
          <p className="text-sm text-muted-foreground">No posts yet</p>
        ) : (
          loaderData.posts.map((post) => (
            <ProfilePost
              key={post.id}
              {...post}
              canEdit={isOwnProfile}
              isEditing={post.id === editingPostId}
              error={post.id === editingPostId ? actionData : null}
              onEdit={() => setSearchParams({editPost: post.id})}
              onCancel={() => setSearchParams({})}
            />
          ))
        )}
      </div>
    </div>
  </>
}
