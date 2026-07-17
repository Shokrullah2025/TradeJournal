import React from "react";
import { Link } from "react-router-dom";
import LegalPageWrapper from "../../components/legal/LegalPageWrapper";

const Disclaimer = () => (
  <LegalPageWrapper
    title="Financial & Risk Disclaimer"
    effectiveDate="June 18, 2026"
    lastUpdated="July 16, 2026"
    slug="disclaimer"
  >
    <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-300 dark:border-amber-700 rounded-lg px-5 py-4 mb-6">
      <p className="font-semibold text-amber-900 dark:text-amber-200 text-lg mb-1">
        IMPORTANT — READ BEFORE USING TRADE JOURNAL PRO
      </p>
      <p className="text-amber-800 dark:text-amber-300">
        ZalorTrade is a trade recordkeeping and analytics tool. It does NOT provide investment advice, financial guidance, trading signals, or recommendations of any kind. All trading decisions are solely your responsibility.
      </p>
    </div>

    <h2>1. Not Investment Advice</h2>
    <p>
      Nothing contained in ZalorTrade, including but not limited to analytics outputs, win rate statistics, profit factor calculations, Sharpe ratio displays, drawdown charts, trade performance summaries, backtesting results, or any other data displayed by the Service, constitutes investment advice, financial advice, trading advice, legal advice, tax advice, or any other type of professional advice.
    </p>
    <p>
      ZalorTrade provides the Service solely as a tool for users to record, organize, and analyze their own historical trading activity. The Service does not generate, suggest, or imply any recommendation to buy, sell, hold, short, or otherwise transact in any security, commodity, cryptocurrency, derivative, forex instrument, or other financial instrument.
    </p>

    <h2>2. Not a Registered Investment Adviser</h2>
    <p>
      ZalorTrade is <strong>not</strong> registered as an investment adviser, broker-dealer, futures commission merchant, commodity trading adviser, or any other regulated financial entity under:
    </p>
    <ul>
      <li>The Investment Advisers Act of 1940 (15 U.S.C. § 80b-1 et seq.);</li>
      <li>The Securities Exchange Act of 1934;</li>
      <li>The Commodity Exchange Act;</li>
      <li>Any applicable state securities law; or</li>
      <li>The financial regulatory laws of any other state or jurisdiction.</li>
    </ul>
    <p>
      No fiduciary relationship, advisory relationship, or client relationship is created by your use of the Service. You are not a "client" of ZalorTrade in any regulatory sense.
    </p>

    <h2>3. Past Performance Does Not Guarantee Future Results</h2>
    <p>
      All analytics, statistics, charts, and performance metrics displayed by the Service are derived exclusively from trade data that you entered. These figures represent your historical trading results under past market conditions. <strong>Past performance is not indicative of, and does not guarantee, future trading results.</strong>
    </p>
    <p>
      Market conditions, liquidity, volatility, economic conditions, and your own trading psychology will differ from one period to the next. Statistics such as win rate, average profit, profit factor, and Sharpe ratio are descriptive of historical activity only and should not be relied upon as predictors of future performance.
    </p>

    <h2>4. Backtesting and Simulation Limitations</h2>
    <p>
      The backtesting feature in ZalorTrade allows you to simulate hypothetical trades on historical market data. <strong>Backtesting results are inherently hypothetical and simulated, not actual trading results.</strong> They are subject to significant limitations, including but not limited to:
    </p>
    <ul>
      <li><strong>Slippage:</strong> In real trading, your order may be filled at a price different from the simulated entry or exit price, particularly in fast-moving or illiquid markets.</li>
      <li><strong>Market impact:</strong> Placing real orders of significant size may move the market in ways not reflected in a backtest.</li>
      <li><strong>Liquidity risk:</strong> Securities, commodities, or contracts that appear liquid in historical data may not be as liquid when you attempt to trade them live.</li>
      <li><strong>Execution delays:</strong> Real-world order execution introduces latency not present in simulations.</li>
      <li><strong>Psychological factors:</strong> Emotions such as fear, greed, and hesitation affect live trading in ways that are absent in backtesting.</li>
      <li><strong>Look-ahead bias:</strong> If not carefully designed, a backtest strategy may inadvertently use information that was not available at the time the simulated trade would have been placed.</li>
      <li><strong>Data quality:</strong> Historical market data sourced from third-party providers (Yahoo Finance, Alpha Vantage, Twelve Data, Binance) may contain errors, gaps, adjusted prices, or other inaccuracies.</li>
      <li><strong>Overfitting:</strong> A strategy optimized on historical data may not generalize to future market conditions.</li>
    </ul>
    <p>
      Backtesting results displayed in ZalorTrade are for <strong>educational and informational purposes only</strong>. They do not represent actual trading results and should not be used to make live trading decisions.
    </p>

    <h2>5. Trading Involves Substantial Risk of Loss</h2>
    <p>
      Trading in securities, futures contracts, foreign exchange (forex), options, contracts for difference (CFDs), and cryptocurrencies involves <strong>substantial risk of financial loss</strong> and is not suitable for all investors or traders. You should carefully consider your financial situation, investment objectives, experience level, and risk tolerance before trading.
    </p>
    <p>
      You may lose some or <strong>all</strong> of the capital you deploy in trading. Leveraged products can result in losses that exceed your initial investment. You should not trade with money you cannot afford to lose.
    </p>
    <p>
      Prop firm trading, algorithmic trading, and high-frequency trading carry additional operational and financial risks not fully reflected in historical analytics.
    </p>

    <h2>6. No Warranty on Data Accuracy</h2>
    <p>
      Market data (prices, OHLC bars, volume) displayed within the backtesting feature is sourced from third-party providers. We make no representation, warranty, or guarantee as to the accuracy, completeness, timeliness, or fitness for any purpose of any market data provided. Data may be delayed, incomplete, or subject to errors. You should independently verify any market data before relying on it for any purpose.
    </p>
    <p>
      Trade data you enter manually is your responsibility. ZalorTrade is not liable for errors in data you enter, import, or sync from a broker integration.
    </p>

    <h2>7. Broker Integration Disclaimer</h2>
    <p>
      Trade data imported from broker integrations (Tradovate, Alpaca, and others) is provided by those brokers' APIs "as is." We do not verify the accuracy, completeness, or timeliness of broker-provided data. Discrepancies between data in ZalorTrade and your official broker account statements may exist. Always rely on your official broker account statements for your definitive trading records.
    </p>

    <h2>8. User Assumes All Responsibility</h2>
    <p>
      By using ZalorTrade, you acknowledge and agree that:
    </p>
    <ul>
      <li>All trading decisions you make are entirely your own and based on your own independent judgment and research;</li>
      <li>You are not relying on the Service or any data displayed by the Service as a basis for any trading or investment decision;</li>
      <li>ZalorTrade is not responsible for any trading losses, missed opportunities, or financial harm you suffer, regardless of whether those losses occur in connection with your use of the Service;</li>
      <li>You will not hold ZalorTrade liable for the outcome of any trade you place.</li>
    </ul>

    <h2>9. Consult a Licensed Professional</h2>
    <p>
      Before making any investment or trading decisions, you should consult a qualified, licensed financial adviser, registered investment adviser, broker-dealer, or other regulated financial professional who can assess your individual financial situation, objectives, and risk tolerance.
    </p>
    <p>
      For tax implications of your trading activity, consult a licensed CPA or tax attorney familiar with trading income, wash-sale rules (26 U.S.C. § 1091), mark-to-market elections (26 U.S.C. § 475), and applicable state tax law.
    </p>

    <h2>10. Regulatory Information</h2>
    <p>
      ZalorTrade is owned and operated by <strong>ZalorTrade LLC</strong>, a Colorado limited liability company, and operates as a software-as-a-service (SaaS) application providing recordkeeping and analytics functionality. It is <strong>not</strong> a broker-dealer, exchange, alternative trading system (ATS), or financial data vendor as defined by the SEC. No securities transactions occur on this platform.
    </p>

    <h2>11. Limitation of Liability</h2>
    <p>
      In no event shall ZalorTrade be liable for any trading losses, investment losses, consequential damages, or indirect damages arising from or in connection with your use of the Service, the analytics it displays, or any decision you make based on data in the Service. Please review the full limitation of liability provisions in our <Link to="/terms">Terms of Service</Link>.
    </p>

    <h2>12. Questions</h2>
    <p>
      If you have questions about this disclaimer, contact us at <strong>noreply@zalortrade.com</strong>. This disclaimer is provided by ZalorTrade LLC, a Colorado limited liability company (United States).
    </p>
  </LegalPageWrapper>
);

export default Disclaimer;
