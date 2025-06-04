const MoviesIcon = ({ color = "#fff", size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <rect x="3" y="7" width="18" height="12" rx="2" stroke={color} strokeWidth="2"/>
    <rect x="3" y="3" width="18" height="4" rx="1" stroke={color} strokeWidth="2"/>
    <line x1="6" y1="3" x2="6" y2="19" stroke={color} strokeWidth="2"/>
    <line x1="18" y1="3" x2="18" y2="19" stroke={color} strokeWidth="2"/>
  </svg>
);
export default MoviesIcon;