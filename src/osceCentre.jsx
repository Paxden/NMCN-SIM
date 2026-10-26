import { useState } from "react";
import { useOsce, SERVER_LOGIN } from "./osceStore";
import { navigate } from "./router";
import { useReport } from "./osceShared";

// The first page of the CAOSCE server (localhost:5000/createcentre).
// The centre manager enters the Server ID and 6-character password given by the NMCN.
// Creating the centre needs internet (mobile hotspot). After that, login works offline.
export function CreateCentre() {
  const { createCentre } = useOsce();
  const report = useReport();
  const [id, setId] = useState("");
  const [pw, setPw] = useState("");

  const submit = (e) => {
    e.preventDefault();
    const r = createCentre(id, pw);
    report(r);
    if (r.ok) navigate("/osce/login");
  };

  return (
    <div className="center-page">
      <form className="card auth" onSubmit={submit}>
        <h2>Create Centre</h2>
        <div className="note">
          Sandbox details: Server ID <strong>{SERVER_LOGIN.id}</strong>, password{" "}
          <strong>{SERVER_LOGIN.password}</strong>. Creating the centre needs internet, so connect the server laptop to
          your mobile hotspot first.
        </div>
        <label>Server ID</label>
        <input value={id} onChange={(e) => setId(e.target.value)} autoFocus />
        <label>Password (6 characters)</label>
        <input type="password" value={pw} onChange={(e) => setPw(e.target.value)} />
        <button className="btn btn-primary block" type="submit">
          Create centre
        </button>
      </form>
    </div>
  );
}