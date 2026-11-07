import { type RouteConfig, index, route} from "@react-router/dev/routes";
export default [
    index("routes/home.tsx"), 
    route("login", "routes/login.tsx"),
    route("settings", "routes/settings.tsx"),
    route("profile/:uid?", "routes/profile.tsx"),
    route("exchanges", "routes/exchanges.tsx"),
    route("chat/:uid?", "routes/chat.tsx"),
    route("history", "routes/history.tsx"),
    route("signup", "routes/signup.tsx"),
    route("post", "routes/post.tsx"),
] satisfies RouteConfig;
