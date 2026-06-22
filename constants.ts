
import { Stock, NewsArticle, MarketDepth, OverviewAsset, DiscoverList, InstrumentType } from './types';

const generateMockDepth = (ltp: number): MarketDepth => {
    const bids = [];
    const asks = [];
    for (let i = 0; i < 20; i++) {
        bids.push({
            price: ltp - (i + 1) * 0.05 - Math.random() * 0.05,
            orders: Math.floor(Math.random() * 15) + 1,
            quantity: Math.floor(Math.random() * 2000) + 50
        });
        asks.push({
            price: ltp + (i + 1) * 0.05 + Math.random() * 0.05,
            orders: Math.floor(Math.random() * 15) + 1,
            quantity: Math.floor(Math.random() * 2000) + 50
        });
    }
    return { bids, asks };
};

const generateStockDetails = (stock: Omit<Stock, 'marketDepth' | 'volume' | 'avgTradePrice' | 'lastTradedQuantity' | 'lastTradedAt' | 'lowerCircuit' | 'upperCircuit' | 'bid' | 'ask'>): Stock => {
    const ltp = stock.ltp;
    return {
        ...stock,
        instrumentType: stock.instrumentType || InstrumentType.EQUITY,
        marketDepth: generateMockDepth(ltp),
        bid: ltp - 0.05,
        ask: ltp + 0.05,
        volume: Math.floor(Math.random() * 5000000) + 100000,
        avgTradePrice: ltp * (1 + (Math.random() - 0.5) * 0.005),
        lastTradedQuantity: Math.floor(Math.random() * 500) + 1,
        lastTradedAt: new Date(Date.now() - Math.random() * 10000).toLocaleTimeString('en-GB'),
        lowerCircuit: stock.prevClose * 0.9,
        upperCircuit: stock.prevClose * 1.1,
    };
}

// Constants for the new token economy
export const INITIAL_INR_BALANCE = 0;
export const INITIAL_NXO_BALANCE = 0;
export const INITIAL_VIRTUAL_BALANCE = 0;

export const MOCK_INDICES: OverviewAsset[] = [
    {
        symbol: 'NIFTY 50',
        name: 'NIFTY 50',
        ltp: 26202.95,
        change: -12.6,
        changePercent: -0.05,
        history: Array.from({ length: 20 }, (_, i) => ({ name: `T-${20-i}`, value: 26200 + Math.sin(i/3) * 100 + Math.random() * 50 }))
    },
    {
        symbol: 'NIFTY BANK',
        name: 'NIFTY BANK',
        ltp: 59752.7,
        change: 15.4,
        changePercent: 0.03,
        history: Array.from({ length: 20 }, (_, i) => ({ name: `T-${20-i}`, value: 59700 + Math.sin(i/4) * 150 + Math.random() * 70 }))
    },
    {
        symbol: 'SENSEX',
        name: 'SENSEX',
        ltp: 85706.67,
        change: -13.71,
        changePercent: -0.02,
        history: Array.from({ length: 20 }, (_, i) => ({ name: `T-${20-i}`, value: 85700 + Math.sin(i/4) * 150 + Math.random() * 70 }))
    }
];

export const MOCK_STOCKS: Stock[] = [
  // --- Major Indices ---
  generateStockDetails({ symbol: 'NIFTY 50', name: 'NIFTY 50 INDEX', exchange: 'INDEX', instrumentType: InstrumentType.INDEX, ltp: 26202.95, open: 26215, high: 26250, low: 26180, prevClose: 26215.55, change: -12.6, changePercent: -0.05 }),
  generateStockDetails({ symbol: 'NIFTY BANK', name: 'NIFTY BANK INDEX', exchange: 'INDEX', instrumentType: InstrumentType.INDEX, ltp: 59752.7, open: 59737, high: 59800, low: 59700, prevClose: 59737.30, change: 15.4, changePercent: 0.03 }),
  generateStockDetails({ symbol: 'SENSEX', name: 'SENSEX INDEX', exchange: 'INDEX', instrumentType: InstrumentType.INDEX, ltp: 85706.67, open: 85720, high: 85800, low: 85650, prevClose: 85720.38, change: -13.71, changePercent: -0.02 }),
  
  // --- Futures ---
  generateStockDetails({ symbol: 'NIFTY OCT FUT', name: 'Nifty 50 Futures', exchange: 'NFO', instrumentType: InstrumentType.FUTURE, underlying: 'NIFTY 50', expiryDate: '31 OCT', ltp: 26050.00, open: 26000, high: 26100, low: 25980, prevClose: 26020, change: 30, changePercent: 0.11 }),
  generateStockDetails({ symbol: 'BANKNIFTY OCT FUT', name: 'Bank Nifty Futures', exchange: 'NFO', instrumentType: InstrumentType.FUTURE, underlying: 'NIFTY BANK', expiryDate: '31 OCT', ltp: 58700.00, open: 58600, high: 58800, low: 58500, prevClose: 58650, change: 50, changePercent: 0.08 }),

  // --- Major Stocks (Nifty 50) - NSE & BSE ---
  generateStockDetails({ symbol: 'TATASTEEL', name: 'Tata Steel', exchange: 'NSE', ltp: 181.50, open: 177.00, high: 182.00, low: 176.50, prevClose: 177.27, change: 4.23, changePercent: 2.39 }),
  generateStockDetails({ symbol: 'TATASTEEL', name: 'Tata Steel', exchange: 'BSE', ltp: 181.60, open: 177.10, high: 182.10, low: 176.60, prevClose: 177.30, change: 4.30, changePercent: 2.42 }),
  
  generateStockDetails({ symbol: 'TCS', name: 'Tata Consultancy', exchange: 'NSE', ltp: 2993.50, open: 3010.00, high: 3015.00, low: 2990.00, prevClose: 3010.90, change: -17.40, changePercent: -0.58 }),
  generateStockDetails({ symbol: 'TCS', name: 'Tata Consultancy', exchange: 'BSE', ltp: 2994.00, open: 3011.00, high: 3016.00, low: 2991.00, prevClose: 3011.00, change: -17.00, changePercent: -0.56 }),

  generateStockDetails({ symbol: 'RELIANCE', name: 'Reliance Industries', exchange: 'NSE', ltp: 1480.00, open: 1496.00, high: 1498.00, low: 1478.00, prevClose: 1496.10, change: -16.10, changePercent: -1.08 }),
  generateStockDetails({ symbol: 'RELIANCE', name: 'Reliance Industries', exchange: 'BSE', ltp: 1480.50, open: 1496.50, high: 1498.50, low: 1478.50, prevClose: 1496.60, change: -16.10, changePercent: -1.07 }),

  generateStockDetails({ symbol: 'HDFCBANK', name: 'HDFC Bank', exchange: 'NSE', ltp: 1650.00, open: 1640.00, high: 1660.00, low: 1635.00, prevClose: 1645.00, change: 5.00, changePercent: 0.30 }),
  generateStockDetails({ symbol: 'HDFCBANK', name: 'HDFC Bank', exchange: 'BSE', ltp: 1650.20, open: 1640.20, high: 1660.20, low: 1635.20, prevClose: 1645.20, change: 5.00, changePercent: 0.30 }),

  generateStockDetails({ symbol: 'INFY', name: 'Infosys', exchange: 'NSE', ltp: 1478.00, open: 1466.00, high: 1480.00, low: 1465.00, prevClose: 1466.70, change: 11.30, changePercent: 0.77 }),
  generateStockDetails({ symbol: 'INFY', name: 'Infosys', exchange: 'BSE', ltp: 1478.20, open: 1466.20, high: 1480.20, low: 1465.20, prevClose: 1466.90, change: 11.30, changePercent: 0.77 }),

  generateStockDetails({ symbol: 'SBIN', name: 'State Bank of India', exchange: 'NSE', ltp: 954.80, open: 960.00, high: 961.00, low: 954.00, prevClose: 960.75, change: -5.95, changePercent: -0.62 }),
  generateStockDetails({ symbol: 'ICICIBANK', name: 'ICICI Bank Ltd', exchange: 'NSE', ltp: 1258.40, open: 1250.00, high: 1265.00, low: 1245.00, prevClose: 1250.00, change: 8.40, changePercent: 0.67 }),
  generateStockDetails({ symbol: 'KOTAKBANK', name: 'Kotak Mahindra Bank', exchange: 'NSE', ltp: 2124.4, change: 14.20, changePercent: 0.67, open: 2110, high: 2130, low: 2100, prevClose: 2110.2 }),
  generateStockDetails({ symbol: 'AXISBANK', name: 'Axis Bank Ltd', exchange: 'NSE', ltp: 1120.30, open: 1115.00, high: 1130.00, low: 1110.00, prevClose: 1115.00, change: 5.30, changePercent: 0.48 }),
  generateStockDetails({ symbol: 'LT', name: 'Larsen & Toubro', exchange: 'NSE', ltp: 3650.00, open: 3640.00, high: 3670.00, low: 3630.00, prevClose: 3640.00, change: 10.00, changePercent: 0.27 }),
  generateStockDetails({ symbol: 'ITC', name: 'ITC Ltd', exchange: 'NSE', ltp: 440.50, open: 438.00, high: 445.00, low: 438.00, prevClose: 438.00, change: 2.50, changePercent: 0.57 }),
  generateStockDetails({ symbol: 'BHARTIARTL', name: 'Bharti Airtel', exchange: 'NSE', ltp: 1210.00, open: 1200.00, high: 1220.00, low: 1195.00, prevClose: 1200.00, change: 10.00, changePercent: 0.83 }),
  generateStockDetails({ symbol: 'MARUTI', name: 'Maruti Suzuki', exchange: 'NSE', ltp: 12500.00, open: 12450.00, high: 12600.00, low: 12400.00, prevClose: 12450.00, change: 50.00, changePercent: 0.40 }),
  generateStockDetails({ symbol: 'SUNPHARMA', name: 'Sun Pharma', exchange: 'NSE', ltp: 1831.6, change: 21.30, changePercent: 1.18, open: 1810.3, high: 1831.6, low: 1810.3, prevClose: 1810.3 }),
  generateStockDetails({ symbol: 'ULTRACEMCO', name: 'UltraTech Cement', exchange: 'NSE', ltp: 9850.00, open: 9800.00, high: 9900.00, low: 9750.00, prevClose: 9800.00, change: 50.00, changePercent: 0.51 }),
  generateStockDetails({ symbol: 'WIPRO', name: 'Wipro Ltd', exchange: 'NSE', ltp: 480.00, open: 475.00, high: 485.00, low: 470.00, prevClose: 475.00, change: 5.00, changePercent: 1.05 }),
  generateStockDetails({ symbol: 'HCLTECH', name: 'HCL Technologies', exchange: 'NSE', ltp: 1550.00, open: 1540.00, high: 1560.00, low: 1530.00, prevClose: 1540.00, change: 10.00, changePercent: 0.65 }),
  generateStockDetails({ symbol: 'BAJFINANCE', name: 'Bajaj Finance', exchange: 'NSE', ltp: 7200.00, open: 7150.00, high: 7250.00, low: 7100.00, prevClose: 7150.00, change: 50.00, changePercent: 0.70 }),
  generateStockDetails({ symbol: 'ADANIENT', name: 'Adani Enterprises', exchange: 'NSE', ltp: 2280.2, change: 25.20, changePercent: 1.12, open: 2255, high: 2280.2, low: 2255, prevClose: 2255 }),
  
  // --- Extended Stock List for Search ---
  generateStockDetails({ symbol: 'ADANIPORTS', name: 'Adani Ports', exchange: 'NSE', ltp: 1350.00, open: 1340.00, high: 1360.00, low: 1330.00, prevClose: 1340.00, change: 10.00, changePercent: 0.75 }),
  generateStockDetails({ symbol: 'ADANIGREEN', name: 'Adani Green Energy Ltd', exchange: 'NSE', ltp: 1048.2, change: 17.10, changePercent: 1.66, open: 1031.1, high: 1048.2, low: 1031.1, prevClose: 1031.1 }),
  generateStockDetails({ symbol: 'ASIANPAINT', name: 'Asian Paints', exchange: 'NSE', ltp: 2950.00, open: 2940.00, high: 2970.00, low: 2930.00, prevClose: 2940.00, change: 10.00, changePercent: 0.34 }),
  generateStockDetails({ symbol: 'AXISBANK', name: 'Axis Bank', exchange: 'BSE', ltp: 1120.50, open: 1115.50, high: 1130.50, low: 1110.50, prevClose: 1115.50, change: 5.00, changePercent: 0.45 }),
  generateStockDetails({ symbol: 'AMBUJACEM', name: 'Ambuja Cements', exchange: 'NSE', ltp: 630.00, open: 625.00, high: 635.00, low: 620.00, prevClose: 625.00, change: 5.00, changePercent: 0.80 }),
  generateStockDetails({ symbol: 'APOLLOHOSP', name: 'Apollo Hospitals', exchange: 'NSE', ltp: 6400.00, open: 6350.00, high: 6450.00, low: 6300.00, prevClose: 6350.00, change: 50.00, changePercent: 0.79 }),
  generateStockDetails({ symbol: 'ALKEM', name: 'Alkem Laboratories', exchange: 'NSE', ltp: 5200.00, open: 5150.00, high: 5250.00, low: 5100.00, prevClose: 5150.00, change: 50.00, changePercent: 0.97 }),
  generateStockDetails({ symbol: 'AUBANK', name: 'AU Small Finance Bank', exchange: 'NSE', ltp: 650.00, open: 640.00, high: 660.00, low: 630.00, prevClose: 645.00, change: 5.00, changePercent: 0.78 }),
  generateStockDetails({ symbol: 'AUROPHARMA', name: 'Aurobindo Pharma', exchange: 'NSE', ltp: 1100.00, open: 1080.00, high: 1120.00, low: 1070.00, prevClose: 1090.00, change: 10.00, changePercent: 0.92 }),
  generateStockDetails({ symbol: 'ACC', name: 'ACC Ltd', exchange: 'NSE', ltp: 2600.00, open: 2580.00, high: 2620.00, low: 2560.00, prevClose: 2580.00, change: 20.00, changePercent: 0.78 }),
  generateStockDetails({ symbol: 'ASTRAL', name: 'Astral Ltd', exchange: 'NSE', ltp: 2100.00, open: 2080.00, high: 2120.00, low: 2060.00, prevClose: 2080.00, change: 20.00, changePercent: 0.96 }),
  generateStockDetails({ symbol: 'ABBOTINDIA', name: 'Abbott India', exchange: 'NSE', ltp: 27500.00, open: 27400.00, high: 27600.00, low: 27300.00, prevClose: 27400.00, change: 100.00, changePercent: 0.36 }),
  generateStockDetails({ symbol: 'ASHOKLEY', name: 'Ashok Leyland', exchange: 'NSE', ltp: 185.00, open: 182.00, high: 188.00, low: 180.00, prevClose: 183.00, change: 2.00, changePercent: 1.09 }),
  generateStockDetails({ symbol: 'ABCAPITAL', name: 'Aditya Birla Capital', exchange: 'NSE', ltp: 190.00, open: 188.00, high: 192.00, low: 186.00, prevClose: 188.00, change: 2.00, changePercent: 1.06 }),
  generateStockDetails({ symbol: 'ABFRL', name: 'Aditya Birla Fashion', exchange: 'NSE', ltp: 240.00, open: 238.00, high: 242.00, low: 236.00, prevClose: 238.00, change: 2.00, changePercent: 0.84 }),
  generateStockDetails({ symbol: 'AJANTPHARM', name: 'Ajanta Pharma', exchange: 'NSE', ltp: 2200.00, open: 2180.00, high: 2220.00, low: 2160.00, prevClose: 2180.00, change: 20.00, changePercent: 0.92 }),
  generateStockDetails({ symbol: 'AMBER', name: 'Amber Enterprises', exchange: 'NSE', ltp: 3800.00, open: 3750.00, high: 3850.00, low: 3700.00, prevClose: 3780.00, change: 20.00, changePercent: 0.53 }),
  generateStockDetails({ symbol: 'APLLTD', name: 'Alembic Pharmaceuticals', exchange: 'NSE', ltp: 950.00, open: 940.00, high: 960.00, low: 930.00, prevClose: 945.00, change: 5.00, changePercent: 0.53 }),
  generateStockDetails({ symbol: 'ATUL', name: 'Atul Ltd', exchange: 'NSE', ltp: 6500.00, open: 6450.00, high: 6550.00, low: 6400.00, prevClose: 6480.00, change: 20.00, changePercent: 0.31 }),
  generateStockDetails({ symbol: 'AARTIIND', name: 'Aarti Industries', exchange: 'NSE', ltp: 650.00, open: 640.00, high: 660.00, low: 630.00, prevClose: 645.00, change: 5.00, changePercent: 0.78 }),
  generateStockDetails({ symbol: 'ABB', name: 'ABB India', exchange: 'NSE', ltp: 6800.00, open: 6750.00, high: 6850.00, low: 6700.00, prevClose: 6780.00, change: 20.00, changePercent: 0.29 }),
  generateStockDetails({ symbol: 'AKZOINDIA', name: 'Akzo Nobel India', exchange: 'NSE', ltp: 2800.00, open: 2780.00, high: 2820.00, low: 2760.00, prevClose: 2790.00, change: 10.00, changePercent: 0.36 }),
  generateStockDetails({ symbol: 'ALKYLAMINE', name: 'Alkyl Amines Chemicals', exchange: 'NSE', ltp: 2200.00, open: 2180.00, high: 2220.00, low: 2160.00, prevClose: 2190.00, change: 10.00, changePercent: 0.46 }),
  generateStockDetails({ symbol: 'ALLCARGO', name: 'Allcargo Logistics', exchange: 'NSE', ltp: 75.00, open: 74.00, high: 76.00, low: 73.00, prevClose: 74.50, change: 0.50, changePercent: 0.67 }),
  generateStockDetails({ symbol: 'AMARAJABAT', name: 'Amara Raja Batteries', exchange: 'NSE', ltp: 850.00, open: 840.00, high: 860.00, low: 830.00, prevClose: 845.00, change: 5.00, changePercent: 0.59 }),
  generateStockDetails({ symbol: 'ANURAS', name: 'Anupam Rasayan', exchange: 'NSE', ltp: 900.00, open: 890.00, high: 910.00, low: 880.00, prevClose: 895.00, change: 5.00, changePercent: 0.56 }),
  generateStockDetails({ symbol: 'APARINDS', name: 'Apar Industries', exchange: 'NSE', ltp: 6200.00, open: 6150.00, high: 6250.00, low: 6100.00, prevClose: 6180.00, change: 20.00, changePercent: 0.32 }),
  generateStockDetails({ symbol: 'APTUS', name: 'Aptus Value Housing', exchange: 'NSE', ltp: 320.00, open: 315.00, high: 325.00, low: 310.00, prevClose: 318.00, change: 2.00, changePercent: 0.63 }),
  generateStockDetails({ symbol: 'ASAHIINDIA', name: 'Asahi India Glass', exchange: 'NSE', ltp: 580.00, open: 570.00, high: 590.00, low: 560.00, prevClose: 575.00, change: 5.00, changePercent: 0.87 }),
  generateStockDetails({ symbol: 'ASTERDM', name: 'Aster DM Healthcare', exchange: 'NSE', ltp: 450.00, open: 440.00, high: 460.00, low: 430.00, prevClose: 445.00, change: 5.00, changePercent: 1.12 }),
  generateStockDetails({ symbol: 'AVANTIFEED', name: 'Avanti Feeds', exchange: 'NSE', ltp: 520.00, open: 510.00, high: 530.00, low: 500.00, prevClose: 515.00, change: 5.00, changePercent: 0.97 }),
  generateStockDetails({ symbol: 'AAVAS', name: 'Aavas Financiers', exchange: 'NSE', ltp: 1600.00, open: 1580.00, high: 1620.00, low: 1570.00, prevClose: 1590.00, change: 10.00, changePercent: 0.63 }),
];

export const MOCK_NEWS: NewsArticle[] = [
    { id: 'news1', symbol: 'RELIANCE', title: 'Reliance Jio unveils new 5G plans', source: 'Economic Times', snippet: 'Reliance Jio has announced a new set of 5G tariff plans, aiming to accelerate adoption across the country...', timestamp: Date.now() - 3600000 },
    // ...
];

export const DISCOVER_LISTS: DiscoverList[] = [
  { name: 'Futures & Options', symbols: ['NIFTY OCT FUT', 'BANKNIFTY OCT FUT', 'NSE:NIFTY 50', 'NSE:NIFTY BANK'] },
  { name: 'Major Indices', symbols: ['NSE:NIFTY 50', 'NSE:NIFTY NEXT 50', 'NSE:NIFTY BANK', 'BSE:SENSEX']},
  { name: 'Nifty 50', symbols: MOCK_STOCKS.filter(s => s.exchange !== 'INDEX' && s.instrumentType === InstrumentType.EQUITY && s.exchange === 'NSE').slice(0, 50).map(s => `NSE:${s.symbol}`) },
];

export const INDIAN_INDICES_DATA = [
    { name: 'SENSEX', exchange: 'BSE', lastTraded: 85348.05, change: 761.04, changePercent: 0.90, high: 85388.07, low: 84478.13, open: 84503.44 },
    { name: 'NIFTY 50', exchange: 'NSE', lastTraded: 26050.50, change: 150.25, changePercent: 0.58, high: 26100.00, low: 25900.00, open: 25950.00 },
    { name: 'NIFTY BANK', exchange: 'NSE', lastTraded: 58700.00, change: 250.00, changePercent: 0.43, high: 58800.00, low: 58500.00, open: 58600.00 }
];

export const GLOBAL_INDICES_DATA = [
    { name: 'DOW JONES', location: 'USA', lastTraded: 34500.00, change: 150.00, changePercent: 0.44, prevClose: 34350.00, date: '25 Nov' },
    { name: 'S&P 500', location: 'USA', lastTraded: 4450.00, change: 20.00, changePercent: 0.45, prevClose: 4430.00, date: '25 Nov' },
    { name: 'NASDAQ', location: 'USA', lastTraded: 13800.00, change: 100.00, changePercent: 0.73, prevClose: 13700.00, date: '25 Nov' },
    { name: 'DAX', location: 'Germany', lastTraded: 15600.00, change: 80.00, changePercent: 0.52, prevClose: 15520.00, date: '25 Nov' },
    { name: 'FTSE 100', location: 'UK', lastTraded: 7500.00, change: 30.00, changePercent: 0.40, prevClose: 7470.00, date: '25 Nov' }
];
