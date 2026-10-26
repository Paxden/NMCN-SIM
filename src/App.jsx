import { useEffect } from "react";
import { SimProvider, useSim } from "./store";
import { OsceProviders } from "./osceTrainer";
import { navigate, usePath } from "./router";
import { AdminShell, Login } from "./pages";
import {
  AssessmentPanel,
  ExercisePanel,
  FreePanel,
  MenuButton,
  Toast,
} from "./components";
import { AssessmentPage, AssessmentResult, ExerciseList, Hub } from "./menu";
import { OsceRoutes, StationPage } from "./osce";
import { ChooseModule, SwitchModule, hasChosen } from "./chooser";
import { Tour } from "./tour";
import { AuthProvider, useAuth } from "./auth";
import { DashboardPage, LoginPage } from "./authPages";
import { CandidateButton, CandidatePage } from "./candidate";

const GUEST_KEY = "cbt-trainer-guest";

function Routes() {
  const path = usePath();
  const { user, ready } = useAuth();
  const { loggedIn, mode, tour, exercise, assessment, adoptFree } = useSim();

  const isAdmin = user?.role === "admin";
  const isGuest = !user && sessionStorage.getItem(GUEST_KEY) === "1";
  const onServer = path.startsWith("/admin"); // CBT server pages
  const onCand = path === "/candidate"; // CBT candidate computer
  const inSim = onServer || onCand;
  const isStation = path.startsWith("/osce-station/");
  const isOsce = path === "/osce" || path.startsWith("/osce/");

  const known =
    inSim ||
    isStation ||
    isOsce ||
    [
      "/",
      "/exercises",
      "/assessment",
      "/assessment/result",
      "/login",
      "/dashboard",
      "/choose",
    ].includes(path);

  useEffect(() => {
    if (!ready) return;

    // A signed-in NMCN admin only ever sees the admin dashboard.
    if (isAdmin) {
      if (path !== "/dashboard") navigate("/dashboard");
      return;
    }

    // Legacy route: the CBT server starts at its login screen, not create-server.
    if (path === "/createserver") {
      navigate("/admin");
      return;
    }

    if (!known) {
      navigate(isGuest ? "/choose" : "/");
      return;
    }

    // Signed-in managers choose a module after login. Guests can choose directly too.
    if (user && path === "/" && !hasChosen(user)) navigate("/choose");
  }, [ready, isAdmin, user, path, known, isGuest]);

  // Directly opening CBT server/candidate pages behaves like free play.
  useEffect(() => {
    if (!isAdmin && inSim && mode === "menu") adoptFree();
  }, [isAdmin, inSim, mode, adoptFree]);

  // Avoid flashing trainer pages while stored authentication is being checked.
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
  else if (onCand) page = <CandidatePage />;
  else if (onServer) page = loggedIn ? <AdminShell path={path} /> : <Login />;

  // CAOSCE has its own switch link inside its main page.
  const showSwitch =
    !isAdmin &&
    (isGuest || !!user) &&
    (path === "/" || (isOsce && path !== "/osce"));
  const taskOpen =
    mode === "assessment" && assessment && assessment.phase !== "done";

  return (
    <>
      {page}
      {showSwitch && <SwitchModule />}
      {onServer && mode === "free" && <FreePanel />}
      {inSim && mode === "exercise" && exercise && <ExercisePanel />}
      {inSim && mode === "guide" && tour && <Tour />}
      {inSim && taskOpen && <AssessmentPanel />}
      {onServer && mode !== "guide" && !taskOpen && <MenuButton />}
      {onServer && <CandidateButton />}
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
