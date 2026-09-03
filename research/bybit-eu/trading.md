---
title: "Bybit EU Knowledge Base: Trading Products & Features"
summary: "Comprehensive guide to Bybit EU (bybit.eu) trading products, including Spot trading, One-Click Buy, DCA bots, Convert, Recurring Buy, product availability under MiCA regulation, fee schedules, and interface tools."
---

# Bybit EU Trading Products & Features Knowledge Base

This knowledge base serves as a technical and procedural reference for customer support AI copilots assisting users on **Bybit EU** (`bybit.eu`). Bybit EU is the dedicated, MiCAR-compliant EEA platform operated by Bybit EU GmbH (headquartered in Vienna, Austria).

---

## 1. Spot Trading

### Overview & Core Mechanics
Spot trading on Bybit EU involves the direct purchase or sale of crypto-assets (crypto-to-crypto pairs like `BTC/USDC` or fiat-to-crypto pairs like `USDC/EUR`) at the current market price with immediate delivery into the user's Unified Trading Account (UTA) or Funding Account.

### Available Order Types

#### 1. Basic Order Types
*   **Market Order**: Executes immediately at the best available price in the order book.
    *   *Parameters*: Order Quantity (or Order Value).
    *   *Execution Logic*: Fills against existing liquidity in the order book.
    *   *Fee Category*: Taker fee.
    *   *Slippage Risk*: In volatile or low-liquidity pairs, final execution price may deviate from the displayed price when placed.
    *   *Order Caps*: Maximum market order size limits apply per coin (e.g., maximum 0.5 BTC for single market orders).
*   **Limit Order**: Executes at a specified target price or better.
    *   *Parameters*: Order Quantity, Order Price.
    *   *Execution Logic*: Enters the order book if price is not immediately marketable.
    *   *Maker vs. Taker Outcome*:
        *   If Buy Limit Price < Best Ask (or Sell Limit Price > Best Bid): Enters order book as a **Maker** order (earns Maker fee rate).
        *   If Buy Limit Price ≥ Best Ask (or Sell Limit Price ≤ Best Bid): Executes immediately as a **Taker** order (charged Taker fee rate).
*   **Conditional Order**: Automated orders that trigger only when a reference price reaches a preset **Trigger Price**.
    *   *Trigger Basis Options*: Last Traded Price (LTP), Mark Price, or Index Price.
    *   *Types*:
        *   *Conditional Market Order*: Triggers an immediate Market Order once triggered.
        *   *Conditional Limit Order*: Triggers a Limit Order placed at the preset Order Price once triggered.
    *   *Common Applications*: Stop-Entry orders (trading breakouts), Stop-Loss (SL), and Take-Profit (TP).

#### 2. Advanced Order Types & Options
*   **Take Profit (TP) & Stop Loss (SL)**: Built-in exit instructions attached to Spot orders or positions. Can be preset during order placement or added to existing open orders.
*   **Post-Only Order**: A Limit Order instruction ensuring the order is added strictly as a Maker order. If the system detects the order would execute immediately as a Taker, the order is **automatically canceled** instead of filled.
*   **Iceberg Order**: An automated execution strategy for large volume orders that splits the total order into smaller visible sub-orders. Conceals full order volume to minimize market impact and slippage.
*   **Time in Force (TIF) Instructions**:
    *   **GTC (Good 'Til Canceled)**: Order remains active until fully executed or manually canceled. (Default setting).
    *   **IOC (Immediate or Cancel)**: Order must be executed immediately; any unfilled portion is instantly canceled.
    *   **FOK (Fill or Kill)**: Order must be executed entirely and immediately, otherwise the entire order is canceled.
*   **TWAP (Time-Weighted Average Price)**: Automatically executes an order in smaller slices at regular time intervals over a specified period.

### Order Book Mechanics
*   **Bids (Buy Orders)**: Displayed in green, sorted from highest price to lowest price.
*   **Asks (Sell Orders)**: Displayed in red, sorted from lowest price to highest price.
*   **Spread**: The price difference between the lowest Ask price and highest Bid price.
*   **Order Book Aggregation**: Users can adjust order book decimal precision (e.g., 0.01, 0.1, 1) to view depth aggregation.

### Step-by-Step Procedure: Placing a Spot Order
1.  Navigate to **Trade** → **Spot Trading** on Bybit EU.
2.  Select the desired trading pair from the top left market selector (e.g., `BTC/EUR` or `ETH/USDC`).
3.  In the order entry panel on the right side, select **Buy** or **Sell**.
4.  Choose the order type: **Market**, **Limit**, or **Conditional**.
5.  Enter the required parameters:
    *   For Market: Enter Order Value or Quantity (or use slider).
    *   For Limit: Enter Order Price and Order Quantity.
    *   For Conditional: Set Trigger Price, Trigger Basis, and Order Price/Value.
6.  (Optional) Check **TP/SL** or advanced options (**Post-Only**, **IOC/FOK**, **Iceberg**).
7.  Click **Buy [Asset]** or **Sell [Asset]** and confirm the order details in the pop-up modal.

### Common Customer Issues
*   **Limit Order Executed Immediately as Taker**: Occurs when a Buy Limit price is set at/above current ask or Sell Limit price at/below current bid. The user is charged the Taker fee.
*   **Post-Only Order Instantly Canceled**: The order price crossed current liquidity. Post-Only prevents Taker fees; cancelation is expected behavior.
*   **Conditional Order Triggered But Not Executed**: Usually caused by insufficient account balance at the moment of trigger, or extreme market volatility pushing price beyond the specified Limit Price before placement.
*   **Order Below Minimum Value**: Orders failing minimum threshold (e.g., minimum order value required by Bybit Spot Rules, typically equivalent to 1 EUR / 1 USDC).

**Source URLs**:
- https://www.bybit.eu/en-EU/help-center/article/Types-of-Orders-Available-on-Bybit
- https://www.bybit.eu/en-EU/help-center/article/How-to-Get-Started-with-Spot-Trading
- https://www.bybit.eu/en-EU/help-center/article/Bybit-Spot-Trading-Rules
- https://www.bybit.eu/en-EU/help-center/article/FAQ-Spot-Trading

---

## 2. One-Click Buy

### Overview
One-Click Buy is Bybit EU's express fiat-to-crypto gateway allowing users to instantly purchase or sell crypto using local European fiat currencies, bank cards, SEPA bank transfers, and local e-wallets without using an order book.

### Supported Payment Channels & Fee Structures

| Payment Method | Supported Currencies | Processing Fee | Notes / Regional Restrictions |
| :--- | :--- | :--- | :--- |
| **iDEAL** | EUR | **0%** | Netherlands primary payment method |
| **BLIK** | PLN | 0.9% + 0.5 PLN | Unsupported in Germany, France, Portugal, Netherlands |
| **ZEN.com** | EUR, PLN, CHF, HUF, CZK | 0.92% | Unsupported in Germany, Netherlands |
| **PayPal** | EUR, CHF, HUF, CZK, SEK, DKK, NOK | Buy: 1.75% – 2.5%<br>Sell: 1.60% (Capped) | Fee & cap vary by currency (e.g., EUR cap €10) |
| **Trustly / Easy Bank** | EUR, DKK, SEK | Flat fee (e.g., €1.32, 10 DKK, 14.5 SEK) | Direct bank transfer |
| **Bank Card (Visa/Mastercard)** | EUR, CHF, PLN, CZK, etc. | Channel fee applies (displayed at checkout) | Card must support 3D Secure |
| **SEPA / SEPA Instant** | EUR | 0% deposit / fixed fee | Direct deposit to Funding Account |

*Note: In addition to processing channel fees, exchange rates provided in One-Click Buy contain a minor price spread lock.*

### Supported Assets & Fiat
*   **Fiat Currencies**: EUR, PLN, CHF, HUF, CZK, SEK, DKK, NOK.
*   **Crypto Assets**: BTC, ETH, USDT, USDC, EURC, SOL, XRP, and major altcoins.

### User Transaction Limits (By Verification Level)

| VIP Level | Standard Individual KYC | Advanced Individual KYC |
| :--- | :--- | :--- |
| **VIP 0** | Per Order: ≤ €250,000<br>Daily: ≤ €500,000<br>Weekly: ≤ €2,500,000<br>Monthly: ≤ €8,000,000 | Per Order: ≤ €300,000<br>Daily: ≤ €600,000<br>Weekly: ≤ €3,000,000<br>Monthly: ≤ €10,000,000 |
| **VIP 1 – VIP 5** | Scaled higher up to €2,000,000 / order | Scaled higher up to €4,000,000 / order |

### Step-by-Step Procedure: One-Click Buy
#### Buying Crypto:
1.  Click **Buy Crypto** → **One-Click Buy** on the top menu.
2.  Select **Buy** tab. Choose the fiat currency to pay and the cryptocurrency to receive.
3.  Enter the fiat purchase amount or crypto target quantity.
4.  Select the preferred payment method (Card, SEPA, iDEAL, BLIK, ZEN, PayPal, etc.).
5.  Review the price quote and fee breakdown on the order summary screen.
6.  Click **Confirm** / **Buy with EUR**. Complete the security/gateway verification (e.g., 3D Secure / bank app authorization).
7.  Upon confirmation, assets are credited directly to the user's **Funding Account**.

#### Selling Crypto:
1.  Click **Buy Crypto** → **One-Click Buy** → Select **Sell** tab.
2.  Select the crypto asset to sell and fiat currency / e-wallet destination.
3.  Enter amount, review quote, confirm payout destination, and click **Sell**.

### Common Customer Issues
*   **Third-Party Payment Rejection**: Bybit EU strictly enforces that the bank account or card holder name **must match 100% with the verified KYC identity** on the Bybit EU account. Third-party deposits are rejected and refunded.
*   **Missing Payment Method**: If a previously available option (e.g., BLIK or ZEN) disappears, the payment provider has restricted access in that region or undergone temporary maintenance.
*   **Payment Deducted But Crypto Not Received**: Card and instant e-wallet purchases execute within minutes. If delayed up to 2 business days (SEPA), check if risk verification email was sent or submit a ticket with payment receipt.
*   **Subaccount Incompatibility**: One-Click Buy is **not supported on subaccounts**; operations must be conducted via the Main Account.

**Source URLs**:
- https://www.bybit.eu/en-EU/help-center/article/How-to-Buy-Coins-With-One-Click-Buy
- https://www.bybit.eu/en-EU/help-center/article/FAQ-One-Click-Buy
- https://www.bybit.eu/en-EU/help-center/article/How-to-Sell-Coins-With-One-Click-Buy
- https://www.bybit.eu/en-EU/help-center/article/How-to-Buy-Coins-With-Fiat-Balance

---

## 3. DCA Trading (Dollar-Cost Averaging Bots)

### Overview
Bybit EU's Dollar-Cost Averaging (DCA) bot is an automated trading tool designed to execute recurring purchases of selected crypto-assets at predefined regular time intervals and fixed amounts. DCA mitigates short-term market volatility risk by averaging entry costs over time.

### Technical Parameters & Specifications
*   **Supported Quote Currency**: **USDC only** (all DCA bot orders on Bybit EU are quoted and settled in USDC).
*   **Supported Target Assets**: Multi-asset portfolio supported (select between 1 and **up to 5 coins** per bot, e.g., BTC, ETH, SOL).
*   **Investment Frequency Intervals**:
    *   *Minutes*: 10 minutes
    *   *Hours*: 1 hour, 4 hours, 8 hours, 12 hours
    *   *Days*: 1 day
    *   *Weeks*: 1 week, 2 weeks, 4 weeks
*   **Max. Investment Amount (Optional)**: Upper spending cap. If remaining capacity `[Max Investment - Total Spent]` is less than a single cycle investment, the bot auto-terminates.
*   **Rewards Service (Optional Toggle)**: Automatically subscribes acquired crypto-assets into Flexible Term Earn yield generation daily. *(Regulatory Notice: Rewards Service is an unregulated Bybit Earn product under MiCAR; legal ownership transfers to Bybit EU GmbH during subscription)*.
*   **Concurrent Bot Limit**: Users can run up to **50 trading bots** simultaneously (combined total across DCA and Spot Grid bots).

### Step-by-Step Procedure: Creating and Stopping a DCA Bot

#### Creating a DCA Plan:
1.  Navigate to **Tools** → **Trading Bot** → **DCA Bot**.
2.  Ensure sufficient **USDC** is present in your **Funding Account**.
3.  Select 1 to 5 target coins (e.g., BTC and ETH).
4.  Set the **Fixed Investment Amount** for each selected coin.
5.  Select the **Investment Frequency** interval (e.g., 1 week).
6.  (Optional) Define **Max. Investment Amount** and toggle **Rewards Service**.
7.  Click **Create Now** and review parameters in the confirmation modal.
8.  Funds are automatically transferred from Funding Account to Bot Account upon each scheduled purchase.

#### Stopping / Terminating a DCA Plan:
1.  Go to **Tools** → **Trading Bot** → **My Bots**.
2.  Locate the running DCA bot and click **Details** or **Close**.
3.  Select settlement preference:
    *   *Settle with Held Coins*: Crypto-assets accumulated in the Bot Account are transferred directly to your Funding Account without trading.
    *   *Settle in USDC*: Held assets are immediately sold at Spot market price and total USDC proceeds are credited to your Funding Account.
4.  Confirm termination.

### Fee Structure
*   **Bot Creation Fee**: **0 EUR** (Free to create and run).
*   **Trading Fees**: Standard Bybit EU Spot trading fees apply to each executed purchase order within the DCA cycle.

### Common Customer Issues
*   **DCA Bot Suspended Due to Insufficient Funds**: If Funding Account USDC balance is lower than the required cycle amount, the auto-purchase fails. An email/push notification is sent. **Suspension does NOT auto-terminate the bot**. Once topped up, the bot auto-resumes at the next scheduled cycle.
*   **Unintended Bot Auto-Termination**: Caused when the `Max. Investment Amount` parameter was set and remaining unused allocation fell below 1 full investment order.
*   **Inability to Modify Coins**: Selected target coins **cannot be altered** once a DCA bot is active. Users must terminate the existing bot and launch a new one to change target coins. (Investment amount and frequency *can* be modified while running).

**Source URLs**:
- https://www.bybit.eu/en-EU/help-center/article/Introduction-to-DCA-Bots
- https://www.bybit.eu/en-EU/help-center/article/FAQ-DCA-Bot
- https://www.bybit.eu/en-EU/help-center/article/How-to-Get-Started-with-DCA-Trading-on-Bybit
- https://www.bybit.eu/en-EU/help-center/article/Difference-between-Bybit-Trading-Bot

---

## 4. Convert Functionality

### Overview
Bybit EU Convert provides zero-slippage, instant conversion between cryptocurrencies and fiat assets directly within the Funding Account or Unified Trading Account without interacting with an order book.

### Execution Modes
1.  **Instant Mode**: Immediate swap at real-time quote price.
    *   *Rate Lock Window*: **15-second quote timer**. Users must confirm before expiration.
    *   *Trading Fee*: **0% fee** on standard convert.
2.  **Limit Mode**: Allows setting a target conversion price. Order executes automatically when market quote meets specified limit price.

### Convert Small Account Balance (Dust Conversion)
Allows consolidating low-value balances ("dust") into **MNT**, **USDT**, or **EUR**.
*   **Eligibility Threshold**: Assets with an individual value **< 200 USDC equivalent**.
*   **Conversion Fee**: **2% conversion fee** applies to dust conversions.
*   **Frequency Limit**: Can be executed **once every 6 hours**.
*   **Exclusions**: Delisted coins, suspended assets, and unverified accounts cannot be converted.

### Step-by-Step Procedure: Converting Assets
1.  Click **Buy Crypto** → **Convert** (or access via **Assets** → **Funding Account** → **Convert**).
2.  Select **Instant** or **Limit** mode.
3.  Choose the paying asset ("From") and target asset ("To").
4.  Enter the conversion amount or click **All**.
5.  Click **Get Quote**.
6.  Review quote exchange rate (15s countdown timer) and click **Convert**.

### Common Customer Issues
*   **Quote Expiration**: If the 15-second timer runs out, the user must click "Refresh" to fetch an updated quote.
*   **Dust Conversion Rejection**: Occurs if asset value exceeds 200 USDC equivalent, if less than 6 hours have elapsed since the last dust conversion, or if the token is delisted/suspended.

**Source URLs**:
- https://www.bybit.eu/en-EU/help-center/article/How-to-convert-your-assets
- https://www.bybit.eu/en-EU/help-center/article/How-to-Convert-Small-Account-Balance
- https://www.bybit.eu/en-EU/help-center/article/Assets-List-for-Bybit-Convert

---

## 5. Recurring Buy / Auto-Invest Features

### Overview
Recurring Buy automates crypto purchases using **Fiat balances** (EUR, PLN, CHF, etc.) or direct bank/card payments on a scheduled basis, functioning separately from USDC-denominated DCA bots.

### Key Features & Parameters
*   **Source Funds**: Fiat balance in Funding Account or linked bank/card channels.
*   **Supported Frequencies**: Daily, Weekly, Bi-weekly, Monthly.
*   **Monthly Date Safeguard**: For monthly subscriptions, date selection is restricted strictly to **days 1 through 28** of each month (to guarantee execution consistency across February and shorter months).
*   **Max Active Plans**: Up to **20 Recurring Buy plans** per user.
*   **Quote Determination**: Purchases execute at real-time market rates at the execution timestamp. Standard Fiat Spot/One-Click Buy fees apply.

### Auto-Termination Logic
If a scheduled deduction fails due to insufficient fiat balance or payment authorization rejection:
1.  The system skips that order attempt and retries on the next scheduled date.
2.  After **three (3) consecutive failed attempts**, the Recurring Buy plan is **automatically terminated**.

### Step-by-Step Procedure: Managing Recurring Buy
#### Creating a Plan:
1.  Go to **Buy Crypto** → **Recurring Buy**.
2.  Select the fiat payment currency and crypto to purchase.
3.  Enter amount per purchase and select frequency (Daily, Weekly, Bi-weekly, Monthly 1–28).
4.  Confirm payment source and create plan.

#### Canceling a Plan:
1.  Go to **Orders** → **Fiat Order** → **Recurring Buy Plan**.
2.  Click **Details** on the target plan and select **Cancel Plan**. *(Note: Individual scheduled orders cannot be individually skipped/canceled; the full plan must be canceled or left active)*.

### Common Customer Issues
*   **Plan Auto-Canceled**: Occurs automatically after 3 consecutive failed funding attempts. User must top up fiat and create a new plan.
*   **Inability to Edit Parameters**: Active Recurring Buy plan parameters (amount, frequency) **cannot be edited**. The plan must be terminated and recreated.

**Source URLs**:
- https://www.bybit.eu/en-EU/help-center/article/FAQ-Auto-Invest
- https://www.bybit.eu/en-EU/help-center/article/How-to-Get-Started-with-Auto-Invest
- https://www.bybit.eu/en-EU/help-center/article/Introduction-to-Auto-Invest

---

## 6. Product Availability: Bybit EU vs. Global Bybit.com

### Regulatory Framework (MiCAR Compliance)
Bybit EU (`bybit.eu`) is operated by Bybit EU GmbH, a MiCAR-compliant entity headquartered in Vienna, Austria. To adhere strictly to European Union crypto-asset regulations (MiCAR), Bybit EU enforces specific product restrictions that distinguish it from global `bybit.com`.

### Restricted / Unavailable Products on Bybit EU

| Feature / Product | Global Bybit.com | Bybit EU (`bybit.eu`) | Regulatory Reason / Status |
| :--- | :--- | :--- | :--- |
| **Derivatives (Perpetual Futures)** | Available | **RESTRICTED / UNAVAILABLE** | High-risk derivative restrictions under EU investor protection rules. |
| **Options Trading** | Available | **RESTRICTED / UNAVAILABLE** | MiCA compliance restrictions for retail EEA users. |
| **High Leverage (50x–100x)** | Available | **UNAVAILABLE** | Maximum leverage capped strictly on spot margin where permitted. |
| **Peer-to-Peer (P2P) Trading** | Available | **REPLACED / UNAVAILABLE** | Replaced by licensed local payment partners (SEPA, iDEAL, BLIK, ZEN) for AML compliance. |
| **Leveraged Tokens** | Available | **UNAVAILABLE** | High-risk speculative instrument restriction. |
| **Derivatives Copy Trading** | Available | **UNAVAILABLE** | Global copy trading relies on perps; unavailable on Bybit EU. |
| **Regulated Earn / Staking** | Standard Custody | **DISCLAIMER REQUIRED** | Bybit Earn/Rewards transfers legal title to Bybit EU GmbH; non-MiCAR custody product. |

### Migration & Scope
EEA residents migrating from `bybit.com` to `bybit.eu` operate under an independent EEA entity. Open positions in derivative products on global Bybit must be closed prior to migration.

### Common Customer Issues
*   **"Where are Futures/Perpetuals?"**: Customers migrating from global Bybit often ask why Futures contracts are missing. Agents must explain that derivative products are not offered on Bybit EU due to EU regulatory compliance.
*   **"Why is P2P not working?"**: P2P has been replaced with regulated One-Click Buy gateways (iDEAL, SEPA, BLIK, ZEN, Credit Card).

**Source URLs**:
- https://www.bybit.eu/en-EU/help-center/article/Bybit-Spot-Fees-Explained
- https://www.bybit.com/en/learn/regulations/bybit-europe-eu-and-micar

---

## 7. Trading Fees and Tiers on Bybit EU

### Tier Determination Logic
VIP levels on Bybit EU are calculated daily at **07:00 UTC** based on either:
1.  **30-Day Spot Trading Volume (EUR equivalent)** OR
2.  **Total Asset Balance (EUR equivalent)** across all accounts.

Meeting **either** criteria upgrades the user to that VIP tier. Subaccounts share the main account's VIP rate.

### Spot Fee Schedule Table

| VIP Level | Asset Balance (EUR) | 30-Day Vol (EUR) | Crypto Pairs (Taker / Maker) | Fiat Pairs (Taker / Maker) |
| :--- | :--- | :--- | :--- | :--- |
| **VIP 0** | < €100,000 | < €1,000,000 | **0.2500% / 0.1000%** | **0.2500% / 0.1500%** |
| **VIP 1** | ≥ €100,000 | ≥ €1,000,000 | **0.1000% / 0.0675%** | **0.1200% / 0.0675%** |
| **VIP 2** | ≥ €250,000 | ≥ €5,000,000 | **0.0775% / 0.0650%** | **0.0775% / 0.0650%** |
| **VIP 3** | ≥ €500,000 | ≥ €10,000,000 | **0.0750% / 0.0625%** | **0.0750% / 0.0625%** |
| **VIP 4** | ≥ €1,000,000 | ≥ €25,000,000 | **0.0600% / 0.0500%** | **0.0600% / 0.0500%** |
| **VIP 5** | ≥ €2,000,000 | ≥ €50,000,000 | **0.0500% / 0.0400%** | **0.0500% / 0.0400%** |
| **Supreme VIP**| N/A | ≥ €100,000,000 | **0.0450% / 0.0300%** | **0.0450% / 0.0300%** |

*(Note: Unified single rate structure transitions effective October 5, 2026).*

### Fiat Deposit and Withdrawal Fees
*   **SEPA Withdrawal Fee**: 0.08% + fixed 5.50 EUR.
*   **iDEAL Deposit Fee**: 0 EUR.
*   **BLIK / ZEN / PayPal**: Channel processing fees apply as detailed in One-Click Buy.

### Common Customer Issues
*   **Charged Taker Fee on Limit Order**: Executed immediately because order price crossed market order book.
*   **VIP Tier Lag**: Volume or balance reached VIP threshold during the day, but tier only updates at the next 07:00 UTC cycle.

**Source URLs**:
- https://www.bybit.eu/en-EU/help-center/article/Trading-Fee-Structure
- https://www.bybit.eu/en-EU/help-center/article/Introduction-to-Bybit-VIP-Program
- https://www.bybit.eu/en-EU/help-center/article/Benefits-of-the-VIP-Program

---

## 8. Chart, Market, and Order Interfaces

### Interface Structure
The Bybit EU Spot trading page consists of four core workspace panels:

```
+-----------------------------------------------------------------------+
|  Market Header: Trading Pair, Last Price, 24h Change, 24h High/Low    |
+------------------------------------+----------------------------------+
|                                    |  Order Book (Bids / Asks)        |
|  Chart Panel                       |  & Market Trades                 |
|  - TradingView Chart               +----------------------------------+
|  - Standard Chart                  |  Order Entry Panel               |
|  - Depth Chart                     |  - Buy / Sell Tabs               |
|                                    |  - Market / Limit / Conditional  |
|                                    |  - TP/SL & Advanced Checkboxes   |
+------------------------------------+----------------------------------+
|  Order Management Panel (Open Orders, Order History, Asset Summary)   |
+-----------------------------------------------------------------------+
```

### Key Tools & Features
*   **TradingView Charting**: Full technical analysis suite including pine script indicators, drawing tools, multi-timeframe aggregation (1m to 1M), and chart settings.
*   **Standard Chart**: Simplified lightweight chart for quick price tracking.
*   **Depth Chart**: Visual cumulative volume representation of Bid liquidity (green slope) vs Ask liquidity (red slope).
*   **Order Entry Panel**:
    *   Percentage balance slider (25%, 50%, 75%, 100%).
    *   TP/SL presets for spot entries.
    *   Advanced order dropdowns (Post-Only, GTC/IOC/FOK, Iceberg, TWAP).
*   **Order Management Tabs**: Real-time management of active Open Orders, Conditional Triggers, Order History, Trade History, and Asset Allocations.

### Common Customer Issues
*   **Chart Display/Loading Errors**: Caused by browser webgl or cache issues. Switching from TradingView mode to Standard Mode or clearing browser cache resolves display freezes.
*   **Order Book Grouping Confusion**: Users confused why exact order prices aren't listed line-by-line; resolved by adjusting Order Book decimal grouping (e.g. from 0.01 to 0.1).

**Source URLs**:
- https://www.bybit.eu/en-EU/help-center/article/How-to-Get-Started-with-Spot-Trading
- https://www.bybit.eu/en-EU/help-center/article/Types-of-Orders-Available-on-Bybit
