import React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

const InstrumentAnalysis = ({ trades, detailed = false }) => {
  const analyzeInstruments = () => {
    const completedTrades = trades.filter((trade) => trade.status === "closed");
    const instrumentStats = {};

    completedTrades.forEach((trade) => {
      const instrument = trade.instrument;

      if (!instrumentStats[instrument]) {
        instrumentStats[instrument] = {
          name: instrument,
          totalTrades: 0,
          wins: 0,
          losses: 0,
          totalPnL: 0,
          winRate: 0,
          avgWin: 0,
          avgLoss: 0,
          profitFactor: 0,
          totalVolume: 0,
        };
      }

      const stats = instrumentStats[instrument];
      stats.totalTrades++;
      stats.totalPnL += trade.pnl;
      stats.totalVolume += trade.quantity * trade.entryPrice;

      if (trade.pnl > 0) {
        stats.wins++;
      } else if (trade.pnl < 0) {
        stats.losses++;
      }
    });

    // Calculate derived metrics
    Object.values(instrumentStats).forEach((stats) => {
      stats.winRate =
        stats.totalTrades > 0 ? (stats.wins / stats.totalTrades) * 100 : 0;

      const winningTrades = completedTrades.filter(
        (t) => t.instrument === stats.name && t.pnl > 0
      );
      const losingTrades = completedTrades.filter(
        (t) => t.instrument === stats.name && t.pnl < 0
      );

      stats.avgWin =
        winningTrades.length > 0
          ? winningTrades.reduce((sum, t) => sum + t.pnl, 0) /
            winningTrades.length
          : 0;

      stats.avgLoss =
        losingTrades.length > 0
          ? Math.abs(
              losingTrades.reduce((sum, t) => sum + t.pnl, 0) /
                losingTrades.length
            )
          : 0;

      stats.profitFactor =
        stats.avgLoss > 0 && stats.losses > 0
          ? (stats.avgWin * stats.wins) / (stats.avgLoss * stats.losses)
          : stats.wins > 0
          ? 999
          : 0;
    });

    return Object.values(instrumentStats).sort(
      (a, b) => b.totalPnL - a.totalPnL
    );
  };

  const getInstrumentCategories = () => {
    const instruments = analyzeInstruments();
    const categories = {
      Stocks: instruments.filter(
        (i) =>
          /^[A-Z]{1,5}$/.test(i.name) && !["SPY", "QQQ", "IWM"].includes(i.name)
      ),
      ETFs: instruments.filter((i) =>
        ["SPY", "QQQ", "IWM", "XLF", "XLE", "GLD", "TLT"].includes(i.name)
      ),
      Forex: instruments.filter(
        (i) =>
          i.name.includes("USD") ||
          i.name.includes("EUR") ||
          i.name.includes("GBP")
      ),
      Crypto: instruments.filter(
        (i) =>
          i.name.includes("BTC") ||
          i.name.includes("ETH") ||
          i.name.includes("CRYPTO")
      ),
      Futures: instruments.filter(
        (i) =>
          i.name.includes("/") || ["ES", "NQ", "YM", "RTY"].includes(i.name)
      ),
    };

    return Object.entries(categories)
      .filter(([_, instruments]) => instruments.length > 0)
      .map(([category, instruments]) => ({
        category,
        totalTrades: instruments.reduce((sum, i) => sum + i.totalTrades, 0),
        totalPnL: instruments.reduce((sum, i) => sum + i.totalPnL, 0),
        winRate:
          instruments.reduce((sum, i) => sum + i.winRate * i.totalTrades, 0) /
          instruments.reduce((sum, i) => sum + i.totalTrades, 0),
        instruments: instruments.length,
      }));
  };

  const instrumentData = analyzeInstruments();
  const categoryData = getInstrumentCategories();

  const COLORS = [
    "#0ea5e9",
    "#22c55e",
    "#f59e0b",
    "#ef4444",
    "#8b5cf6",
    "#06b6d4",
    "#84cc16",
    "#f97316",
  ];

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-medium text-gray-900 mb-2">{label}</p>
          <div className="space-y-1">
            <p className="text-sm text-gray-600">
              Total P&L:
              <span
                className={`ml-1 font-semibold ${
                  data.totalPnL >= 0 ? "text-success-600" : "text-danger-600"
                }`}
              >
                ${data.totalPnL.toLocaleString()}
              </span>
            </p>
            <p className="text-sm text-gray-600">
              Win Rate:
              <span className="ml-1 font-semibold">
                {data.winRate.toFixed(1)}%
              </span>
            </p>
            <p className="text-sm text-gray-600">
              Total Trades:
              <span className="ml-1 font-semibold">{data.totalTrades}</span>
            </p>
            <p className="text-sm text-gray-600">
              Profit Factor:
              <span className="ml-1 font-semibold">
                {data.profitFactor.toFixed(2)}
              </span>
            </p>
          </div>
        </div>
      );
    }
    return null;
  };

  const PieTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-medium text-gray-900">{data.name}</p>
          <p className="text-sm text-gray-600">
            {data.totalTrades} trades (
            {(
              (data.totalTrades /
                instrumentData.reduce((sum, i) => sum + i.totalTrades, 0)) *
              100
            ).toFixed(1)}
            %)
          </p>
        </div>
      );
    }
    return null;
  };

  if (instrumentData.length === 0) {
    return (
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Instrument Analysis
        </h3>
        <div className="text-center py-8">
          <p className="text-gray-500">No instrument data available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 mb-6">
          Instrument Performance
        </h3>

        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={instrumentData.slice(0, 10)}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis
                dataKey="name"
                stroke="#666"
                fontSize={12}
                axisLine={false}
                tickLine={false}
                angle={-45}
                textAnchor="end"
                height={60}
              />
              <YAxis
                stroke="#666"
                fontSize={12}
                axisLine={false}
                tickLine={false}
                tickFormatter={(value) => `$${value.toLocaleString()}`}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="totalPnL" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {detailed && (
        <>
          {/* Category Analysis */}
          {categoryData.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="card">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  By Asset Category
                </h3>
                <div className="space-y-3">
                  {categoryData.map((category, index) => (
                    <div
                      key={category.category}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <div className="flex items-center space-x-3">
                        <div
                          className={`w-3 h-3 rounded-full`}
                          style={{
                            backgroundColor: COLORS[index % COLORS.length],
                          }}
                        ></div>
                        <div>
                          <div className="font-medium text-gray-900">
                            {category.category}
                          </div>
                          <div className="text-sm text-gray-500">
                            {category.instruments} instruments •{" "}
                            {category.totalTrades} trades
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div
                          className={`font-semibold ${
                            category.totalPnL >= 0
                              ? "text-success-600"
                              : "text-danger-600"
                          }`}
                        >
                          {category.totalPnL >= 0 ? "+" : ""}$
                          {category.totalPnL.toLocaleString()}
                        </div>
                        <div className="text-sm text-gray-500">
                          {category.winRate.toFixed(1)}% win rate
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="card">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Trade Distribution
                </h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={instrumentData.slice(0, 8)}
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="totalTrades"
                        label={({ name, percent }) =>
                          `${name} ${(percent * 100).toFixed(0)}%`
                        }
                      >
                        {instrumentData.slice(0, 8).map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={COLORS[index % COLORS.length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip content={<PieTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}

          {/* Top Performers */}
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Top & Bottom Performers
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <h4 className="font-medium text-gray-900 mb-3">
                  Most Profitable
                </h4>
                <div className="space-y-2">
                  {instrumentData
                    .filter((i) => i.totalPnL > 0)
                    .sort((a, b) => b.totalPnL - a.totalPnL)
                    .slice(0, 5)
                    .map((instrument, index) => (
                      <div
                        key={instrument.name}
                        className="flex items-center justify-between p-2 bg-success-50 rounded"
                      >
                        <span className="text-sm font-medium text-success-700">
                          #{index + 1} {instrument.name}
                        </span>
                        <div className="text-right">
                          <div className="text-sm font-semibold text-success-800">
                            ${instrument.totalPnL.toLocaleString()}
                          </div>
                          <div className="text-xs text-success-600">
                            {instrument.totalTrades} trades,{" "}
                            {instrument.winRate.toFixed(1)}% win
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              </div>

              <div>
                <h4 className="font-medium text-gray-900 mb-3">
                  Least Profitable
                </h4>
                <div className="space-y-2">
                  {instrumentData
                    .filter((i) => i.totalPnL < 0)
                    .sort((a, b) => a.totalPnL - b.totalPnL)
                    .slice(0, 5)
                    .map((instrument, index) => (
                      <div
                        key={instrument.name}
                        className="flex items-center justify-between p-2 bg-danger-50 rounded"
                      >
                        <span className="text-sm font-medium text-danger-700">
                          #{index + 1} {instrument.name}
                        </span>
                        <div className="text-right">
                          <div className="text-sm font-semibold text-danger-800">
                            ${instrument.totalPnL.toLocaleString()}
                          </div>
                          <div className="text-xs text-danger-600">
                            {instrument.totalTrades} trades,{" "}
                            {instrument.winRate.toFixed(1)}% win
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          </div>

          {/* Detailed Table */}
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Detailed Instrument Metrics
            </h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Instrument
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Trades
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Win Rate
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total P&L
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Avg Win
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Avg Loss
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Profit Factor
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Volume
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {instrumentData.map((instrument) => (
                    <tr key={instrument.name} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {instrument.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {instrument.totalTrades}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {instrument.winRate.toFixed(1)}%
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <span
                          className={
                            instrument.totalPnL >= 0
                              ? "text-success-600"
                              : "text-danger-600"
                          }
                        >
                          {instrument.totalPnL >= 0 ? "+" : ""}$
                          {instrument.totalPnL.toLocaleString()}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-success-600">
                        ${instrument.avgWin.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-danger-600">
                        ${instrument.avgLoss.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {instrument.profitFactor.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        ${instrument.totalVolume.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default InstrumentAnalysis;
