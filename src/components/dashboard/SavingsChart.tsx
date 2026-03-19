import React from 'react';

interface DataPoint {
  month: string;
  amount: number;
}

interface SavingsChartProps {
  data: DataPoint[];
  title?: string;
}

const SavingsChart: React.FC<SavingsChartProps> = ({ data, title = 'Savings Growth' }) => {
  const maxAmount = Math.max(...data.map(d => d.amount));
  const minAmount = Math.min(...data.map(d => d.amount));
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

  // Calculate SVG path for the area chart
  const chartWidth = 100;
  const chartHeight = 60;
  const padding = 5;

  const points = data.map((d, i) => {
    const x = padding + (i / (data.length - 1)) * (chartWidth - padding * 2);
    const y = chartHeight - padding - ((d.amount - minAmount) / range) * (chartHeight - padding * 2);
    return { x, y };
  });

  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const areaPath = `${linePath} L ${points[points.length - 1].x} ${chartHeight - padding} L ${padding} ${chartHeight - padding} Z`;

  // Calculate percentage change
  const firstAmount = data[0]?.amount || 0;
  const lastAmount = data[data.length - 1]?.amount || 0;
  const percentChange = firstAmount > 0 ? ((lastAmount - firstAmount) / firstAmount) * 100 : 0;
  const isPositive = percentChange >= 0;

  return (
    <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          <p className="text-sm text-gray-500">Last 6 months performance</p>
        </div>
        <div className={`flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${
          isPositive ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
        }`}>
          <svg className={`w-4 h-4 ${isPositive ? '' : 'rotate-180'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
          </svg>
          {Math.abs(percentChange).toFixed(1)}%
        </div>
      </div>

      {/* Chart */}
      <div className="relative h-48">
        <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full h-full" preserveAspectRatio="none">
          {/* Gradient definition */}
          <defs>
            <linearGradient id="chartGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0.05" />
            </linearGradient>
          </defs>
          
          {/* Grid lines */}
          {[0, 1, 2, 3].map(i => (
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
          <path d={linePath} fill="none" stroke="#10b981" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />

          {/* Data points */}
          {points.map((p, i) => (
            <circle
              key={i}
              cx={p.x}
              cy={p.y}
              r="2"
              fill="#10b981"
              stroke="white"
              strokeWidth="1"
            />
          ))}
        </svg>

        {/* Y-axis labels */}
        <div className="absolute left-0 top-0 h-full flex flex-col justify-between text-xs text-gray-400 py-2">
          <span>{formatCurrency(maxAmount)}</span>
          <span>{formatCurrency((maxAmount + minAmount) / 2)}</span>
          <span>{formatCurrency(minAmount)}</span>
        </div>
      </div>

      {/* X-axis labels */}
      <div className="flex justify-between mt-2 px-8">
        {data.map((d, i) => (
          <span key={i} className="text-xs text-gray-400">{d.month}</span>
        ))}
      </div>

      {/* Summary */}
      <div className="mt-6 pt-4 border-t border-gray-100 grid grid-cols-3 gap-4">
        <div>
          <p className="text-xs text-gray-500">Starting Balance</p>
          <p className="text-sm font-semibold text-gray-900">{formatCurrency(firstAmount)}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500">Current Balance</p>
          <p className="text-sm font-semibold text-gray-900">{formatCurrency(lastAmount)}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500">Growth</p>
          <p className={`text-sm font-semibold ${isPositive ? 'text-emerald-600' : 'text-red-600'}`}>
            {isPositive ? '+' : ''}{formatCurrency(lastAmount - firstAmount)}
          </p>
        </div>
      </div>
    </div>
  );
};

export default SavingsChart;
