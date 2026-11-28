import type { Route } from "./+types/post";
import { NavLink } from "react-router";
import { redirect, Form, useNavigation } from "react-router";
import { useEffect, useRef, useState } from "react";
import { auth, db, storage } from "~/lib/firebase"
import { collection, doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { deleteObject, ref, uploadBytes } from "firebase/storage";
import { LogoutButton } from "~/components/logout-button"
import { Button } from "~/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "~/components/ui/card"
import { Input } from "~/components/ui/input"
import { Label } from "~/components/ui/label"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select"
import { getPostType, PostTypeList } from "~/lib/post-types"

// keep in sync with storage.rules and firestore.rules
const MAX_IMAGES = 5
const MAX_IMAGE_SIZE = 5 * 1024 * 1024

export async function clientLoader() {
  await auth.authStateReady()
  const user = auth.currentUser
  if(!user) {
    return redirect("/login")
  }
}

export async function clientAction({
  request,
}: Route.ClientActionArgs) {
  await auth.authStateReady()
  const user = auth.currentUser
  if (!user) {
    return redirect("/login")
  }
  const formData = await request.formData();
  const title = String(formData.get("title") ?? "").trim();
  const content = String(formData.get("content") ?? "").trim();
  const type = getPostType(formData.get("type"))?.value;
  if (!title || !content || !type) {
    return "Please fill in all fields"
  }
  // an empty file input still sends one nameless file
  const files = formData.getAll("images").filter((file): file is File => file instanceof File && file.size > 0)
  if (files.length > MAX_IMAGES) {
    return `You can attach at most ${MAX_IMAGES} images`
  }
  if (files.some((file) => !file.type.startsWith("image/") || file.size > MAX_IMAGE_SIZE)) {
    return "Images must be image files under 5 MB"
  }
  // the id is picked once per form, so a request sent twice targets the same post
  const postId = String(formData.get("postId") ?? "")
  if (!postId || postId.includes("/")) {
    return "Could not create your post, please try again"
  }
  const post = doc(db, "posts", postId)
  // files are named by index, so storage.rules can cap a post at 5 images
  const images = files.map((_, i) => `images/${user.uid}/posts/${post.id}/${i}`)
  // a post that already exists means this request was a repeat of one that succeeded
  async function alreadyPosted() {
    const existing = await getDoc(post).catch(() => null)
    return existing?.exists() && existing.data().uid === user!.uid
  }
  if (await alreadyPosted()) {
    return redirect("/profile")
  }
  // the rules only allow creating images and posts, never overwriting them, so a repeat can't make a second copy
  const uploads = await Promise.allSettled(files.map((file, i) => uploadBytes(ref(storage, images[i]), file, { contentType: file.type })))
  try {
    const failed = uploads.find((upload) => upload.status === "rejected")
    if (failed) {
      throw failed.reason
    }
    await setDoc(post, {
      uid: user.uid,
      type,
      title,
      content,
      images,
      timestamp: serverTimestamp(),
    })
  } catch (error) {
    console.error(error)
    if (await alreadyPosted()) {
      return redirect("/profile")
    }
    // don't leave images behind for a post that was never made, but only ones this request uploaded,
    // as the others may belong to a repeat of this request that is still running
    await Promise.allSettled(images
      .filter((_, i) => uploads[i].status === "fulfilled")
      .map((path) => deleteObject(ref(storage, path))))
    return "Could not create your post, please try again"
  }
  // your own posts are shown on your profile, not the home page
  return redirect("/profile");
}

export function meta({}: Route.MetaArgs) {
  return [
    { title: "New React Router App" },
    { name: "description", content: "Welcome to React Router!" },
  ];
}

export default function Post({ actionData }: Route.ComponentProps) {
  // stays the same across retries, and a new one comes with the next visit to this page
  const [postId] = useState(() => doc(collection(db, "posts")).id)
  // stays disabled until the action has finished, so the post can't be sent twice
  const posting = useNavigation().state !== "idle"
  const imagesInput = useRef<HTMLInputElement>(null)
  const [files, setFiles] = useState<File[]>([])
  const [previews, setPreviews] = useState<string[]>([])
  useEffect(() => {
    const urls = files.map((file) => URL.createObjectURL(file))
    setPreviews(urls)
    // object urls hold the file in memory until revoked
    return () => urls.forEach((url) => URL.revokeObjectURL(url))
  }, [files])

  // the input only holds its latest pick, so its files are replaced with every image chosen so far
  function updateFiles(next: File[]) {
    const input = imagesInput.current!
    const transfer = new DataTransfer()
    next.forEach((file) => transfer.items.add(file))
    input.files = transfer.files
    setFiles(next)
  }

  function onImagesChange(event: React.ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget
    const picked = Array.from(input.files ?? [])
    const next = [...files, ...picked]
    input.setCustomValidity("")
    if (next.length > MAX_IMAGES) {
      input.setCustomValidity(`You can attach at most ${MAX_IMAGES} images`)
      input.reportValidity()
      input.setCustomValidity("")
    }
    updateFiles(next.slice(0, MAX_IMAGES))
  }

  return <>
    <div id="top-bar" className="flex gap-5 me-5 mt-3 justify-end">
      <NavLink to="/">home</NavLink>
      <NavLink to="/exchanges">exchanges</NavLink>
      <NavLink to="/chat">chat</NavLink>
      <NavLink to="/history">history</NavLink>
      <NavLink to="/profile">profile</NavLink>
      <NavLink to="/settings">settings</NavLink>
      <LogoutButton />
    </div>
    <div className="w-full flex justify-center mt-10">
      <Card className="w-1/2">
        <CardHeader>
          <CardTitle>Create a post</CardTitle>
          <CardDescription>
            Choose what kind of post this is, then add a title and information
          </CardDescription>
        </CardHeader>
        <Form method="post" encType="multipart/form-data">
          <input type="hidden" name="postId" value={postId} />
          <CardContent>
            <div className="flex flex-col gap-6">
              <div className="grid gap-2">
                <Label htmlFor="type">Type</Label>
                <Select items={PostTypeList} name="type" required>
                  <SelectTrigger id="type" className="w-[180px]">
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {PostTypeList.map((item) => (
                        <SelectItem key={item.value} value={item.value}>
                          {item.label}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
                <ul className="text-sm text-muted-foreground">
                  {PostTypeList.map((item) => (
                    <li key={item.value}><span className="font-medium">{item.label}</span>: {item.hint}</li>
                  ))}
                </ul>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  type="text"
                  name="title"
                  placeholder="Title"
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="content">Information</Label>
                <textarea
                  id="content"
                  name="content"
                  rows={5}
                  placeholder="Write your information here..."
                  className="w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="images">Images (up to {MAX_IMAGES})</Label>
                <Input
                  ref={imagesInput}
                  id="images"
                  type="file"
                  name="images"
                  accept="image/*"
                  multiple
                  disabled={files.length >= MAX_IMAGES}
                  onChange={onImagesChange}
                />
                {previews.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {previews.map((url, i) => (
                      <div key={url} className="relative">
                        <img src={url} alt="" className="size-20 rounded-lg border object-cover" />
                        <button
                          type="button"
                          aria-label="Remove image"
                          onClick={() => updateFiles(files.filter((_, j) => j !== i))}
                          className="absolute -top-2 -right-2 size-5 rounded-full bg-black text-xs text-white"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex-col gap-2 mt-6">
            <Button type="submit" className="w-full" disabled={posting}>
              {posting ? "Posting..." : "Post"}
            </Button>
            {!posting && actionData}
          </CardFooter>
        </Form>
      </Card>
    </div>
  </>
}
