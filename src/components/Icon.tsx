const paths = {
  play: "M8 5l11 7-11 7z",
  pause: "M8 5v14m8-14v14",
  reset: "M4 10a8 8 0 1 1 1 7M4 4v6h6",
  expand: "M9 4H4v5m11-5h5v5M4 15v5h5m11-5v5h-5",
  panel: "M3 5h18v14H3zM3 14h18",
  settings: "M3 7h7m4 0h7M3 17h12m4 0h2M10 4v6m5 4v6",
  radio:
    "M9 9a5 5 0 0 0 0 6m6-6a5 5 0 0 1 0 6M6 6a9 9 0 0 0 0 12M18 6a9 9 0 0 1 0 12",
  book: "M3 5q5-2 9 1 4-3 9-1v14q-5-2-9 1-4-3-9-1zM12 6v14",
  eye: "M2 12q10-14 20 0-10 14-20 0zM15 12a3 3 0 1 1-6 0 3 3 0 1 1 6 0",
  weather: "M8 18h10a4 4 0 0 0 0-8 6 6 0 0 0-11-2 5 5 0 0 0 1 10",
  down: "m6 9 6 6 6-6",
  close: "m5 5 14 14M19 5 5 19",
  target: "M3 9V3h6m6 0h6v6m0 6v6h-6m-6 0H3v-6M10 12h4",
  bars: "M5 19v-4m5 4v-8m5 8V7m5 12V3",
  timer: "M12 8v5l3 2M21 13a9 9 0 1 1-18 0 9 9 0 1 1 18 0M9 2h6",
  route: "M5 20 9 4m10 16L15 4m-3 15v-4m0-4V7",
  chev: "m8 5 7 7-7 7",
  info: "M12 10v7m0-11v1M22 12a10 10 0 1 1-20 0 10 10 0 1 1 20 0",
};
export function Icon({
  name,
  size = 18,
}: {
  name: keyof typeof paths;
  size?: number;
}) {
  return (
    <svg
      aria-hidden="true"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={name === "play" ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={paths[name]} />
    </svg>
  );
}
