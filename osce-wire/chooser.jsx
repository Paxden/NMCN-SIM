import "./chooser.css";
import { Link, navigate } from "./router";
import { useAuth } from "./auth";

// Remembered per browser tab and per user, so the picker shows once after each sign-in.
const KEY = "nmcn-module-chosen";
export const hasChosen = (user) => {
  try {
    return !!user && sessionStorage.getItem(KEY) === String(user.id ?? user.email ?? "user");
  } catch {
    return true; // storage blocked: never trap the user in a redirect loop
  }
};
const remember = (user) => {
  try {
    if (user) sessionStorage.setItem(KEY, String(user.id ?? user.email ?? "user"));
  } catch {
    /* ignore */
  }
};

export function ChooseModule() {
  const { user } = useAuth();
  const go = (to) => {
    remember(user);
    navigate(to);
  };
  return (
    <div className="mod-page">
      <div className="mod-wrap">
        <h1>Welcome{user?.name ? `, ${user.name}` : ""}</h1>
        <p>The examination has two parts. Choose the server you want to practise on.</p>
        <div className="mod-grid">
          <button className="mod-card" onClick={() => go("/")}>
            <span className="mod-tag">Part 1</span>
            <h2>CBT server</h2>
            <p>The computer-based test. Create a server, activate the exam and sessions, then monitor candidates.</p>
            <ul>
              <li>Guided tour, free play and exercises</li>
              <li>Pass/fail competence assessment</li>
            </ul>
            <span className="mod-go">Open CBT &rarr;</span>
          </button>
          <button className="mod-card osce" onClick={() => go("/osce")}>
            <span className="mod-tag">Part 2</span>
            <h2>CAOSCE server</h2>
            <p>The practical examination. Run the server laptop in the OSCE hall: examiners, station computers and the IP whitelist.</p>
            <ul>
              <li>Day 1: viva, client care, family care, research</li>
              <li>Day 2: OSCE, six stations per candidate</li>
            </ul>
            <span className="mod-go">Open CAOSCE &rarr;</span>
          </button>
        </div>
      </div>
    </div>
  );
}

// Small link back to the picker, shown on the trainer home and inside the CAOSCE server.
export const SwitchModule = () => (
  <Link to="/choose" className="mod-switch">Switch CBT / CAOSCE</Link>
);
