
const TIMELINE_COLORS = [
  'border-l-red-600 bg-red-100',
  'border-l-blue-600 bg-blue-100', 
  'border-l-green-600 bg-green-100'
];

export function getTimelineColor(idx) {
  return TIMELINE_COLORS[idx % TIMELINE_COLORS.length];
}
