import { collection, doc, getDoc, getDocs, limit, orderBy, query, Timestamp } from "firebase/firestore";
import { auth, db } from "~/lib/firebase"
import { getImageUrls } from "~/lib/images"
import { useContext } from "react";
import { UserContext } from "~/lib/context"
import type { Route } from "./+types/home";
import { NavLink, useNavigate } from "react-router";
import { LogoutButton } from "~/components/logout-button"
import { Button } from "~/components/ui/button"
import { Field } from "~/components/ui/field"
import { Input } from "~/components/ui/input"
import { Label } from "~/components/ui/label"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "~/components/ui/card"
import { getPostType } from "~/lib/post-types"


export function meta({}: Route.MetaArgs) {
  return [
    { title: "New React Router App" },
    { name: "description", content: "Welcome to React Router!" },
  ];
}

export async function clientLoader() {
  await auth.authStateReady()
  // newest posts only, so the page never loads the whole collection
  const posts = await getDocs(query(collection(db, "posts"), orderBy("timestamp", "desc"), limit(20)))
  // each author is looked up once, even if they wrote several posts
  const usernames = new Map<string, Promise<string>>()
  function getUsername(uid: string) {
    if (!usernames.has(uid)) {
      usernames.set(uid, getDoc(doc(db, "users", uid)).then((author) =>
        `${author.data()?.firstName ?? ""} ${author.data()?.lastName ?? ""}`.trim()))
    }
    return usernames.get(uid)!
  }
  // your own posts are on your profile page instead
  const otherPosts = posts.docs.filter((post) => post.data().uid !== auth.currentUser?.uid)
  return Promise.all(otherPosts.map(async (post)=>{
    const data = post.data()
    // posts made before images existed have none
    const images = await getImageUrls(data.images)
    // users can only be read when signed in, see firestore.rules
    if (!auth.currentUser) {
      return {...data, images, username: "Member"}
    }
    return {...data, images, username: await getUsername(data.uid)}
  }))
}

function Post({uid, username, type, title, timestamp, content, images}) {
  // posts made before types existed have no type
  const postType = getPostType(type)
  return(
    <Card className="w-1/2">
      <CardHeader>
        <CardTitle>
          <NavLink to={`/profile/${uid}`} className="hover:underline">{username}</NavLink>
        </CardTitle>
        <CardDescription>
          Posted on {timestamp}
        </CardDescription>
        {postType && (
          <CardAction>
            <span className="rounded-full border px-2.5 py-0.5 text-xs font-medium">{postType.label}</span>
          </CardAction>
        )}
      </CardHeader>
      <CardContent>
        <p className="font-semibold">{title}</p>
        {content}
        {images.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-3">
            {images.map((url) => (
              <a key={url} href={url} target="_blank" rel="noreferrer">
                <img src={url} alt="" className="size-24 rounded-lg border object-cover" />
              </a>
            ))}
          </div>
        )}
      </CardContent>
      <CardFooter className="flex-col gap-2">
        <Button type="submit" className="w-full">
          {postType?.accept ?? "Accept"}
        </Button>
        <Button variant="outline" className="w-full">
          Decline
        </Button>
      </CardFooter>
    </Card>
  )
}
export default function Home({loaderData}) {
  const {user, loading} = useContext(UserContext)
  const navigate = useNavigate()
  if( loading) {return null}
  return (
    <>
      <div id="top-bar" className="flex gap-5 me-5 mt-3 justify-end">
        {user? (
          <>
            <NavLink to="/" className="text-red-500">home</NavLink>
            <NavLink to="/exchanges">exchanges</NavLink>
            <NavLink to="/chat">chat</NavLink>
            <NavLink to="/history">history</NavLink>
            <NavLink to="/profile">profile</NavLink>
            <NavLink to="/settings">settings</NavLink>
            <LogoutButton />
          </>
        ) : (
          <>
            <NavLink to="/login">login</NavLink>
            <NavLink to="/signup">signup</NavLink>
          </>
        )}
      </div>
      <div className="w-full flex items-center justify-center m-5">
        <Field orientation="horizontal" className="w-1/2">
          <Input type="search" placeholder="Search..." />
          <Button>Search</Button>
          {user && (
            <Button type="button" variant="outline" onClick={() => navigate("/post")}>Post</Button>
          )}
        </Field>
      </div>
      <div className="w-full flex flex-col gap-4 items-center justify-center">
        {loaderData.map((post)=>{
          return <Post uid={post.uid} username={post.username} type={post.type} title={post.title} timestamp={post.timestamp.toDate().toLocaleDateString("en-GB")} content={post.content} images={post.images}/>
        })}
      </div>
    </>
  );

}
