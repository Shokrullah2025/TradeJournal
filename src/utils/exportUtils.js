import * as XLSX from "xlsx";

export const exportToExcel = (trades, filename = "trade-journal-export") => {
  if (!trades || trades.length === 0) {
    throw new Error("No trades to export");
  }

  // Prepare data for export
  const exportData = trades.map((trade) => ({
    "Trade ID": trade.id,
    Instrument: trade.instrument,
    Strategy: trade.strategy || "",
    Setup: trade.setup || "",
    "Market Condition": trade.marketCondition || "",
    "Trade Type": trade.tradeType,
    "Entry Date": trade.entryDate,
    "Entry Time": trade.entryTime || "",
    "Exit Date": trade.exitDate || "",
    "Exit Time": trade.exitTime || "",
    "Entry Price": trade.entryPrice,
    "Exit Price": trade.exitPrice || "",
    Quantity: trade.quantity,
    "Stop Loss": trade.stopLoss || "",
    "Take Profit": trade.takeProfit || "",
    "P&L": trade.pnl || 0,
    Fees: trade.fees || 0,
    "Risk/Reward": trade.riskReward || "",
    Status: trade.status,
    Tags: Array.isArray(trade.tags) ? trade.tags.join(", ") : "",
    Notes: trade.notes || "",
    "Created At": trade.createdAt || "",
  }));

  // Create workbook
  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.json_to_sheet(exportData);

  // Auto-size columns
  const columnWidths = Object.keys(exportData[0]).map((key) => {
    const maxLength = Math.max(
      key.length,
      ...exportData.map((row) => String(row[key] || "").length)
    );
    return { wch: Math.min(maxLength + 2, 50) };
  });
  worksheet["!cols"] = columnWidths;

  // Add worksheet to workbook
  XLSX.utils.book_append_sheet(workbook, worksheet, "Trades");

  // Generate filename with timestamp
  const timestamp = new Date().toISOString().split("T")[0];
  const finalFilename = `${filename}-${timestamp}.xlsx`;

  // Write file
  XLSX.writeFile(workbook, finalFilename);
};

export const exportAnalyticsReport = async (trades, stats) => {
  if (!trades || trades.length === 0) {
    throw new Error("No data to export");
  }

  const workbook = XLSX.utils.book_new();

  // Summary sheet
  const summaryData = [
    ["Metric", "Value"],
    ["Total Trades", stats.totalTrades],
    ["Win Rate (%)", stats.winRate],
    ["Total P&L ($)", stats.totalPnL],
    ["Average Win ($)", stats.avgWin],
    ["Average Loss ($)", stats.avgLoss],
    ["Profit Factor", stats.profitFactor],
    ["Max Drawdown ($)", stats.maxDrawdown],
    ["Sharpe Ratio", stats.sharpeRatio],
  ];

  const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
  XLSX.utils.book_append_sheet(workbook, summarySheet, "Summary");

  // Strategy analysis
  const strategies = {};
  trades
    .filter((t) => t.status === "closed")
    .forEach((trade) => {
      const strategy = trade.strategy || "No Strategy";
      if (!strategies[strategy]) {
        strategies[strategy] = { trades: 0, wins: 0, totalPnL: 0 };
      }
      strategies[strategy].trades++;
      strategies[strategy].totalPnL += trade.pnl;
      if (trade.pnl > 0) strategies[strategy].wins++;
    });

  const strategyData = [
    ["Strategy", "Total Trades", "Wins", "Win Rate (%)", "Total P&L ($)"],
  ];

  Object.entries(strategies).forEach(([strategy, data]) => {
    strategyData.push([
      strategy,
      data.trades,
      data.wins,
      ((data.wins / data.trades) * 100).toFixed(2),
      data.totalPnL.toFixed(2),
    ]);
  });

  const strategySheet = XLSX.utils.aoa_to_sheet(strategyData);
  XLSX.utils.book_append_sheet(workbook, strategySheet, "Strategy Analysis");

  // Instrument analysis
  const instruments = {};
  trades
    .filter((t) => t.status === "closed")
    .forEach((trade) => {
      if (!instruments[trade.instrument]) {
        instruments[trade.instrument] = { trades: 0, wins: 0, totalPnL: 0 };
      }
      instruments[trade.instrument].trades++;
      instruments[trade.instrument].totalPnL += trade.pnl;
      if (trade.pnl > 0) instruments[trade.instrument].wins++;
    });

  const instrumentData = [
    ["Instrument", "Total Trades", "Wins", "Win Rate (%)", "Total P&L ($)"],
  ];

  Object.entries(instruments).forEach(([instrument, data]) => {
    instrumentData.push([
      instrument,
      data.trades,
      data.wins,
      ((data.wins / data.trades) * 100).toFixed(2),
      data.totalPnL.toFixed(2),
    ]);
  });

  const instrumentSheet = XLSX.utils.aoa_to_sheet(instrumentData);
  XLSX.utils.book_append_sheet(
    workbook,
    instrumentSheet,
    "Instrument Analysis"
  );

  // Generate filename with timestamp
  const timestamp = new Date().toISOString().split("T")[0];
  const filename = `analytics-report-${timestamp}.xlsx`;

  // Write file
  XLSX.writeFile(workbook, filename);
};

export const importFromFile = async (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: "array" });

        // Get first worksheet
        const worksheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[worksheetName];

        // Convert to JSON
        const jsonData = XLSX.utils.sheet_to_json(worksheet);

        if (jsonData.length === 0) {
          throw new Error("No data found in file");
        }

        // Validate and transform data
        const trades = jsonData.map((row, index) => {
          // Map common column variations
          const getColumnValue = (variations) => {
            for (const variation of variations) {
              if (row[variation] !== undefined) {
                return row[variation];
              }
            }
            return "";
          };

          const instrument = getColumnValue([
            "Instrument",
            "Symbol",
            "instrument",
            "symbol",
          ]);
          const entryPrice = parseFloat(
            getColumnValue([
              "Entry Price",
              "EntryPrice",
              "entry_price",
              "entryPrice",
            ])
          );
          const quantity = parseInt(
            getColumnValue(["Quantity", "Qty", "quantity", "qty"])
          );
          const entryDate = getColumnValue([
            "Entry Date",
            "EntryDate",
            "entry_date",
            "entryDate",
            "Date",
            "date",
          ]);

          if (!instrument || !entryPrice || !quantity || !entryDate) {
            throw new Error(
              `Invalid data in row ${
                index + 1
              }. Required fields: Instrument, Entry Price, Quantity, Entry Date`
            );
          }

          return {
            id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
            instrument,
            tradeType:
              getColumnValue(["Trade Type", "TradeType", "Type", "type"]) ||
              "long",
            strategy: getColumnValue(["Strategy", "strategy"]) || "",
            entryDate: new Date(entryDate).toISOString().split("T")[0],
            entryTime:
              getColumnValue(["Entry Time", "EntryTime", "entry_time"]) || "",
            entryPrice,
            quantity,
            exitDate:
              getColumnValue(["Exit Date", "ExitDate", "exit_date"]) || "",
            exitTime:
              getColumnValue(["Exit Time", "ExitTime", "exit_time"]) || "",
            exitPrice:
              parseFloat(
                getColumnValue(["Exit Price", "ExitPrice", "exit_price"])
              ) || null,
            stopLoss:
              parseFloat(
                getColumnValue(["Stop Loss", "StopLoss", "stop_loss"])
              ) || null,
            takeProfit:
              parseFloat(
                getColumnValue(["Take Profit", "TakeProfit", "take_profit"])
              ) || null,
            fees:
              parseFloat(
                getColumnValue(["Fees", "Commission", "fees", "commission"])
              ) || 0,
            status: getColumnValue(["Status", "status"]) || "open",
            notes:
              getColumnValue(["Notes", "notes", "Comments", "comments"]) || "",
            tags: [],
            createdAt: new Date().toISOString(),
          };
        });

        // Save to localStorage (this would be handled by the context in a real app)
        const existingTrades = JSON.parse(
          localStorage.getItem("tradeJournalTrades") || "[]"
        );
        localStorage.setItem(
          "tradeJournalTrades",
          JSON.stringify([...existingTrades, ...trades])
        );

        resolve(trades);
      } catch (error) {
        reject(new Error(`Failed to import file: ${error.message}`));
      }
    };

    reader.onerror = () => {
      reject(new Error("Failed to read file"));
    };

    reader.readAsArrayBuffer(file);
  });
};
