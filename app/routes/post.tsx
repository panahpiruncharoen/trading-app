import type { Route } from "./+types/post";
import { NavLink } from "react-router";
import { redirect, Form } from "react-router";
import { auth, db } from "~/lib/firebase"
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
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
  if (!title || !content) {
    return "Please fill in all fields"
  }
  try {
    await addDoc(collection(db, "posts"), {
      uid: user.uid,
      title,
      content,
      timestamp: serverTimestamp(),
    })
  } catch (error) {
    console.error(error)
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
            Add a title and information for your post
          </CardDescription>
        </CardHeader>
        <Form method="post">
          <CardContent>
            <div className="flex flex-col gap-6">
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
