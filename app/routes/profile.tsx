import type { Route } from "./+types/profile";
import { NavLink, useSearchParams } from "react-router";
import { redirect, Form } from "react-router";
import { auth, db } from "~/lib/firebase"
import { CountryList } from "~/lib/countries"
import { updateProfile } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
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

export async function clientLoader() {
  await auth.authStateReady()
  const user = auth.currentUser
  if(!user) {
    return redirect("/login")
  }
  const profile = await getDoc(doc(db, "users", user.uid))
  const data = profile.data()
  return {
    firstName: data?.firstName ?? "",
    lastName: data?.lastName ?? "",
    country: data?.country ?? "",
    phoneNumber: data?.phoneNumber ?? "",
    email: user.email ?? "",
    createdAt: data?.createdAt?.toDate().toLocaleDateString("en-GB") ?? "",
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

export default function Profile({ loaderData, actionData }: Route.ComponentProps) {
  const [searchParams, setSearchParams] = useSearchParams()
  const isEditing = searchParams.has("edit")
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
    <div className="w-full flex justify-center mt-10">
      <Card className="w-1/2">
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>
            {isEditing ? "Update your information below" : "Your account information"}
          </CardDescription>
          {!isEditing && (
            <CardAction>
              <Button type="button" variant="outline" onClick={() => setSearchParams({edit: "true"})}>Edit</Button>
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
          </CardContent>
        )}
      </Card>
    </div>
  </>
}
