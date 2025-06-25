const FavoritesIcon = ({ color = "#fff", size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <polygon
      points="12,3 15,10 22,10 16.5,14 18.5,21 12,17 5.5,21 7.5,14 2,10 9,10"
      stroke={color}
      strokeWidth="2"
      fill="none"
      strokeLinejoin="round"
    />
  </svg>
);
export default FavoritesIcon;