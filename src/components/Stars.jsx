import { Star } from 'lucide-react';

export default function Stars({ rating = 0, size = 15 }) {
  const full = Math.round(rating);
  return (
    <span className="stars" aria-label={`${rating} out of 5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} size={size} fill={i <= full ? 'currentColor' : 'none'} className={i <= full ? 'star-filled' : 'star-empty'} />
      ))}
    </span>
  );
}
