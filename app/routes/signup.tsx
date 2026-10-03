import type { Route } from "./+types/signup";
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
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select"
import { Input } from "~/components/ui/input"
import { Label } from "~/components/ui/label"
import { auth, db } from "~/lib/firebase"
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import { FirebaseError } from "firebase/app";
import { redirect, Form, Link } from "react-router";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "New React Router App" },
    { name: "description", content: "Welcome to React Router!" },
  ];
}

export async function clientAction({
  request,
}: Route.ClientActionArgs) {
  const formData = await request.formData();
  const firstName = String(formData.get("name") ?? "").trim();
  const lastName = String(formData.get("lastName") ?? "").trim();
  const country = String(formData.get("country") ?? "");
  const phoneNumber = String(formData.get("PhoneNumber") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!firstName || !lastName || !country || !phoneNumber || !email || !password) {
    return "Please fill in all fields"
  }
  try {
    const { user } = await createUserWithEmailAndPassword(auth, email, password)
    await updateProfile(user, { displayName: `${firstName} ${lastName}` })
    await setDoc(doc(db, "users", user.uid), {
      firstName,
      lastName,
      country,
      phoneNumber,
      email,
      createdAt: serverTimestamp(),
    })
  } catch (error) {
    if (error instanceof FirebaseError) {
      switch (error.code) {
        case "auth/email-already-in-use":
          return "This email is already registered"
        case "auth/invalid-email":
          return "Invalid email address"
        case "auth/weak-password":
          return "Password must be at least 6 characters"
      }
    }
    return "Sign up failed, please try again"
  }
  return redirect("/");
}

export async function clientLoader() {
  await auth.authStateReady()
  const user = auth.currentUser
  if(user) {
    return redirect("/")
  }

  
}
const CountryList = [
  { label: "America", value: "America" },
  { label: "Thailand", value: "Thailand" },
  { label: "China", value: "China" },
]
 
export default function SignUp({ actionData }) {
  return (
    <div className="items-center justify-center w-full min-h-screen flex">
      <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>SignUp new account</CardTitle>
        <CardDescription>
          Fill in your details below to create an account
        </CardDescription>
      </CardHeader>
      <Form method="post">
      <CardContent>      
          <div className="flex flex-col gap-6">
            <div className="grid gap-2">
              <Label htmlFor="name">FirstName</Label>
              <Input
                id="name"
                type="text"
                name="name"
                placeholder="john"
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="lastName">LastName</Label>
              <Input
                id="lastName"
                type="text"
                name="lastName"
                placeholder="doe"
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="contry">Country</Label>
                <Select items={CountryList} name="country" required>
                  <SelectTrigger className="w-[180px]">
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
              <Label htmlFor="PhoneNumber">PhoneNumber</Label>
              <Input
                id="PhoneNumber"
                type="tel"
                name="PhoneNumber"
                placeholder="xxx-xxx-xxxx"
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                name="email"
                placeholder="m@example.com"
                required
              />
            </div>
            <div className="grid gap-2">
              <div className="flex items-center">
                <Label htmlFor="password">Password</Label>
              </div>
              <Input id="password" type="password" name="password" required />
            </div>
          </div>        
      </CardContent>
      <CardFooter className="flex-col gap-2">
        <Button type="submit" className="w-full">
          Sign up
        </Button>
        {actionData}
        <p className="text-sm text-muted-foreground">
          Already have an account? <Link to="/login" className="underline">Login</Link>
        </p>
      </CardFooter>
      </Form>
    </Card>
    </div>
    
  )
}