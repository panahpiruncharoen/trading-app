import type { Route } from "./+types/home";
import { NavLink } from "react-router";
import { redirect, Form } from "react-router";
import { auth } from "~/lib/firebase"

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

export default function History() {
  return <>
    <div id="top-bar" className="flex gap-5 me-5 mt-3 justify-end">
      <NavLink to="/">home</NavLink>
      <NavLink to="/exchanges">exchanges</NavLink>
      <NavLink to="/chat">chat</NavLink>
      <NavLink to="/history" className="text-red-500">history</NavLink>
      <NavLink to="/profile">profile</NavLink>
      <NavLink to="/settings">settings</NavLink>
    </div>
  </>
}

