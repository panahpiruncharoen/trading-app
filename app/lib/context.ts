import {createContext} from "react"
import { type User } from "firebase/auth"
export const UserContext = createContext<{user: User | null, loading: boolean}>({user: null, loading: true})