const ShowsIcon = ({ color = "#fff", size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <rect x="3" y="7" width="18" height="11" rx="2" stroke={color} strokeWidth="2"/>
    <rect x="8" y="18" width="8" height="2" rx="1" fill={color}/>
    <line x1="8" y1="4" x2="16" y2="10" stroke={color} strokeWidth="2" strokeLinecap="round"/>
    <line x1="16" y1="4" x2="8" y2="10" stroke={color} strokeWidth="2" strokeLinecap="round"/>
  </svg>
);
export default ShowsIcon;