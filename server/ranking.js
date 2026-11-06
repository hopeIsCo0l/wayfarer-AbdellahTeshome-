// Twenty prior reviews at 3.5 stars temper tiny samples without hiding new places.
export const PRIOR_MEAN = 3.5;
export const PRIOR_WEIGHT = 20;
export function rankingScore(average, count) {
  return (average * count + PRIOR_MEAN * PRIOR_WEIGHT) / (count + PRIOR_WEIGHT);
}
export const rankingSql = `(COALESCE(SUM(r.rating), 0) + ${PRIOR_MEAN * PRIOR_WEIGHT}.0) / (COUNT(r.id) + ${PRIOR_WEIGHT})`;
