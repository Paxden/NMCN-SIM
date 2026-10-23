// Ready-made server situations for the CAOSCE tour, exercises and assessment.
// A scenario is a patch applied on top of a fresh sandbox (see applyScenario in osceStore).
import { makeOsceCandidates } from "./osceData";

export const EXAMINERS = [
  { id: "x1", fullName: "Mrs Grace Okoro", username: "gokoro", password: "grace123", procedure: "", lead: false },
  { id: "x2", fullName: "Mr Ibrahim Bello", username: "ibello", password: "bello123", procedure: "", lead: false },
  { id: "x3", fullName: "Dr Ngozi Eze", username: "neze", password: "eze12345", procedure: "", lead: false },
];
export const withExaminers = (n) => EXAMINERS.slice(0, n).map((e) => ({ ...e }));

export const ip = (id, address, port, approved = false, primary = false) => ({
  id,
  ip: address,
  port,
  approved,
  primary,
});

// Four laptops asking for access (two procedure, two question), none approved yet.
export const PENDING_IPS = () => [
  ip("i1", "192.168.1.41", 8000),
  ip("i2", "192.168.1.42", 7000),
  ip("i3", "192.168.1.43", 8000),
  ip("i4", "192.168.1.44", 7000),
];

// The two "primary" station computers of the sandbox (the ones the Sandbox tools open).
export const STATION_IPS = (approved) => [
  ip("s1", "192.168.1.21", 8000, approved, true),
  ip("s2", "192.168.1.31", 7000, approved, true),
];

export const comps = (patch = {}) => ({
  osce: "idle",
  viva: "idle",
  client_care: "idle",
  family_care: "idle",
  research: "idle",
  ...patch,
});

export const downloaded = (extra = {}) => ({
  loggedIn: true,
  downloaded: true,
  candidates: makeOsceCandidates(24),
  ...extra,
});

export const activated = (extra = {}) => downloaded({ activated: true, ...extra });

// Every candidate has finished all six stations.
export const finishedCandidates = () =>
  makeOsceCandidates(24).map((c) => ({ ...c, progress: c.progress.map(() => true) }));

// Candidates spread across the stations, for showing the P1 > Q1 > P2 ... circles.
export const partwayCandidates = () =>
  makeOsceCandidates(24).map((c, i) => ({ ...c, progress: c.progress.map((_, k) => k < i % 5) }));
