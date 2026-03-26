import React, { useRef, useState } from "react";

interface DataPoint {
  month: string;
  amount: number;
}

interface SavingsChartProps {
  data: DataPoint[];
  title?: string;
  view?: "monthly" | "cumulative";
  onViewChange?: (view: "monthly" | "cumulative") => void;
}

const SavingsChart: React.FC<SavingsChartProps> = ({
  data,
  title = "Contribution Trend",
  view = "monthly",
  onViewChange,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [tooltip, setTooltip] = useState<{
    x: number;
    y: number;
    amount: number;
    month: string;
  } | null>(null);
  const viewLabel = view === "cumulative" ? "Cumulative" : "Monthly";
  const subtitle =
    view === "cumulative"
      ? "Cumulative totals for the last 6 months"
      : "Monthly totals for the last 6 months";
  const maxAmount = data.length ? Math.max(...data.map((d) => d.amount)) : 0;
  const minAmount = data.length ? Math.min(...data.map((d) => d.amount)) : 0;
  const range = maxAmount - minAmount || 1;

  const formatCurrency = (amount: number) => {
    if (amount >= 1000000) {
      return `₦${(amount / 1000000).toFixed(1)}M`;
    }
    if (amount >= 1000) {
      return `₦${(amount / 1000).toFixed(0)}K`;
    }
    return `₦${amount}`;
  };

  const formatExactCurrency = (amount: number) =>
    new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);

  /*

  */

  // Calculate SVG path for the area chart
  const chartWidth = 100;
  const chartHeight = 60;
  const padding = 5;
  const pointDenominator = Math.max(1, data.length - 1);

  const points = data.map((d, i) => {
    const x = padding + (i / pointDenominator) * (chartWidth - padding * 2);
    const y =
      chartHeight -
      padding -
      ((d.amount - minAmount) / range) * (chartHeight - padding * 2);
    return { x, y };
  });

  const linePath = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`)
    .join(" ");
  const areaPath = `${linePath} L ${points[points.length - 1].x} ${chartHeight - padding} L ${padding} ${chartHeight - padding} Z`;

  // Calculate percentage change
  const firstAmount = data[0]?.amount || 0;
  const lastAmount = data[data.length - 1]?.amount || 0;
  const percentChange =
    firstAmount > 0 ? ((lastAmount - firstAmount) / firstAmount) * 100 : 0;
  const isPositive = percentChange >= 0;

  const updateTooltip = (
    event: React.MouseEvent<SVGCircleElement, MouseEvent>,
    index: number,
  ) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const rawX = event.clientX - rect.left;
    const rawY = event.clientY - rect.top;
    const maxX = Math.max(0, rect.width - 12);
    const maxY = Math.max(0, rect.height - 12);
    const x = Math.min(Math.max(rawX, 12), maxX);
    const y = Math.min(Math.max(rawY, 12), maxY);
    const dataPoint = data[index];
    if (!dataPoint) return;
    setTooltip({
      x,
      y,
      amount: dataPoint.amount,
      month: dataPoint.month,
    });
  };

  const showTooltipAtPoint = (index: number) => {
    if (!containerRef.current) return;
    const point = points[index];
    const dataPoint = data[index];
    if (!point || !dataPoint) return;
    const rect = containerRef.current.getBoundingClientRect();
    const rawX = (point.x / chartWidth) * rect.width;
    const rawY = (point.y / chartHeight) * rect.height;
    const maxX = Math.max(0, rect.width - 12);
    const maxY = Math.max(0, rect.height - 12);
    const x = Math.min(Math.max(rawX, 12), maxX);
    const y = Math.min(Math.max(rawY, 12), maxY);
    setTooltip({
      x,
      y,
      amount: dataPoint.amount,
      month: dataPoint.month,
    });
  };

  const hideTooltip = () => setTooltip(null);

  const tooltipLabel =
    view === "cumulative" ? "Cumulative total" : "Monthly total";

  return (
    <div className="bg-white shadow-sm p-6 border border-gray-100 rounded-2xl">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="font-semibold text-gray-900 text-lg">{title}</h3>
          <p className="text-gray-500 text-sm">{subtitle}</p>
        </div>
        <div className="flex items-center gap-3">
          {onViewChange && (
            <div className="flex items-center rounded-full bg-gray-100 p-1 text-xs">
              {(["monthly", "cumulative"] as const).map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => onViewChange(option)}
                  className={`px-3 py-1 rounded-full font-medium transition-colors ${
                    view === option
                      ? "bg-white text-gray-900 shadow-sm"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                  aria-pressed={view === option}
                >
                  {option === "monthly" ? "Monthly" : "Cumulative"}
                </button>
              ))}
            </div>
          )}
          <div
            className={`flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${
              isPositive
                ? "bg-emerald-100 text-emerald-700"
                : "bg-red-100 text-red-700"
            }`}
            aria-label={`${viewLabel} change ${Math.abs(percentChange).toFixed(1)} percent`}
          >
            <svg
              className={`w-4 h-4 ${isPositive ? "" : "rotate-180"}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 10l7-7m0 0l7 7m-7-7v18"
              />
            </svg>
            {Math.abs(percentChange).toFixed(1)}%
          </div>
        </div>
      </div>

      {/* Chart */}
      <div ref={containerRef} className="relative h-48">
        <svg
          viewBox={`0 0 ${chartWidth} ${chartHeight}`}
          className="w-full h-full"
          preserveAspectRatio="none"
        >
          {/* Gradient definition */}
          <defs>
            <linearGradient
              id="chartGradient"
              x1="0%"
              y1="0%"
              x2="0%"
              y2="100%"
            >
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0.05" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          {[0, 1, 2, 3].map((i) => (
            <line
              key={i}
              x1={padding}
              y1={padding + (i / 3) * (chartHeight - padding * 2)}
              x2={chartWidth - padding}
              y2={padding + (i / 3) * (chartHeight - padding * 2)}
              stroke="#e5e7eb"
              strokeWidth="0.3"
              strokeDasharray="2,2"
            />
          ))}

          {/* Area fill */}
          <path d={areaPath} fill="url(#chartGradient)" />

          {/* Line */}
          <path
            d={linePath}
            fill="none"
            stroke="#10b981"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Data points */}
          {points.map((p, i) => (
            <circle
              key={i}
              cx={p.x}
              cy={p.y}
              r="2.5"
              fill="#10b981"
              stroke="white"
              strokeWidth="1"
              className="cursor-pointer"
              onMouseEnter={(event) => updateTooltip(event, i)}
              onMouseMove={(event) => updateTooltip(event, i)}
              onMouseLeave={hideTooltip}
              onFocus={() => showTooltipAtPoint(i)}
              onBlur={hideTooltip}
              tabIndex={0}
            />
          ))}
        </svg>

        {/* Y-axis labels */}
        <div className="top-0 left-0 absolute flex flex-col justify-between py-2 h-full text-gray-400 text-xs">
          <span>{formatCurrency(maxAmount)}</span>
          <span>{formatCurrency((maxAmount + minAmount) / 2)}</span>
          <span>{formatCurrency(minAmount)}</span>
        </div>

        {tooltip && (
          <div
            className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-[110%] rounded-lg bg-slate-900 px-3 py-2 text-xs text-white shadow-lg"
            style={{ left: tooltip.x, top: tooltip.y }}
          >
            <p className="font-semibold">{tooltip.month}</p>
            <p>
              {tooltipLabel}: {formatExactCurrency(tooltip.amount)}
            </p>
          </div>
        )}
      </div>

      {/* X-axis labels */}
      <div className="flex justify-between mt-2 px-8">
        {data.map((d, i) => (
          <span key={i} className="text-gray-400 text-xs">
            {d.month}
          </span>
        ))}
      </div>

      {/* Summary */}
      <div className="gap-4 grid grid-cols-3 mt-6 pt-4 border-gray-100 border-t">
        <div>
          <p className="text-gray-500 text-xs">
            {view === "cumulative" ? "Starting Total" : "Starting Month"}
          </p>
          <p className="font-semibold text-gray-900 text-sm">
            {formatCurrency(firstAmount)}
          </p>
        </div>
        <div>
          <p className="text-gray-500 text-xs">
            {view === "cumulative" ? "Latest Total" : "Latest Month"}
          </p>
          <p className="font-semibold text-gray-900 text-sm">
            {formatCurrency(lastAmount)}
          </p>
        </div>
        <div>
          <p className="text-gray-500 text-xs">
            {view === "cumulative" ? "Total Change" : "Change"}
          </p>
          <p
            className={`text-sm font-semibold ${isPositive ? "text-emerald-600" : "text-red-600"}`}
          >
            {isPositive ? "+" : ""}
            {formatCurrency(lastAmount - firstAmount)}
          </p>
        </div>
      </div>
    </div>
  );
};

export default SavingsChart;
