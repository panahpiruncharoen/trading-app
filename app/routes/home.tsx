import type { Route } from "./+types/home";
import { NavLink } from "react-router";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "New React Router App" },
    { name: "description", content: "Welcome to React Router!" },
  ];
}

export default function Home() {
  const is_login = false;
  return <>
    <div id="top-bar" className="flex gap-5 me-5 mt-3 justify-end">
      <NavLink to="/login">login</NavLink>
      <NavLink to="/settings">settings</NavLink>
    </div>
  </>

  // return (
  //   <>
  //     <div id="top-bar" className="flex gap-5 me-5 mt-3 justify-end">
  //       {is_login ? (
  //         <>
  //           <NavLink to="/home">home</NavLink>
  //           <NavLink to="/exchanges">exchanges</NavLink>
  //           <NavLink to="/chat">chat</NavLink>
  //           <NavLink to="/history">history</NavLink>
  //           <NavLink to="/settings">settings</NavLink>
  //         </>
  //       ) : (
  //         <>
  //           <NavLink to="/login">login</NavLink>
  //           <NavLink to="/settings">settings</NavLink>
  //         </>
  //       )}
  //     </div>
  //   </>
  // );
}
