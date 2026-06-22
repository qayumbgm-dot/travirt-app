import { apiClient } from './client';
import { Stock, InstrumentType } from '../types';

export interface InstrumentResult {
  id: number;
  token: string;
  symbol: string;
  name: string;
  exchange: string;
  segment: string;
  instrument_type: string;
  expiry: string | null;
  strike: number | null;
  lot_size: number;
  tick_size: number;
  isin: string | null;
}

export const instrumentResultToStock = (r: InstrumentResult): Stock => {
  let instrumentType = InstrumentType.EQUITY;
  if (r.instrument_type === 'CE' || r.instrument_type === 'PE') instrumentType = InstrumentType.OPTION;
  else if (r.instrument_type === 'FUT') instrumentType = InstrumentType.FUTURE;

  return {
    symbol: r.symbol,
    name: r.name,
    exchange: r.exchange,
    instrumentType,
    ltp: 0,
    open: 0,
    high: 0,
    low: 0,
    prevClose: 0,
    change: 0,
    changePercent: 0,
    optionType: r.instrument_type === 'CE' ? 'CE' : r.instrument_type === 'PE' ? 'PE' : undefined,
    strikePrice: r.strike ?? undefined,
    expiryDate: r.expiry ?? undefined,
  };
};

export const instrumentsApi = {
  search: async (q: string, exchange?: string, limit = 20): Promise<InstrumentResult[]> => {
    const params: Record<string, string> = { q, limit: String(limit) };
    if (exchange) params.exchange = exchange;
    const { data } = await apiClient.get<InstrumentResult[]>('/instruments/search', { params });
    return data;
  },
};
