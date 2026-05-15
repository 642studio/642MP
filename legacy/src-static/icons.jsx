// Minimal inline-SVG icon set. 16px stroke icons, expressive enough for an internal tool.
const I = ({d, size=16, fill='none', stroke='currentColor', sw=1.6, vb='0 0 24 24', children, style}) => (
  <svg width={size} height={size} viewBox={vb} fill={fill} stroke={stroke} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" style={style}>
    {d ? <path d={d}/> : children}
  </svg>
);

const Icon = {
  home:      ({size=16}) => <I size={size}><path d="M3 11l9-8 9 8"/><path d="M5 9.5V21h14V9.5"/></I>,
  users:     ({size=16}) => <I size={size}><circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.8-3 3.5-5 6.5-5s5.7 2 6.5 5"/><circle cx="17" cy="9" r="2.5"/><path d="M16 14.5c2.6.3 4.5 2.2 5 5"/></I>,
  briefcase: ({size=16}) => <I size={size}><rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M3 13h18"/></I>,
  grid:      ({size=16}) => <I size={size}><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></I>,
  camera:    ({size=16}) => <I size={size}><path d="M4 8h3l2-3h6l2 3h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z"/><circle cx="12" cy="13" r="3.5"/></I>,
  check:     ({size=16}) => <I size={size}><path d="M4 12l5 5L20 6"/></I>,
  doc:       ({size=16}) => <I size={size}><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6"/><path d="M8 13h8M8 17h6"/></I>,
  chart:     ({size=16}) => <I size={size}><path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/></I>,
  box:       ({size=16}) => <I size={size}><path d="M3 7l9-4 9 4-9 4-9-4z"/><path d="M3 7v10l9 4 9-4V7"/><path d="M12 11v10"/></I>,
  cog:       ({size=16}) => <I size={size}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8L4.2 7a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9c.3.6.9 1 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></I>,
  search:    ({size=16}) => <I size={size}><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></I>,
  plus:      ({size=16}) => <I size={size}><path d="M12 5v14M5 12h14"/></I>,
  bell:      ({size=16}) => <I size={size}><path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9z"/><path d="M10 21a2 2 0 0 0 4 0"/></I>,
  bolt:      ({size=16}) => <I size={size}><path d="M13 2 3 14h8l-1 8 10-12h-8z"/></I>,
  filter:    ({size=16}) => <I size={size}><path d="M3 5h18l-7 9v5l-4-2v-3z"/></I>,
  sparkles:  ({size=16}) => <I size={size}><path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M5.6 18.4l2.8-2.8M15.6 8.4l2.8-2.8"/></I>,
  arrow:     ({size=16}) => <I size={size}><path d="M5 12h14M13 5l7 7-7 7"/></I>,
  arrowL:    ({size=16}) => <I size={size}><path d="M19 12H5M11 5l-7 7 7 7"/></I>,
  arrowDown: ({size=16}) => <I size={size}><path d="M12 5v14M5 13l7 7 7-7"/></I>,
  ext:       ({size=16}) => <I size={size}><path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M21 14v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5"/></I>,
  download:  ({size=16}) => <I size={size}><path d="M12 4v12M6 12l6 6 6-6"/><path d="M4 20h16"/></I>,
  pdf:       ({size=16}) => <I size={size}><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6"/><text x="7" y="17" fontSize="6" fill="currentColor" stroke="none" fontFamily="monospace">PDF</text></I>,
  send:      ({size=16}) => <I size={size}><path d="M22 2 11 13"/><path d="M22 2 15 22l-4-9-9-4z"/></I>,
  calendar:  ({size=16}) => <I size={size}><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/></I>,
  clock:     ({size=16}) => <I size={size}><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></I>,
  pin:       ({size=16}) => <I size={size}><path d="M12 22s7-6.5 7-12a7 7 0 0 0-14 0c0 5.5 7 12 7 12z"/><circle cx="12" cy="10" r="2.5"/></I>,
  drag:      ({size=16}) => <I size={size}><circle cx="9" cy="6" r="1.2" fill="currentColor"/><circle cx="9" cy="12" r="1.2" fill="currentColor"/><circle cx="9" cy="18" r="1.2" fill="currentColor"/><circle cx="15" cy="6" r="1.2" fill="currentColor"/><circle cx="15" cy="12" r="1.2" fill="currentColor"/><circle cx="15" cy="18" r="1.2" fill="currentColor"/></I>,
  more:      ({size=16}) => <I size={size}><circle cx="5" cy="12" r="1.4" fill="currentColor"/><circle cx="12" cy="12" r="1.4" fill="currentColor"/><circle cx="19" cy="12" r="1.4" fill="currentColor"/></I>,
  chevR:     ({size=16}) => <I size={size}><path d="m9 6 6 6-6 6"/></I>,
  chevL:     ({size=16}) => <I size={size}><path d="m15 6-6 6 6 6"/></I>,
  chevD:     ({size=16}) => <I size={size}><path d="m6 9 6 6 6-6"/></I>,
  x:         ({size=16}) => <I size={size}><path d="m6 6 12 12M6 18 18 6"/></I>,
  star:      ({size=16}) => <I size={size}><path d="m12 3 2.7 5.6 6.3.9-4.6 4.4 1.1 6.1L12 17l-5.5 3 1.1-6.1L3 9.5l6.3-.9z"/></I>,
  reel:      ({size=16}) => <I size={size}><rect x="3" y="6" width="18" height="12" rx="2"/><path d="M3 10h18M3 14h18M7 6v12M17 6v12"/></I>,
  image:     ({size=16}) => <I size={size}><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="M21 16 16 11 5 21"/></I>,
  carousel:  ({size=16}) => <I size={size}><rect x="6" y="4" width="14" height="14" rx="2"/><rect x="3" y="7" width="14" height="14" rx="2" fill="white"/></I>,
  history:   ({size=16}) => <I size={size}><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></I>,
  link:      ({size=16}) => <I size={size}><path d="M10 14a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1"/><path d="M14 10a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1"/></I>,
  lock:      ({size=16}) => <I size={size}><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></I>,
  flame:     ({size=16}) => <I size={size}><path d="M12 2c1 4 5 5 5 10a5 5 0 0 1-10 0c0-2 1-3 1-5-2 1-3 3-3 5a8 8 0 0 0 16 0c0-7-6-6-9-10z"/></I>,
  inbox:     ({size=16}) => <I size={size}><path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.5 5h13L22 12v6a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-6z"/></I>,
};

window.Icon = Icon;
window.IconSVG = I;
