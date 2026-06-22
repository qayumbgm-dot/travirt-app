
export interface DepthLevel {
    price: number;
    orders: number;
    quantity: number;
}

export interface MarketDepth {
    bids: DepthLevel[];
    asks: DepthLevel[];
}

export interface OverviewAsset {
    symbol: string;
    name: string;
    ltp: number;
    change: number;
    changePercent: number;
    history: { name: string; value: number }[];
}

export enum InstrumentType {
    EQUITY = 'EQUITY',
    INDEX = 'INDEX',
    FUTURE = 'FUTURE',
    OPTION = 'OPTION'
}

export interface Stock {
    symbol: string;
    name: string;
    exchange: string;
    instrumentType?: InstrumentType; // New field
    underlying?: string; // For F&O (e.g., NIFTY 50)
    expiryDate?: string; // For F&O
    strikePrice?: number; // For Options
    optionType?: 'CE' | 'PE'; // For Options
    ltp: number; // Last Traded Price
    open: number;
    high: number;
    low: number;
    prevClose: number;
    change: number;
    changePercent: number;
    event?: string;
    bid?: number;
    ask?: number;
    marketDepth?: MarketDepth;
    volume?: number;
    avgTradePrice?: number;
    lastTradedQuantity?: number;
    lastTradedAt?: string;
    lowerCircuit?: number;
    upperCircuit?: number;
}

// Incoming Data from Broadcasting WebSocket
export interface TickData {
    symbol: string;
    ltp: number;
    change?: number;
    percentChange?: number;
    high?: number;
    low?: number;
    open?: number;
    volume?: number;
    timestamp?: number;
}

export type MarketStatus = 'LIVE' | 'SIMULATION' | 'CONNECTING';

// Structure for TradingView Lightweight Charts
export interface Candle {
    time: number; // Unix timestamp (seconds)
    open: number;
    high: number;
    low: number;
    close: number;
    volume?: number;
}

export interface Position {
    symbol: string;
    exchange: string; // Added exchange
    quantity: number;
    avgPrice: number;
    ltp: number;
    pnl: number;
    investedValue: number;
    currentValue: number;
}

export enum OrderType {
    MARKET = 'MARKET',
    LIMIT = 'LIMIT',
    STOP_LOSS_MARKET = 'STOP_LOSS_MARKET',
    TAKE_PROFIT_MARKET = 'TAKE_PROFIT_MARKET',
}

export enum TransactionType {
    BUY = 'BUY',
    SELL = 'SELL',
}

export enum OrderVariety {
    REGULAR = 'regular',
    AMO = 'amo',
    COVER = 'co',
    ICEBERG = 'iceberg',
    AUCTION = 'auction'
}

export interface Order {
    id: string;
    symbol: string;
    exchange: string; // Added exchange
    quantity: number;
    price?: number; // for limit orders
    orderType: OrderType;
    transactionType: TransactionType;
    variety?: OrderVariety; // New field for order variety
    timestamp: number;
    status: 'EXECUTED' | 'PENDING' | 'FAILED';
    stopLoss?: number;
    takeProfit?: number;
    triggerPrice?: number; // For SL/Cover orders
    disclosedQuantity?: number; // For Iceberg
    validity?: 'DAY' | 'IOC' | 'MINUTES';
}

export interface NewsArticle {
    id: string;
    symbol: string;
    title: string;
    source: string;
    snippet: string;
    timestamp: number;
}

export interface Transaction {
    id: string;
    type: 'DEPOSIT_INR' | 'BUY_NXO' | 'CONVERT_NXO' | 'REWARD_NXO';
    description: string;
    amount: string;
    timestamp: number;
}


// --- GTT (Good Till Triggered) Order Types ---
export enum GTTTriggerType {
    SINGLE = 'SINGLE',
    OCO = 'OCO', // One Cancels Other
}

export enum GTTStatus {
    ACTIVE = 'ACTIVE',
    TRIGGERED = 'TRIGGERED',
    CANCELLED = 'CANCELLED',
    EXPIRED = 'EXPIRED',
}

export interface GTTOrder {
    id: string;
    symbol: string;
    exchange?: string;
    transactionType: TransactionType;
    triggerType: GTTTriggerType;
    quantity: number;
    status: GTTStatus;
    createdAt: number;
    expiresAt: number;

    // For SINGLE trigger type
    triggerPrice?: number;
    limitPrice?: number;

    // For OCO trigger type (only for SELL)
    stoplossTriggerPrice?: number;
    stoplossLimitPrice?: number;
    targetTriggerPrice?: number;
    targetLimitPrice?: number;
}
// --- End GTT Types ---

// --- Alert Types ---
export enum AlertProperty {
    LTP = 'ltp',
    OPEN = 'open',
    HIGH = 'high',
    LOW = 'low',
    CLOSE = 'prevClose',
    CHANGE = 'change',
    CHANGE_PERCENT = 'changePercent',
    VOLUME = 'volume',
}

export enum AlertOperator {
    GTE = '>=',
    GT = '>',
    LTE = '<=',
    LT = '<',
    EQ = '==',
}

export enum AlertStatus {
    ACTIVE = 'ACTIVE',
    TRIGGERED = 'TRIGGERED',
    CANCELLED = 'CANCELLED',
    EXPIRED = 'EXPIRED',
}

export enum AlertType {
    ALERT_ONLY = 'ALERT_ONLY',
    ATO = 'ATO', // Alert Triggers Order
}

export interface Alert {
    id: string;
    symbol: string;
    exchange?: string;
    property: AlertProperty;
    operator: AlertOperator;
    value: number;
    type: AlertType;
    status: AlertStatus;
    createdAt: number;
    expiresAt: number;
    // atoBasket?: Order[]; // For future implementation
}
// --- End Alert Types ---


export interface PortfolioState {
    inrBalance: number; // Represents the user's fiat wallet (₹)
    nxoBalance: number; // Represents the user's NFINO (NXO) Token balance
    virtualBalance: number; // Represents the in-game currency for trading (1 NXO = 1,000 virtual)
    positions: Position[];
    orderHistory: Order[];
    transactionHistory: Transaction[];
    gttOrders: GTTOrder[]; // New state for GTT orders
    alerts: Alert[]; // New state for Alerts
    totalInvested: number;
    totalCurrentValue: number;
    totalPnl: number;
    todayPnl: number;
    marginUsed: number;
    dailyBonusClaimed: boolean;
}

export interface WatchlistGroup {
  id: string;
  name: string;
  symbols: string[]; // Now stores "EXCHANGE:SYMBOL" composite keys
  isCollapsed: boolean;
  isMaximized: boolean;
  color?: string;
}

export type SortByType = '%' | 'LTP' | 'A-Z' | 'EXCH';

export interface WatchlistSettings {
  changeType: 'close' | 'open';
  showOptions: {
    priceChange: boolean;
    priceChangePercent: boolean;
    priceDirection: boolean;
    holdings: boolean;
    notes: boolean;
    groupColors: boolean;
  };
  sortBy: SortByType;
}

export interface Watchlist {
  id: number;
  name: string;
  groups: WatchlistGroup[];
  settings: WatchlistSettings;
  notes?: Record<string, string>; // symbol -> note text
}

export interface DiscoverList {
  name: string;
  symbols: string[];
}

export interface BasketItem {
    id: string;
    stock: Stock;
    transactionType: TransactionType;
    orderType: OrderType;
    quantity: number;
    price?: number;
}
