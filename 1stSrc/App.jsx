import { useEffect } from "react";
import { SimProvider, useSim } from "./store";
import { navigate, usePath } from "./router";
import { AdminShell, CreateServer, Login } from "./pages";
import { SimPanel, Toast } from "./components";

function Routes() {
  const path = usePath();
  const { loggedIn } = useSim();

  const known = path === "/createserver" || path.startsWith("/admin");
  useEffect(() => {
    if (!known) navigate("/createserver");
  }, [known]);

  if (path === "/createserver") return <CreateServer />;
  if (path.startsWith("/admin")) return loggedIn ? <AdminShell path={path} /> : <Login />;
  return null;
}

export default function App() {
  return (
    <SimProvider>
      <Routes />
      <SimPanel />
      <Toast />
    </SimProvider>
  );
}
