const TIMELINE_COLORS = [
  'border-l-red-600 bg-red-100',
  'border-l-blue-600 bg-blue-100', 
  'border-l-green-600 bg-green-100'
];

export function generateTimelineMap(frames) {
  const timelineMap = new Map();
  const uniqueTimelines = new Map(); // Map timeline ID to its frames
  
  frames.forEach((frame) => {
    if (frame.time_line && frame.time_line.length > 0) {
      const timelineId = frame.time_line.sort().join(',');
      
      if (!uniqueTimelines.has(timelineId)) {
        uniqueTimelines.set(timelineId, frame.time_line);
      }
    }
  });
  
  let timelineColorIndex = 0;
  uniqueTimelines.forEach((timelineFrames, timelineId) => {
    const color = TIMELINE_COLORS[timelineColorIndex % TIMELINE_COLORS.length];
    
    timelineFrames.forEach((frameId) => {
      timelineMap.set(frameId, color);
    });
    
    timelineColorIndex++;
  });
  
  return timelineMap;
}