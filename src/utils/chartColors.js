// Chart color schemes with accessibility considerations
export const CHART_COLORS = {
  // Primary color palette - accessible contrast ratios
  primary: [
    "#2a9d8f", // Brand teal (Evergreen)
    "#22c55e", // Green
    "#f59e0b", // Amber
    "#ef4444", // Red
    "#8b5cf6", // Purple
    "#06b6d4", // Cyan
    "#84cc16", // Lime
    "#f97316", // Orange
    "#ec4899", // Pink
    "#6366f1", // Indigo
  ],
  
  // Performance-based colors
  performance: {
    positive: "#10b981", // Green-500
    negative: "#ef4444", // Red-500
    neutral: "#6b7280",  // Gray-500
    warning: "#f59e0b",  // Amber-500
  },
  
  // Gradient definitions for enhanced visual appeal
  gradients: {
    success: {
      from: "#dcfce7", // Green-100
      to: "#bbf7d0",   // Green-200
    },
    danger: {
      from: "#fee2e2", // Red-100
      to: "#fecaca",   // Red-200
    },
    primary: {
      from: "#dcefeb", // Teal-100 (brand)
      to: "#b9e6db",   // Teal-200 (brand)
    },
    warning: {
      from: "#fef3c7", // Amber-100
      to: "#fde68a",   // Amber-200
    },
  },
  
  // Accessible color combinations for different chart types
  schemes: {
    // High contrast for bar charts
    bars: {
      fill: "#2a9d8f",
      stroke: "#158477",
      strokeWidth: 1,
    },
    
    // Area chart colors with transparency
    areas: {
      stroke: "#10b981",
      strokeWidth: 2,
      fill: "url(#successGradient)",
      fillOpacity: 0.1,
    },
    
    // Line chart colors
    lines: {
      stroke: "#3b82f6",
      strokeWidth: 2,
      strokeDasharray: "5 5",
    },
  },
};

// Function to get color based on value (positive/negative)
export const getPerformanceColor = (value, isDark = false) => {
  if (value > 0) {
    return isDark ? "#34d399" : "#059669"; // Green
  } else if (value < 0) {
    return isDark ? "#f87171" : "#dc2626"; // Red
  }
  return isDark ? "#9ca3af" : "#6b7280"; // Gray
};

// Function to get accessible text color based on background
export const getContrastTextColor = (backgroundColor) => {
  // Simple contrast calculation - in a real app, you might use a more sophisticated algorithm
  const rgb = backgroundColor.replace('#', '');
  const r = parseInt(rgb.substr(0, 2), 16);
  const g = parseInt(rgb.substr(2, 2), 16);
  const b = parseInt(rgb.substr(4, 2), 16);
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  
  return brightness > 128 ? '#000000' : '#ffffff';
};

// Chart theme configuration for consistent styling
export const CHART_THEME = {
  grid: {
    stroke: "#e5e7eb",
    strokeDasharray: "3 3",
    opacity: 0.6,
  },
  
  axes: {
    stroke: "#6b7280",
    fontSize: 12,
    axisLine: false,
    tickLine: false,
  },
  
  tooltip: {
    backgroundColor: "white",
    border: "1px solid #e5e7eb",
    borderRadius: "8px",
    boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
    padding: "12px",
  },
  
  tooltipDark: {
    backgroundColor: "#1f2937",
    border: "1px solid #374151",
    borderRadius: "8px",
    boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.3)",
    padding: "12px",
  },
};

export default CHART_COLORS;
