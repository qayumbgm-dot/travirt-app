import { apiClient } from './client';

export const fundsApi = {
  addInr: (amount: number) =>
    apiClient.post<{ inrBalance: number }>('/funds/add-inr', { amount }).then((r) => r.data),

  buyNxo: (amount: number) =>
    apiClient
      .post<{ inr_balance: number; nxo_balance: number }>('/funds/buy-nxo', { amount })
      .then((r) => r.data),

  convertNxoToVirtual: (amount: number) =>
    apiClient
      .post<{ nxo_balance: number; virtual_balance: number }>('/funds/convert-nxo', { amount })
      .then((r) => r.data),
};
