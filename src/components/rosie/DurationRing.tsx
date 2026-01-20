import React, { useRef, useState, useCallback, useEffect } from 'react';

interface DurationRingProps {
  value: number; // Duration in minutes
  onChange: (value: number) => void;
  maxValue?: number; // Maximum minutes (default 120)
  size?: number; // Ring size in pixels (default 200)
  strokeWidth?: number; // Ring stroke width (default 24)
  color?: string; // Ring color
  label?: string; // Label above the time
  showHours?: boolean; // Show hours:minutes format
}

export const DurationRing: React.FC<DurationRingProps> = ({
  value,
  onChange,
  maxValue = 120,
  size = 200,
  strokeWidth = 24,
  color = '#FF9F0A',
  label,
  showHours = true,
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const center = size / 2;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  // Calculate progress (0 to 1)
  const progress = Math.min(value / maxValue, 1);
  const strokeDashoffset = circumference * (1 - progress);

  // Convert angle to value
  const angleToValue = useCallback((angle: number): number => {
    // Normalize angle to 0-360, starting from top (12 o'clock)
    let normalizedAngle = (angle + 90) % 360;
    if (normalizedAngle < 0) normalizedAngle += 360;

    // Convert to value
    const newValue = Math.round((normalizedAngle / 360) * maxValue);
    return Math.max(0, Math.min(maxValue, newValue));
  }, [maxValue]);

  // Get angle from mouse/touch position
  const getAngleFromEvent = useCallback((clientX: number, clientY: number): number => {
    if (!svgRef.current) return 0;

    const rect = svgRef.current.getBoundingClientRect();
    const x = clientX - rect.left - center;
    const y = clientY - rect.top - center;

    // Calculate angle in degrees
    let angle = Math.atan2(y, x) * (180 / Math.PI);
    return angle;
  }, [center]);

  // Handle drag start
  const handleStart = useCallback((clientX: number, clientY: number) => {
    setIsDragging(true);
    const angle = getAngleFromEvent(clientX, clientY);
    onChange(angleToValue(angle));
  }, [getAngleFromEvent, angleToValue, onChange]);

  // Handle drag move
  const handleMove = useCallback((clientX: number, clientY: number) => {
    if (!isDragging) return;
    const angle = getAngleFromEvent(clientX, clientY);
    onChange(angleToValue(angle));
  }, [isDragging, getAngleFromEvent, angleToValue, onChange]);

  // Handle drag end
  const handleEnd = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Mouse events
  const onMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    handleStart(e.clientX, e.clientY);
  };

  // Touch events
  const onTouchStart = (e: React.TouchEvent) => {
    e.preventDefault();
    const touch = e.touches[0];
    handleStart(touch.clientX, touch.clientY);
  };

  // Global event listeners for drag
  useEffect(() => {
    if (!isDragging) return;

    const onMouseMove = (e: MouseEvent) => {
      handleMove(e.clientX, e.clientY);
    };

    const onMouseUp = () => {
      handleEnd();
    };

    const onTouchMove = (e: TouchEvent) => {
      const touch = e.touches[0];
      handleMove(touch.clientX, touch.clientY);
    };

    const onTouchEnd = () => {
      handleEnd();
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    window.addEventListener('touchmove', onTouchMove, { passive: false });
    window.addEventListener('touchend', onTouchEnd);

    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
    };
  }, [isDragging, handleMove, handleEnd]);

  // Format time display
  const formatTime = (minutes: number): string => {
    if (showHours && minutes >= 60) {
      const hrs = Math.floor(minutes / 60);
      const mins = minutes % 60;
      return `${hrs}h ${mins}m`;
    }
    return `${minutes}m`;
  };

  // Calculate knob position
  const knobAngle = (progress * 360 - 90) * (Math.PI / 180);
  const knobX = center + radius * Math.cos(knobAngle);
  const knobY = center + radius * Math.sin(knobAngle);

  return (
    <div className="rosie-duration-ring-container">
      <svg
        ref={svgRef}
        width={size}
        height={size}
        className={`rosie-duration-ring ${isDragging ? 'dragging' : ''}`}
        onMouseDown={onMouseDown}
        onTouchStart={onTouchStart}
      >
        {/* Background track */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="var(--rosie-fill-secondary)"
          strokeWidth={strokeWidth}
          className="rosie-duration-ring-track"
        />

        {/* Progress arc */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          transform={`rotate(-90 ${center} ${center})`}
          className="rosie-duration-ring-progress"
        />

        {/* Draggable knob */}
        <circle
          cx={knobX}
          cy={knobY}
          r={strokeWidth / 2 + 4}
          fill="white"
          stroke={color}
          strokeWidth={3}
          className="rosie-duration-ring-knob"
          style={{
            filter: isDragging ? 'drop-shadow(0 4px 12px rgba(0,0,0,0.3))' : 'drop-shadow(0 2px 8px rgba(0,0,0,0.15))',
          }}
        />
      </svg>

      {/* Center content */}
      <div className="rosie-duration-ring-center">
        {label && <div className="rosie-duration-ring-label">{label}</div>}
        <div className="rosie-duration-ring-value">{formatTime(value)}</div>
        <div className="rosie-duration-ring-hint">Drag to set</div>
      </div>
    </div>
  );
};

export default DurationRing;
