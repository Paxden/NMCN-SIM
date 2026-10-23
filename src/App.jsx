import { useEffect } from "react";
import { SimProvider, useSim } from "./store";
import { OsceProviders } from "./osceTrainer";
import { navigate, usePath } from "./router";
import { AdminShell, CreateServer, Login } from "./pages";
import { AssessmentPanel, ExercisePanel, FreePanel, MenuButton, Toast } from "./components";
import { AssessmentPage, AssessmentResult, ExerciseList, Hub } from "./menu";
import { OsceRoutes, StationPage } from "./osce";
import { ChooseModule, SwitchModule, hasChosen } from "./chooser";
import { Tour } from "./tour";
import { AuthProvider, useAuth } from "./auth";
import { DashboardPage, LoginPage } from "./authPages";

function Routes() {
  const path = usePath();
  const { user, ready } = useAuth();
  const { loggedIn, mode, tour, exercise, assessment, adoptFree } = useSim();

  const isAdmin = user?.role === "admin";
  const isApp = path === "/createserver" || path.startsWith("/admin");
  const isStation = path.startsWith("/osce-station/");
  const isOsce = path === "/osce" || path.startsWith("/osce/");
  const known =
    isApp ||
    isStation ||
    isOsce ||
    ["/", "/exercises", "/assessment", "/assessment/result", "/login", "/dashboard", "/choose"].includes(path);

  useEffect(() => {
    if (!ready) return;
    // A signed-in NMCN admin only ever sees the dashboard, never the simulation.
    if (isAdmin) {
      if (path !== "/dashboard") navigate("/dashboard");
      return;
    }
    if (!known) return navigate("/");
    // After signing in, a manager first chooses CBT or CAOSCE.
    if (user && path === "/" && !hasChosen(user)) navigate("/choose");
  }, [ready, isAdmin, user, path, known]);

  // Opening /createserver or /admin directly behaves like free play.
  useEffect(() => {
    if (!isAdmin && isApp && mode === "menu") adoptFree();
  }, [isAdmin, isApp, mode]);

  // Wait for the stored sign-in to be checked, so an admin never sees a flash of the trainer.
  if (!ready) return <div className="boot">Loading...</div>;
  if (isAdmin && path !== "/dashboard") return null;

  let page = null;
  if (path === "/") page = <Hub />;
  else if (path === "/choose") page = <ChooseModule />;
  else if (path === "/exercises") page = <ExerciseList />;
  else if (path === "/assessment") page = <AssessmentPage />;
  else if (path === "/assessment/result") page = <AssessmentResult />;
  else if (path === "/login") page = <LoginPage />;
  else if (path === "/dashboard") page = <DashboardPage />;
  else if (isStation) page = <StationPage path={path} />;
  else if (isOsce) page = <OsceRoutes path={path} />;
  else if (path === "/createserver") page = <CreateServer />;
  else if (path.startsWith("/admin")) page = loggedIn ? <AdminShell path={path} /> : <Login />;

  // The CAOSCE menu has its own "Switch CBT / CAOSCE" link, so skip the floating one there.
  const showSwitch = !isAdmin && !!user && (path === "/" || (isOsce && path !== "/osce"));

  return (
    <>
      {page}
      {showSwitch && <SwitchModule />}
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
        <OsceProviders>
          <Routes />
          <Toast />
        </OsceProviders>
      </SimProvider>
    </AuthProvider>
  );
}