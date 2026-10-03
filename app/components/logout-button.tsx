import { signOut } from "firebase/auth";
import { useNavigate } from "react-router";
import { auth } from "~/lib/firebase"

export function LogoutButton() {
  const navigate = useNavigate()
  async function handleLogout() {
    await signOut(auth)
    navigate("/")
  }
  return <button type="button" onClick={handleLogout} className="cursor-pointer">logout</button>
}
