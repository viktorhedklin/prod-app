---
title: Bybit EU Knowledge Base - Accounts, Verification & Payments
summary: Comprehensive support knowledge base for Bybit EU (EEA-regulated platform operated under Bybit EU GmbH) covering account registration, account types, security controls, individual KYC levels and verification procedures, SEPA/Card/Crypto deposits and withdrawals, One-Click Buy, small balance conversion, asset overview valuation, fee schedules, and account deactivation/deletion workflows.
---

# Bybit EU Support Knowledge Base: Accounts, Verification & Payments

This knowledge base provides complete, structured operational guidance for Bybit EU customer support agents and AI copilots. Bybit EU operates specifically within the European Economic Area (EEA) under European regulation (including MiCAR and local compliance frameworks).

---

## 1. Account Registration, Account Types & Security

### Registration Overview & Eligibility
Bybit EU accounts are available exclusively to residents of supported European Economic Area (EEA) countries (excluding Malta and service-restricted jurisdictions). Users can register via the official web portal (`https://www.bybit.eu/en-EU/register` or `http://www.bybit.eu/App/register`) or the Bybit EU Mobile App.

#### Registration Methods & Step-by-Step Procedure
1. **Email Registration (Recommended):**
   - Provide a valid email address and password.
   - Recommended email providers: **Gmail, iCloud, ProtonMail**. Users should avoid temporary or disposable email addresses.
2. **Mobile Registration:**
   - Select country code and enter mobile number **omitting the leading zero** (e.g., for `090-1234-5678`, enter `9012345678`).
   - Must use single-byte alphanumeric characters.
3. **Single Sign-On (SSO):**
   - **Sign Up with Google:** Uses the primary email address linked to the Google Account.
   - **Sign Up with Apple:** Supports "Share My Email" or "Hide My Email".
     - *Note on Hide My Email:* Apple generates a unique `@privaterelay.appleid.com` address. Users must check Apple Settings → iCloud → Apps Using iCloud → Hide My Email to identify their registered email address for future support inquiries.
4. **Verification Step:**
   - Select "No" to confirm non-residence in restricted countries/regions.
   - Complete reCAPTCHA and enter the 6-digit email or SMS verification code sent within the validity window.

---

### Account Types & Account Hierarchy
Bybit EU structures funds across specific dedicated account modules:

| Account Type | Description & Primary Functions | Subaccount Support & Restrictions |
| :--- | :--- | :--- |
| **Main Account** | Primary account registered under the user's KYC. Controls security settings, API keys, subaccount management, and global withdrawal limits. | Full administrative control over all linked subaccounts. |
| **Funding Account** | Primary storage for fiat currencies and newly deposited/purchased crypto assets. Used for fiat deposits, card buys, P2P, and withdrawals. | Subaccounts **do not support** fiat deposits, fiat withdrawals, or One-Click Buy. Funds must be purchased on the Main Account and transferred internally. |
| **Unified Trading Account (UTA)** | Centralized margin and trading account consolidating Spot, Spot Margin, and trading products into a single collateral pool. | Subaccounts inherit the VIP fee tier of the Main Account. Trading volume on subaccounts counts toward Main Account VIP tier progression. |
| **Bybit Earn Account** | Account holding funds allocated to yield/earn products (e.g., Flexible/Fixed Rewards). | Non-custodial contractual claim under MiCAR (assets transferred out of custody). |

---

### Security Features & Account Protection

To ensure maximum asset protection and comply with EEA compliance standards, Bybit EU mandates multi-factor authentication and provides advanced account defense controls:

#### Mandatory & Recommended Authentication Controls
* **Email & Google Two-Factor Authentication (2FA):** Mandatory for all crypto and fiat withdrawals, password modifications, and security setting updates.
  * *Setup:* Profile Avatar → **Account & Security** → **Google Two-Factor Authentication** → Bind via Google Authenticator app.
  * *Critical Rule:* Account synchronization in Google Authenticator should be disabled to prevent cloud backup exposure.
* **SMS Authentication:** Optional additional verification layer.
* **Fund Password:** A secondary password distinct from the login password. Required specifically to approve security setting changes and authorize withdrawal requests.
* **Secure Transaction Approval:** Designates a primary trusted device to approve high-risk account actions.

#### Fraud & Phishing Defense Systems
* **Anti-Phishing Code:** A custom string of alphanumeric characters configured by the user. Once set up, this exact code appears in all official Bybit EU emails and SMS messages. If missing or incorrect, the message is fraudulent.
* **Trusted Devices Management:** Lists all authorized devices. Users can view active sessions at **User Center → Security → Trusted Devices** and immediately revoke unrecognized hardware.
* **New Address Withdrawal Lock:** Restricts crypto withdrawals to any newly added wallet address for **24 hours** from addition.
* **Bybit EU Authenticity Check:** Official verification tool (`https://www.bybit.eu/en-EU/help-center/`) to verify whether email addresses, domain names, phone numbers, or social handles are genuine.

---

### Common Customer Issues & Resolutions (Section 1)

#### 1. Not Receiving Email or SMS Verification Codes
* **Symptoms:** User does not receive the 6-digit code during registration, login, or security setting changes.
* **Root Causes:** Email landed in spam; domain blocked; leading zero included in mobile registration; carrier SMS filtering.
* **Resolution Steps:**
  1. Check Spam / Junk / Promotions folders in the email inbox.
  2. Whitelist `bybit.eu` and official notification domain addresses in email settings.
  3. For SMS: Verify that country code is correct and leading zero was omitted (e.g., enter `612345678` instead of `0612345678`).
  4. Ensure device is not on Airplane Mode and restart the phone or clear app cache.

#### 2. Lost Google Authenticator (2FA Reset)
* **Symptoms:** User lost phone or deleted the Authenticator app and cannot pass 2FA.
* **Resolution Steps:**
  1. On the 2FA input screen, click **"Having trouble with verification?"** or **"Self-service 2FA Reset"**.
  2. Complete security checks (email code + SMS code + Fund Password).
  3. If automated self-service fails, submit a manual security recovery request requiring Proof of Identity and selfie verification.
  4. *Security Hold:* Resetting 2FA triggers an automatic **24-hour withdrawal freeze** on the account for safety.

#### 3. Apple "Hide My Email" Login Confusion
* **Symptoms:** User registered using "Sign Up with Apple" with "Hide My Email" selected and cannot locate their login email or support ticket response.
* **Resolution Steps:**
  1. Direct user to iOS Settings → **Apple ID → iCloud → Apps Using iCloud → Hide My Email**.
  2. Locate the unique address ending in `@privaterelay.appleid.com`.
  3. Use this exact relay address for account login and support communications.

#### Sources & Official Help Pages
* https://www.bybit.eu/en-EU/help-center/article/How-to-register-an-account
* https://www.bybit.eu/en-EU/help-center/article/How-to-Enhance-Your-Account-Security
* https://www.bybit.eu/en-EU/help-center/article/How-to-Bind-Your-Account-2FA-via-Google-Authenticator

---

## 2. KYC / Identity Verification

### Legal Framework & Mandate
Under EEA anti-money laundering (AML) regulations and European framework rules, **Identity Verification (KYC) of at least Standard level is mandatory for all Bybit EU products and services**. Unverified users cannot deposit, trade, convert, or withdraw funds.

---

### Verification Levels, Requirements & Limits

Bybit EU implements three distinct individual verification tiers:

| Verification Tier | Requirements & Verification Pathways | Fiat Deposit & Withdrawal Limit | Crypto Deposit & Withdrawal Limit | Access & Product Features |
| :--- | :--- | :--- | :--- | :--- |
| **Standard Verification** *(Compulsory)* | **Proof of Identity (POI)** + **Selfie Liveness** + **Profile Survey** (7 questions) + **Sign Contracts**.<br><br>*Pathways available:*<br>1. **Quick Verification:** Digital ID scan + Liveness + electronic contract signature.<br>2. **Bank Verification:** ID scan + IBAN verification + €1 SEPA test transfer from matching account.<br>3. **Video Verification:** Document scan + Liveness + Video interview + Phone check. | **SEPA:** Up to **€10,000,000 per order**.<br>**Non-SEPA:** ≤ €250k/order, ≤ €500k/day, ≤ €2.5M/week, ≤ €8M/month. | ≤ **1,000,000 USDC / day**. | Full platform access: Spot Trading, Spot Margin, One-Click Buy, Convert, Launchpool, Rewards Hub. |
| **Advanced Verification** *(Optional)* | Standard Verification **PLUS** valid **Proof of Address (POA)** issued within the last 3 months. | **SEPA:** Up to **€10,000,000 per order**.<br>**Non-SEPA:** ≤ €300k/order, ≤ €600k/day, ≤ €3M/week, ≤ €10M/month. | ≤ **2,000,000 USDC / day**. | Unlocks Bybit Card issuance, higher fiat card limits, and enhanced transaction caps. |
| **Pro Verification** | Standard & Advanced Verification **PLUS** Enhanced Due Diligence (EDD) / Proof of Wealth & Income verification. | **SEPA:** Up to **€10,000,000 per order**.<br>**Non-SEPA:** ≤ €2M/order, ≤ €8M/day, ≤ €20M/week, ≤ €60M/month. | ≤ **2,000,000 USDC / day**. | Custom institutional/VIP limits and dedicated account management. |

*Note on Travel Rule & Limits:* SEPA transactions enjoy dedicated €10M per order limits across all verified tiers. Non-SEPA payment methods (cards, e-wallets) follow the tiered daily/monthly limits above.

---

### Accepted & Unaccepted Verification Documents

#### 1. Proof of Identity (POI)
* **Accepted Documents:**
  * Valid Passport (must include user's signature page).
  * EEA National Identity Card.
  * EEA Residence Permit.
* **Unaccepted Documents:**
  * Student Visas, Working Visas, Travel Visas.
  * Driving Licenses (for primary EEA compliance on Bybit EU GmbH first deposits).
  * Non-EEA identity documents (except international passports with valid EEA residency).
  * Documents issued in Malta (Malta is excluded from Bybit EU service area).

#### 2. Proof of Address (POA)
* **Requirements:** Issued within the **last 3 months** (90 days). Must clearly display the user's full name, residential address, issuing entity logo, and issue date.
* **Accepted Documents:**
  * Utility bills (electricity, water, gas, internet, landline phone, cable TV).
  * Official bank statements or government-issued residential certificates.
  * Local tax returns or council tax statements.
* **Unaccepted Documents:**
  * Mobile phone bills, insurance policy documents, medical bills.
  * Handwritten invoices, receipts, purchase confirmations.
  * Screenshots, black-and-white printouts, or cropped images.

---

### Processing Times & Resubmission Rules
* **Standard Verification Processing Time:** Automated verification completes in **15 to 20 minutes**.
* **Enhanced Due Diligence (EDD) / Manual Review:** Up to **72 hours** (status trackable via Compliance Ticket in Support Hub).
* **Bank Verification Timeout:** If ID verification is not completed within 24 hours of initiating the €1 SEPA deposit, funds are automatically refunded to the originating bank account.
* **Resubmission Limit:** Maximum of **5 failed submissions in a 24-hour window**. Exceeding 5 attempts locks resubmission for 24 hours.

---

### Common Customer Issues & Resolutions (Section 2)

#### 1. Common KYC Rejection Reasons & Fixes

| Rejection Reason | Cause / Description | Corrective Action / Agent Guidance |
| :--- | :--- | :--- |
| **Invalid ID / Cut Corners** | Edges or corners cropped; glare/reflection obscuring details; black & white image. | Re-upload a full-color, high-resolution photo showing all 4 corners without flash glare. |
| **Missing Passport Signature** | Passport image missing the official signature page. | Re-upload passport showing both the photo page and the signed signature page. |
| **Proof of Address > 3 Months** | POA document date is older than 90 days. | Submit a bank statement or utility bill issued strictly within the last 3 months. |
| **Name / Third-Party Mismatch** | Name on document or bank transfer does not match Bybit EU account name. | Third-party transfers/documents are strictly forbidden. Account holder names must match identically. |
| **Unrecognized Language** | Document written in non-supported scripts (e.g., Arabic, Cyrillic, Sinhala). | Submit an International Passport containing Latin character transliteration. |
| **Multiple Accounts Detected** | User previously verified another account using the same ID document. | Bybit EU permits strictly **one verified account per individual**. The user must log into the originally verified account. |

#### 2. KYC Verification Stuck in "Processing"
* **Resolution Steps:**
  1. Check if the user was prompted for the 7-question **Profile Survey** or **EDD Questionnaire**.
  2. If under EDD review, confirm that the 72-hour window has not elapsed.
  3. If processing exceeds 72 hours, submit a ticket under "Compliance Ticket" in the Support Hub.

#### Sources & Official Help Pages
* https://www.bybit.eu/en-EU/help-center/article/How-to-Complete-Individual-KYC-Verification
* https://www.bybit.eu/en-EU/help-center/article/Benefits-of-Different-KYC-Levels
* https://www.bybit.eu/en-EU/help-center/article/Common-Reasons-and-Solutions-for-KYC-Verification-Failures
* https://www.bybit.eu/en-EU/help-center/article/Individual-KYC-FAQ

---

## 3. Deposits & Withdrawals

### 1. Bank Transfers (SEPA & SEPA Instant)

Bybit EU supports direct European Single Euro Payments Area (SEPA) fiat deposits and withdrawals for EUR.

#### SEPA Deposit Details & Rules
* **Bybit EU Deposit Fee:** **€0 (Zero fee)**. (External bank charges may apply).
* **Per-Order Limit:** Up to **€10,000,000 per order** for all verified users.
* **Virtual IBAN Creation:** Before the first SEPA deposit, users apply for a personal virtual IBAN. Virtual IBAN review and setup takes **3 to 5 business days**.
* **Processing Time:** SEPA Instant takes minutes; standard SEPA takes **1 to 3 business days** (delays may extend up to 5 business days).
* **Crucial Mandate — Reference ID:** Users MUST include the unique **Reference Code / Reference ID** provided on screen in the bank transfer memo field. Omitting or misspelling the Reference ID will cause transfer delays or automatic refunds.

#### SEPA Withdrawal Details & Rules
* **Requirements:** Email Authentication + Google 2FA + Standard Individual KYC.
* **Withdrawal Fee:** Displayed on the fiat withdrawal page based on current channel provider rates.
* **Account Whitelisting:** Users can only withdraw to a bank account from which they have previously made a successful deposit. Maximum **3 SEPA withdrawal bank accounts** per currency. Adding a new withdrawal account manually requires a **3 to 5 business day review**.

---

### 2. Card & Electronic Wallet Payments (Visa, Mastercard, E-Wallets)

Bybit EU enables instant fiat deposits and withdrawals via linked payment cards and e-wallet providers.

#### Supported Payment Channels & Regional Availability
* **Bank Cards (Visa & Mastercard):** Supported across EEA countries (Austria, Belgium, France, Germany, Netherlands, Spain, Sweden, etc.). **Corporate cards are strictly unaccepted**. Cards must support **3D Secure (3DS)** and international online transactions.
* **Digital Wallets:** Apple Pay, Google Pay, iDEAL (Netherlands), PayPal, Trustly, ZEN.com, BLIK (Poland).
* **Regional Restrictions:**
  * *BLIK / ZEN.com:* Unsupported for residents of Germany, France, Portugal, Netherlands.
  * *Easy Bank Payment:* Unsupported in Netherlands.
* **Card Limits:** Users can link up to **5 payment cards** total (including unlinked cards within the trailing 180-day window).

---

### 3. Crypto Deposits & On-Chain Withdrawals

#### Crypto Deposits
* **Deposit Fee:** **€0 (Zero fee)** for all on-chain crypto deposits and internal transfers.
* **Travel Rule Compliance (Compulsory in EEA):**
  * In accordance with European Travel Rule regulations, incoming crypto deposits are placed on temporary hold with a **yellow notification banner** on the Funding Account History page.
  * *Required User Action:* Click **"Continue"** on the yellow banner and specify:
    1. Source type: Exchange/VASP vs. Personal Self-Custody Wallet (e.g., MetaMask).
    2. Originating Exchange Name / Wallet Ownership details.
    3. Originator Account Type (Individual vs. Corporate) and Full Name.
    4. Transaction Purpose.
  * Once submitted, funds are released to the Funding Account balance.

#### Crypto Withdrawals
* **Withdrawal Fees & Minimums:** Fixed fee per transaction depending on the chosen coin and blockchain network (e.g., USDT-ERC20, USDT-TRC20, BTC, ETH). Fees and minimum withdrawal thresholds are displayed in real-time on the withdrawal page.
* **Internal Transfers:** Instant, 100% free (€0 fee) when transferring crypto to another Bybit EU account user UID / email. Recipient **must have completed KYC**.
* **Security Locks:**
  * **New Address Withdrawal Lock:** 24-hour hold on newly added withdrawal wallet addresses.
  * **Security Parameter Lock:** Changing password, resetting 2FA, or updating email triggers a global **24-hour withdrawal freeze**.

---

### Common Customer Issues & Resolutions (Section 3)

#### 1. SEPA Deposit Missing / Not Credited
* **Symptoms:** User transferred funds via SEPA over 3 days ago, but balance is still 0.
* **Root Causes:** Omitted Reference ID; transferred from a third-party bank account (spouse/friend/company); name mismatch.
* **Resolution Steps:**
  1. Verify if the user included the exact **Reference Code** in the bank transfer memo.
  2. Confirm that the bank account holder name matches the Bybit EU KYC name identically.
  3. If omitted or third-party, funds will be automatically refunded by the banking partner within **7 to 14 business days**.
  4. If details match and Reference ID was included, request proof of payment (PDF receipt) showing sender IBAN, recipient IBAN, timestamp, and memo, then escalate via Support Ticket.

#### 2. Card Deposit Failed / Declined
* **Symptoms:** Card payment fails at checkout.
* **Root Causes:** 3D Secure authentication failed; corporate card used; 5-card linking limit reached; bank blocked crypto merchant.
* **Resolution Steps:**
  1. Confirm the card is a personal Visa/Mastercard (not corporate/business).
  2. Ensure 3D Secure SMS/App push approval was completed on the banking app.
  3. Advise user to contact their card-issuing bank to authorize international crypto purchases.
  4. Check if 5 card slots are already occupied.

#### 3. Crypto Deposit Pending "Travel Rule Verification Required"
* **Symptoms:** On-chain transaction is confirmed on the blockchain, but crypto is not credited.
* **Resolution Steps:**
  1. Direct user to **Assets → Funding Account → History**.
  2. Locate the pending deposit with the **yellow banner**.
  3. Click **Continue** and complete the Travel Rule fields (Originator name, origin wallet/exchange, purpose).
  4. Balance credits immediately upon form submission.

#### Sources & Official Help Pages
* https://www.bybit.eu/en-EU/help-center/article/FAQ-Fiat-Deposit
* https://www.bybit.eu/en-EU/help-center/article/FAQ-Fiat-Withdrawal
* https://www.bybit.eu/en-EU/help-center/article/FAQ-Crypto-Withdrawal
* https://www.bybit.eu/en-EU/help-center/article/FAQ-Travel-Rule
* https://www.bybit.eu/en-EU/help-center/article/How-to-Withdraw-Fiat-Currencies-on-Bybit

---

## 4. Buying Crypto (One-Click Buy & Convert Small Balance)

### 1. One-Click Buy Feature
One-Click Buy allows users to instantly purchase or sell supported cryptocurrencies using fiat balances, bank cards, or local e-wallets without placing manual order book trades.

#### Purchase & Credit Timelines
* **Settlement Speed:** Purchased coins are credited to the user's **Funding Account** within **seconds to 10 minutes** (maximum 24 hours).
* **Order Validity Window:** Orders remain valid for **30 minutes**. If payment processing completes after the 30-minute window expires, the system triggers an automatic refund within **7 business days**.

#### Payment Method Fees (One-Click Buy)

| Fiat Currency | Payment Method | Transaction Processing Fee |
| :--- | :--- | :--- |
| **EUR** | iDEAL | **0% (Free)** |
| **EUR** | PayPal | Buy: **1.75%** \| Sell: **1.60%** (Capped at 10 EUR) |
| **PLN** | BLIK | **0.9% + 0.5 PLN** fixed fee |
| **PLN** | ZEN.com | **0.92%** |
| **EUR** | Trustly | **1.32 EUR** fixed fee |
| **DKK / SEK / NOK** | PayPal | Buy: **2.5%** \| Sell: **1.60%** (Capped at 75 DKK / 115 SEK / 120 NOK) |
| **CHF / HUF / CZK** | PayPal | Buy: **2.5%** \| Sell: **1.60%** (Capped at 10 CHF / 4000 HUF / 250 CZK) |

---

### 2. Convert Small Account Balance Feature
To prevent unusable "dust" balances, users can consolidate small crypto holdings into **MNT** or **USDC** in a single transaction.

#### Operational Rules & Parameters
* **Supported Accounts:** Assets held in either the **Funding Account** or **Unified Trading Account (UTA)**.
* **Eligible Threshold:** Individual asset holdings valued at **less than 0.001 BTC equivalent**.
* **Minimum / Maximum Limits:**
  * Maximum transaction conversion value: **200 USDC equivalent**.
  * Minimum output value: **0.00000001 MNT equivalent**.
* **Conversion Fee:** Fixed **2% conversion fee** charged by Bybit EU.
* **Frequency Limit:** Allowed strictly **once every 1 hour**.
* **Price Refresh & Buffer:** Quoted conversion price refreshes every 30 seconds. If market price fluctuates by **≥ 0.5%** during confirmation, the transaction automatically cancels to protect the user from slippage.
* **Exclusions:** Delisted coins cannot be converted using this tool.

---

### Common Customer Issues & Resolutions (Section 4)

#### 1. One-Click Buy Payment Deducted but Order Expired
* **Symptoms:** Money was debited from user's bank card/PayPal, but no crypto was credited and order status shows "Expired".
* **Resolution Steps:**
  1. Explain that bank processing delays exceeded the 30-minute order window.
  2. The system automatically registers a refund. Refund processing takes **7 business days** to credit back to the original payment method.
  3. If 7 business days have elapsed, collect UID, Order Number, and bank debit proof, and submit an inquiry via the Fiat Webform.

#### 2. Convert Small Balance Fails or Shows Error
* **Symptoms:** User receives an error when trying to convert low-balance assets.
* **Root Causes:** Single asset exceeds 0.001 BTC threshold; executed within 1-hour cooldown; price slippage exceeded 0.5%; asset is delisted.
* **Resolution Steps:**
  1. Check asset balance valuation (must be strictly < 0.001 BTC).
  2. Verify if a conversion was performed within the past 60 minutes.
  3. Advise the user to retry if price volatility triggered the 0.5% protection buffer.

#### Sources & Official Help Pages
* https://www.bybit.eu/en-EU/help-center/article/How-to-Buy-Coins-With-One-Click-Buy
* https://www.bybit.eu/en-EU/help-center/article/FAQ-One-Click-Buy
* https://www.bybit.eu/en-EU/help-center/article/How-to-Convert-Small-Account-Balance

---

## 5. Asset Overview Page & Valuation

### Asset Structure & Module Navigation
Users access their complete fund distribution at **Assets → Assets Overview**.

#### Primary Account Modules
1. **Funding Account:** Primary custody account holding unencumbered fiat and crypto.
2. **Unified Trading Account (UTA):** Core trading account holding active Spot holdings, margin collateral, and active position margins.
3. **Invested Products (Bybit Earn):** Holdings allocated to earn products.
   * *MiCAR Legal Notice:* Assets in Bybit Earn are transferred out of custody under a contractual claim and excluded from standard MiCAR client asset segregation.

---

### Key Metrics & Formulas

* **Total Equity:** Aggregated value across all accounts expressed in BTC and preferred display fiat (default: EUR). (Can be hidden using the eye toggle icon).
* **Amount:** Quantity of Spot assets held in Funding Account and UTA (excludes Earn assets).
* **Average Cost (Avg. Cost):** The weighted average price at which an asset was added to the account.
  $$\text{Avg. Cost} = \frac{(\text{Market Price at Addition} \times \text{Added Qty}) + (\text{Original Qty} \times \text{Original Avg. Cost})}{\text{Original Qty} + \text{Added Qty}}$$
  * *Key Rule:* Only an **increase** in quantity (purchases or incoming deposits) recalculates average cost. Decreases or transfers out do not alter average cost.
* **Cumulative P&L (EUR):**
  $$\text{Cumulative P\&L (EUR)} = (\text{Current Index Price} - \text{Avg. Cost}) \times \text{Current Amount}$$
* **Cumulative P&L (%):**
  $$\text{Cumulative P\&L (\%)} = \frac{\text{Current Index Price} - \text{Avg. Cost}}{\text{Avg. Cost}} \times 100$$
* **Asset Snapshot Chart:** Daily equity snapshot recorded at **11:59 PM UTC** and updated daily at **04:00 AM UTC**.

---

### Common Customer Issues & Resolutions (Section 5)

#### 1. Balance Missing After Subscribing to Bybit Earn
* **Symptoms:** User subscribed to a flexible/fixed earn pool and reports that funds vanished from their Funding Account.
* **Resolution Steps:**
  1. Clarify that subscribing to Bybit Earn moves the asset from the Funding Account into the Earn account module.
  2. Direct user to **Assets → Earn** to view active subscriptions and yield.

#### 2. Discrepancy in Average Cost / P&L Calculation
* **Symptoms:** User claims average cost or P&L percentage is inaccurate.
* **Resolution Steps:**
  1. Explain that external crypto deposits record the market index price at the exact moment of deposit as the acquisition cost.
  2. Internal transfers between Funding Account and UTA do not alter average cost.
  3. Reassure the user that the asset metrics are for reference purposes and do not impact actual trading execution prices.

#### Sources & Official Help Pages
* https://www.bybit.eu/en-EU/help-center/article/How-to-Understand-Your-Assets-Overview-and-Average-Cost

---

## 6. Fees & Fee Schedules

Bybit EU maintains a transparent, tiered fee schedule. Fees vary by user VIP status, trading volume, asset balance, and payment method.

---

### 1. Spot & Spot Margin Trading Fee Schedule

VIP levels are recalculated daily at **07:00 AM UTC** based on either 30-day trading volume or total asset balance (whichever yields the higher tier). Subaccounts inherit the Main Account VIP rate.

#### Current Tiered Fee Structure (Crypto-Crypto Pairs)

| VIP Level | Asset Balance Criteria (EUR) | 30-Day Spot Volume Criteria (EUR) | Taker Fee Rate | Maker Fee Rate |
| :--- | :--- | :--- | :--- | :--- |
| **VIP 0 (Non-VIP)** | < €100,000 | < €1,000,000 | **0.2500%** | **0.1000%** |
| **VIP 1** | ≥ €100,000 | ≥ €1,000,000 | **0.1000%** | **0.0675%** |
| **VIP 2** | ≥ €250,000 | ≥ €5,000,000 | **0.0775%** | **0.0650%** |
| **VIP 3** | ≥ €500,000 | ≥ €10,000,000 | **0.0750%** | **0.0625%** |
| **VIP 4** | ≥ €1,000,000 | ≥ €25,000,000 | **0.0600%** | **0.0500%** |
| **VIP 5** | ≥ €2,000,000 | ≥ €50,000,000 | **0.0500%** | **0.0400%** |
| **Supreme VIP** | N/A | ≥ €100,000,000 | **0.0450%** | **0.0300%** |

*Unified Structure Note:* Effective **October 5, 2026 at 11:00 UTC**, Bybit EU updates to a unified single fee rate structure (e.g., VIP 0 flat rate 0.2500%, VIP 1 flat rate 0.1200%).

#### Fiat-Crypto Trading Pairs Fee Schedule (e.g., USDC/EUR)
For Fiat-Crypto pairs, VIP 0 Maker fee rate is **0.1500%** and Taker fee rate is **0.2500%**. VIP tiers 1 to Supreme follow identical discounted rates to the table above.

---

### 2. Deposit, Withdrawal & Margin Fees Summary

* **Crypto On-Chain Deposit Fee:** **€0 (Free)**.
* **Crypto Internal Transfer Fee:** **€0 (Free)**.
* **Crypto Withdrawal Fee:** Fixed per transaction based on network costs (e.g., 1 USDT for TRC-20, fixed BTC rate for Bitcoin network).
* **Fiat SEPA Deposit Fee:** **€0 (Free)**.
* **Fiat SEPA Withdrawal Fee:** Displayed on withdrawal page.
* **Spot Margin Borrowing Fee:** Hourly interest rate charged on borrowed funds.
* **Spot Margin Liquidation Fee:** **2%** charged on liquidated assets upon auto-repayment (injected into margin insurance pool).

---

### Common Customer Issues & Resolutions (Section 6)

#### 1. Charged Higher Trading Fee Than Expected
* **Symptoms:** VIP user claims they were charged 0.25% instead of their VIP rate.
* **Resolution Steps:**
  1. Check the timestamp of order execution. VIP levels update daily at **07:00 AM UTC**.
  2. If trading volume or asset balance dropped below VIP thresholds prior to 07:00 UTC, the user was downgraded to VIP 0.
  3. Verify whether the trade was a Taker order (market order / immediate execution limit order) versus Maker order.

#### Sources & Official Help Pages
* https://www.bybit.eu/en-EU/help-center/article/Bybit-Fees-You-Need-to-Know
* https://www.bybit.eu/en-EU/help-center/article/Trading-Fee-Structure

---

## 7. Account Deactivation & Account Deletion

Bybit EU distinguishes between temporary **Account Deactivation** and permanent **Account Deletion**.

---

### Account Deactivation (Temporary Freeze)
* **Purpose:** Temporarily lock account access if suspicious activity is detected or the user wishes to pause trading.
* **Self-Deactivation Triggers:** Via Account Security page or by clicking the **"Deactivate Account"** link embedded in security emails (e.g., new device login, new withdrawal address notification).
* **Reactivation:** Users can self-reactivate by logging in, completing security verification, and submitting ID verification.
* **Security Freeze:** Reactivating an account imposes an automatic **24-hour withdrawal lock**.

---

### Account Deletion (Permanent Self-Service)

Bybit EU provides a self-service account deletion feature located under **Account → Account Management → Delete Account**.

#### Step-by-Step Account Deletion Workflow
1. **Navigate:** Log in on Web or Mobile App → Go to **Account** page → Click **Delete Account**.
2. **Review & Confirm:** System presents a summary of linked subaccounts, remaining assets, and data removal terms. User confirms understanding that deletion is **irreversible**.
3. **Security Verification:** Enter Email Verification Code + Google 2FA Code + Fund Password.
4. **Completion:** Account is permanently closed, session terminated, and login access revoked.

#### Mandatory Prerequisites for Account Deletion
To successfully delete an account, all of the following criteria must be met:
1. **Zero Asset Balance:** Total wallet balance across Funding Account, UTA, and Earn must be zero (or remaining dust converted/withdrawn).
2. **No Active Orders or Positions:** All open Spot/Margin orders, active margin loans, and trading bot strategies must be closed.
3. **No Pending Transactions:** No in-flight SEPA deposits, card buys, or crypto withdrawals.
4. **Subaccounts Cleaned:** All subaccounts must have zero balance and no active orders.

#### Data Retention Policy
Upon deletion, personal preferences, rewards, and active access are removed. However, under European regulations (AML directives, tax laws, and MiCAR regulations), **certain transaction records, identity logs, and financial history are retained on Bybit EU servers for legally mandated retention periods** (typically 5 to 7 years).

---

### Common Customer Issues & Resolutions (Section 7)

#### 1. Account Deletion Blocked Due to Remaining Balance ("Dust")
* **Symptoms:** User clicks Delete Account but receives an error stating assets remain in the account.
* **Resolution Steps:**
  1. Direct user to **Convert Small Balance** (Section 4) to convert remaining small assets into USDC or MNT.
  2. If the balance is below the minimum conversion threshold, advise the user to contact Support to forfeit remaining dust balances so deletion can proceed.

#### 2. Cannot Delete Account Due to Active Subaccount
* **Symptoms:** System blocks deletion because a subaccount is active.
* **Resolution Steps:**
  1. Direct user to **Account & Security → Subaccount**.
  2. Transfer any subaccount funds back to the Main Account.
  3. Delete or freeze all subaccounts prior to initiating Main Account deletion.

#### Sources & Official Help Pages
* https://www.bybit.eu/en-EU/help-center/article/How-to-Delete-An-Account
* https://www.bybit.eu/en-EU/help-center/article/How-to-Deactivate-Your-Account
* https://www.bybit.eu/en-EU/help-center/article/How-to-Reactivate-Your-Account
