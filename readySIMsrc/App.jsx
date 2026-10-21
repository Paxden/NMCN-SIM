import { useEffect } from "react";
import { SimProvider, useSim } from "./store";
import { navigate, usePath } from "./router";
import { AdminShell, CreateServer, Login } from "./pages";
import { ExercisePanel, FreePanel, MenuButton, Toast } from "./components";
import { ExerciseList, Hub } from "./menu";
import { Tour } from "./tour";

function Routes() {
  const path = usePath();
  const { loggedIn, mode, tour, exercise, adoptFree } = useSim();

  const isApp = path === "/createserver" || path.startsWith("/admin");
  const known = isApp || path === "/" || path === "/exercises";

  useEffect(() => {
    if (!known) navigate("/");
  }, [known]);

  // Opening /createserver or /admin directly behaves like free play.
  useEffect(() => {
    if (isApp && mode === "menu") adoptFree();
  }, [isApp, mode]);

  let page = null;
  if (path === "/") page = <Hub />;
  else if (path === "/exercises") page = <ExerciseList />;
  else if (path === "/createserver") page = <CreateServer />;
  else if (path.startsWith("/admin")) page = loggedIn ? <AdminShell path={path} /> : <Login />;

  return (
    <>
      {page}
      {isApp && mode === "free" && <FreePanel />}
      {isApp && mode === "exercise" && exercise && <ExercisePanel />}
      {isApp && mode === "guide" && tour && <Tour />}
      {isApp && mode !== "guide" && <MenuButton />}
    </>
  );
}

export default function App() {
  return (
    <SimProvider>
      <Routes />
      <Toast />
    </SimProvider>
  );
}
