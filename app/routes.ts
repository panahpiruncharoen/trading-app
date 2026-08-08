import { type RouteConfig, index, route} from "@react-router/dev/routes";
export default [
    index("routes/home.tsx"), 
    route("login", "routes/login.tsx"),
    route("settings", "routes/settings.tsx"),
    route("profile", "routes/profile.tsx"),
    route("exchanges", "routes/exchanges.tsx"),
    route("chat", "routes/chat.tsx"),
    route("history", "routes/history.tsx"),
] satisfies RouteConfig;
