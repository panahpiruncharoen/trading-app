import { useContext } from "react";
import { UserContext } from "~/lib/context"
import type { Route } from "./+types/home";
import { NavLink } from "react-router";
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

export function meta({}: Route.MetaArgs) {
  return [
    { title: "New React Router App" },
    { name: "description", content: "Welcome to React Router!" },
  ];
}
function Post() {
  return(
    <Card className="w-1/2">
      <CardHeader>
        <CardTitle>Username</CardTitle>
        <CardDescription>
          Posted on ...
        </CardDescription>
      </CardHeader>
      <CardContent>
        Information...
      </CardContent>
      <CardFooter className="flex-col gap-2">
        <Button type="submit" className="w-full">
          Accept
        </Button>
        <Button variant="outline" className="w-full">
          Decline
        </Button>
      </CardFooter>
    </Card>
  )
}
export default function Home() {
  const {user, loading} = useContext(UserContext)
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
          </>
        ) : (
          <>
            <NavLink to="/login">login</NavLink>
          </>
        )}
      </div>
      <div className="w-full flex items-center justify-center m-5">
        <Field orientation="horizontal" className="w-1/2">
          <Input type="search" placeholder="Search..." />
          <Button>Search</Button>
        </Field>
      </div>
      <div className="w-full flex flex-col gap-4 items-center justify-center">
        <Post/>
        <Post/>
      </div>
    </>
  );

}
