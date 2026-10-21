import { useEffect } from "react";
import { SimProvider, useSim } from "./store";
import { navigate, usePath } from "./router";
import { AdminShell, CreateServer, Login } from "./pages";
import { AssessmentPanel, ExercisePanel, FreePanel, MenuButton, Toast } from "./components";
import { AssessmentPage, AssessmentResult, ExerciseList, Hub } from "./menu";
import { Tour } from "./tour";
import { AuthProvider } from "./auth";
import { DashboardPage, LoginPage } from "./authPages";

function Routes() {
  const path = usePath();
  const { loggedIn, mode, tour, exercise, assessment, adoptFree } = useSim();

  const isApp = path === "/createserver" || path.startsWith("/admin");
  const known =
    isApp ||
    ["/", "/exercises", "/assessment", "/assessment/result", "/login", "/dashboard"].includes(path);

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
  else if (path === "/assessment") page = <AssessmentPage />;
  else if (path === "/assessment/result") page = <AssessmentResult />;
  else if (path === "/login") page = <LoginPage />;
  else if (path === "/dashboard") page = <DashboardPage />;
  else if (path === "/createserver") page = <CreateServer />;
  else if (path.startsWith("/admin")) page = loggedIn ? <AdminShell path={path} /> : <Login />;

  return (
    <>
      {page}
      {isApp && mode === "free" && <FreePanel />}
      {isApp && mode === "exercise" && exercise && <ExercisePanel />}
      {isApp && mode === "guide" && tour && <Tour />}
      {isApp && mode === "assessment" && assessment && assessment.phase !== "done" && <AssessmentPanel />}
      {isApp && mode !== "guide" && !(mode === "assessment" && assessment && assessment.phase !== "done") && <MenuButton />}
    </>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <SimProvider>
        <Routes />
        <Toast />
      </SimProvider>
    </AuthProvider>
  );
}