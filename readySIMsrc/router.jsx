import { useEffect, useState } from "react";

export function navigate(to) {
  if (window.location.pathname !== to) {
    window.history.pushState({}, "", to);
    window.dispatchEvent(new PopStateEvent("popstate"));
  }
}

const clean = (p) => p.replace(/\/+$/, "") || "/";

export function usePath() {
  const [path, setPath] = useState(clean(window.location.pathname));
  useEffect(() => {
    const onChange = () => setPath(clean(window.location.pathname));
    window.addEventListener("popstate", onChange);
    return () => window.removeEventListener("popstate", onChange);
  }, []);
  return path;
}

export function Link({ to, children, className, ...rest }) {
  return (
    <a
      href={to}
      className={className}
      onClick={(e) => {
        e.preventDefault();
        navigate(to);
      }}
      {...rest}
    >
      {children}
    </a>
  );
}
