import type { Route } from "./+types/post";
import { NavLink } from "react-router";
import { redirect, Form } from "react-router";
import { useEffect, useState } from "react";
import { auth, db, storage } from "~/lib/firebase"
import { collection, doc, serverTimestamp, setDoc } from "firebase/firestore";
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
  // the id is made first so the images can be stored under it
  const post = doc(collection(db, "posts"))
  // files are named by index, so storage.rules can cap a post at 5 images
  const images = files.map((_, i) => `images/${user.uid}/posts/${post.id}/${i}`)
  try {
    await Promise.all(files.map((file, i) => uploadBytes(ref(storage, images[i]), file, { contentType: file.type })))
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
    // don't leave images behind for a post that was never made
    await Promise.allSettled(images.map((path) => deleteObject(ref(storage, path))))
    return "Could not create your post, please try again"
  }
  return redirect("/");
}

export function meta({}: Route.MetaArgs) {
  return [
    { title: "New React Router App" },
    { name: "description", content: "Welcome to React Router!" },
  ];
}

export default function Post({ actionData }: Route.ComponentProps) {
  const [previews, setPreviews] = useState<string[]>([])
  // object urls hold the file in memory until revoked
  useEffect(() => () => previews.forEach((url) => URL.revokeObjectURL(url)), [previews])

  function onImagesChange(event: React.ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget
    const files = Array.from(input.files ?? [])
    input.setCustomValidity(files.length > MAX_IMAGES ? `You can attach at most ${MAX_IMAGES} images` : "")
    input.reportValidity()
    setPreviews(files.slice(0, MAX_IMAGES).map((file) => URL.createObjectURL(file)))
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
                  id="images"
                  type="file"
                  name="images"
                  accept="image/*"
                  multiple
                  onChange={onImagesChange}
                />
                {previews.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {previews.map((url) => (
                      <img key={url} src={url} alt="" className="size-20 rounded-lg border object-cover" />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex-col gap-2 mt-6">
            <Button type="submit" className="w-full">
              Post
            </Button>
            {actionData}
          </CardFooter>
        </Form>
      </Card>
    </div>
  </>
}
