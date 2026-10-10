import type { Route } from "./+types/home";
import { NavLink, useNavigate } from "react-router";
import { redirect, Form } from "react-router";
import { auth } from "~/lib/firebase"
import { LogoutButton } from "~/components/logout-button"
import { Button } from "~/components/ui/button"

export async function clientLoader() {
  await auth.authStateReady()
  const user = auth.currentUser
  if(!user) {
    return redirect("/login")
  }

  
}

export function meta({}: Route.MetaArgs) {
  return [
    { title: "New React Router App" },
    { name: "description", content: "Welcome to React Router!" },
  ];
}

export default function Exchanges() {
  const navigate = useNavigate()
  return <>
    <div id="top-bar" className="flex gap-5 me-5 mt-3 justify-end">
      <NavLink to="/">home</NavLink>
      <NavLink to="/exchanges" className="text-red-500">exchanges</NavLink>
      <NavLink to="/chat">chat</NavLink>
      <NavLink to="/history">history</NavLink>
      <NavLink to="/profile">profile</NavLink>
      <NavLink to="/settings">settings</NavLink>
      <LogoutButton />
    </div>
    <div className="flex justify-end me-5 mt-3">
      <Button type="button" onClick={() => navigate("/post")}>Post</Button>
    </div>
  </>
}


