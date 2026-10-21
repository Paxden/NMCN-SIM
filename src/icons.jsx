const base = (size) => ({
  width: size,
  height: size,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2.6,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": true,
});

export const IconCheck = ({ size = 18 }) => (
  <svg {...base(size)}><path d="M5 13l4 4L19 7" /></svg>
);
export const IconCross = ({ size = 18 }) => (
  <svg {...base(size)}><path d="M6 6l12 12M18 6L6 18" /></svg>
);
export const IconUpload = ({ size = 16 }) => (
  <svg {...base(size)}><path d="M12 16V4m0 0L8 8m4-4l4 4M4 20h16" /></svg>
);
export const IconDownload = ({ size = 16 }) => (
  <svg {...base(size)}><path d="M12 4v12m0 0l-4-4m4 4l4-4M4 20h16" /></svg>
);
