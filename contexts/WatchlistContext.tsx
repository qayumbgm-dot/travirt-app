
import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback, useMemo, useRef } from 'react';
import { Watchlist, WatchlistGroup, WatchlistSettings, Stock, DiscoverList } from '../types';
import { parseInstrumentKey } from '../utils/formatters';
import { watchlistApi, ApiWatchlist } from '../apiClient/watchlist.api';

export type ActiveView =
  | { type: 'watchlist'; id: number }
  | { type: 'discover'; list: DiscoverList };

interface WatchlistContextType {
    watchlists: Watchlist[];
    activeView: ActiveView;
    activeWatchlist: Watchlist | null;
    lastActiveStackView: ActiveView | null;
    loading: boolean;
    pinnedItems: string[];
    activeGroupIds: Record<number, string>;
    pinStock: (symbol: string, slot: number) => void;
    setActiveView: (view: ActiveView) => void;
    setActiveGroup: (watchlistId: number, groupId: string) => void;
    addWatchlist: (name: string) => void;
    removeWatchlist: (id: number) => void;
    updateWatchlistName: (id: number, name: string) => void;
    addStockToGroup: (watchlistId: number, groupId: string, symbolKey: string) => void;
    removeStockFromGroup: (watchlistId: number, groupId: string, symbolKey: string) => void;
    addWatchlistFromDiscover: (list: DiscoverList) => void;
    reorderStockInGroup: (watchlistId: number, groupId: string, startIndex: number, endIndex: number) => void;
    reorderGroups: (watchlistId: number, startIndex: number, endIndex: number) => void;
    toggleGroupCollapse: (watchlistId: number, groupId: string) => void;
    toggleGroupMaximize: (watchlistId: number, groupId: string) => void;
    updateGroup: (watchlistId: number, groupId: string, newName: string, newColor?: string) => void;
    addGroup: (watchlistId: number, groupName: string) => void;
    removeGroup: (watchlistId: number, groupId: string) => void;
    moveGroupToWatchlist: (watchlistId: number, groupId: string, targetWatchlistId: number) => void;
    updateGroupSymbols: (watchlistId: number, groupId: string, newSymbols: string[]) => void;
    updateWatchlistSettings: (watchlistId: number, newSettings: Partial<WatchlistSettings>) => void;
    sortAllAssetsInWatchlist: (watchlistId: number, sortBy: WatchlistSettings['sortBy'], marketData: Stock[]) => void;
    updateNote: (watchlistId: number, symbolKey: string, text: string) => void;
    deleteNote: (watchlistId: number, symbolKey: string) => void;
}

const WatchlistContext = createContext<WatchlistContextType | undefined>(undefined);

const defaultSettings: WatchlistSettings = {
  changeType: 'close',
  showOptions: {
    priceChange: true,
    priceChangePercent: true,
    priceDirection: true,
    holdings: false,
    notes: false,
    groupColors: true,
  },
  sortBy: 'LTP',
};

const initialWatchlistsData: Watchlist[] = [
  { id: 1, name: "1", groups: [{ id: 'default-1', name: 'Default', symbols: [], isCollapsed: false, isMaximized: false }], settings: defaultSettings, notes: {} },
  { id: 2, name: "2", groups: [{ id: 'default-2', name: 'Default', symbols: [], isCollapsed: false, isMaximized: false }], settings: defaultSettings, notes: {} },
  { id: 3, name: "3", groups: [{ id: 'default-3', name: 'Default', symbols: [], isCollapsed: false, isMaximized: false }], settings: defaultSettings, notes: {} },
  { id: 4, name: "4", groups: [{ id: 'default-4', name: 'Default', symbols: [], isCollapsed: false, isMaximized: false }], settings: defaultSettings, notes: {} },
  { id: 5, name: "5", groups: [{ id: 'default-5', name: 'Default', symbols: ["NSE:KOTAKBANK", "NSE:HDFCBANK", "NSE:BHARTIARTL", "NSE:EICHERMOT"], isCollapsed: false, isMaximized: false }], settings: defaultSettings, notes: {} },
  { id: 6, name: "6", groups: [{ id: 'default-6', name: 'Default', symbols: ["NSE:TATASTEEL", "NSE:TCS", "NSE:TECHM", "NSE:TITAN"], isCollapsed: false, isMaximized: false }], settings: defaultSettings, notes: {} },
  { id: 7, name: "7", groups: [{ id: 'default-7', name: 'Default', symbols: [], isCollapsed: false, isMaximized: false }], settings: defaultSettings, notes: {} },
];

// ─── API → frontend mappers ───────────────────────────────────────────────────

const apiToWatchlist = (api: ApiWatchlist, numericId: number): Watchlist => {
  const notes: Record<string, string> = {};
  const allSymbols = [...api.groups.flatMap((g) => g.symbols), ...api.ungrouped];
  allSymbols.forEach((s) => { if (s.notes) notes[`${s.exchange}:${s.symbol}`] = s.notes; });

  const groups: WatchlistGroup[] = [
    ...api.groups.map((g) => ({
      id: g.id,
      name: g.name,
      symbols: g.symbols.map((s) => `${s.exchange}:${s.symbol}`),
      isCollapsed: false,
      isMaximized: false,
      color: undefined,
    })),
    ...(api.ungrouped.length > 0
      ? [{
          id: `ungrouped-${api.id}`,
          name: 'Default',
          symbols: api.ungrouped.map((s) => `${s.exchange}:${s.symbol}`),
          isCollapsed: false,
          isMaximized: false,
        }]
      : [{ id: `default-${numericId}`, name: 'Default', symbols: [] as string[], isCollapsed: false, isMaximized: false }]),
  ];

  return { id: numericId, name: api.name, groups, settings: defaultSettings, notes };
};

export const WatchlistProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [watchlists, setWatchlists] = useState<Watchlist[]>([]);
    const [activeView, _setActiveView] = useState<ActiveView>({ type: 'watchlist', id: 6 });
    const [lastActiveStackView, setLastActiveStackView] = useState<ActiveView | null>(null);
    const [loading, setLoading] = useState(true);
    const [pinnedItems, setPinnedItems] = useState<string[]>(['NIFTY 50', 'NIFTY BANK']);
    const [activeGroupIds, setActiveGroupIds] = useState<Record<number, string>>({});
    const apiAvailable = useRef(false);

    // numericId ↔ UUID bridge (7 built-ins use their numeric id as string)
    const uuidMap = useRef<Map<number, string>>(new Map());
    // symbolId map: "watchlistNumericId:symbolKey" -> UUID from API
    const symbolIdMap = useRef<Map<string, string>>(new Map());
    // groupId local -> UUID
    const groupUuidMap = useRef<Map<string, string>>(new Map());

    // ── Load from API on mount ────────────────────────────────────────────────
    useEffect(() => {
        watchlistApi.getAll()
            .then((data) => {
                apiAvailable.current = true;
                if (data.length > 0) {
                    // Map API watchlists to numeric IDs starting at 8 (1-7 are built-ins)
                    const apiWatchlists = data.map((w, i) => {
                        const numId = i + 8;
                        uuidMap.current.set(numId, w.id);
                        // Register group UUIDs
                        w.groups.forEach((g) => groupUuidMap.current.set(g.id, g.id));
                        // Register symbol IDs
                        const allSyms = [...w.groups.flatMap((g) => g.symbols), ...w.ungrouped];
                        allSyms.forEach((s) => {
                            symbolIdMap.current.set(`${numId}:${s.exchange}:${s.symbol}`, s.id);
                        });
                        return apiToWatchlist(w, numId);
                    });
                    setWatchlists([...initialWatchlistsData, ...apiWatchlists]);
                    const groups: Record<number, string> = {};
                    [...initialWatchlistsData, ...apiWatchlists].forEach((w) => {
                        if (w.groups.length > 0) groups[w.id] = w.groups[0].id;
                    });
                    setActiveGroupIds(groups);
                } else {
                    setWatchlists(initialWatchlistsData);
                    const groups: Record<number, string> = {};
                    initialWatchlistsData.forEach((w) => {
                        if (w.groups.length > 0) groups[w.id] = w.groups[0].id;
                    });
                    setActiveGroupIds(groups);
                }
            })
            .catch(() => {
                // Backend offline — use defaults
                setWatchlists(initialWatchlistsData);
                const groups: Record<number, string> = {};
                initialWatchlistsData.forEach((w) => {
                    if (w.groups.length > 0) groups[w.id] = w.groups[0].id;
                });
                setActiveGroupIds(groups);
            })
            .finally(() => setLoading(false));
    }, []);

    useEffect(() => {
        const firstOtherList = watchlists.find((w) => w.id > 7);
        if (firstOtherList && !lastActiveStackView) {
            setLastActiveStackView({ type: 'watchlist', id: firstOtherList.id });
        }
    }, [watchlists, lastActiveStackView]);

    const setActiveView = useCallback((view: ActiveView) => {
        _setActiveView(view);
        if ((view.type === 'watchlist' && view.id > 7) || view.type === 'discover') {
            setLastActiveStackView(view);
        }
    }, []);

    const setActiveGroup = useCallback((watchlistId: number, groupId: string) => {
        setActiveGroupIds((prev) => ({ ...prev, [watchlistId]: groupId }));
    }, []);

    const pinStock = useCallback((symbol: string, slot: number) => {
        if (slot < 1 || slot > 2) return;
        setPinnedItems((prev) => { const n = [...prev]; n[slot - 1] = symbol; return n; });
    }, []);

    // ── Watchlist CRUD ────────────────────────────────────────────────────────
    const addWatchlist = useCallback((name: string) => {
        setWatchlists((prev) => {
            const nextId = prev.length > 0 ? Math.max(...prev.map((w) => w.id)) + 1 : 8;
            const newGroupId = `default-${nextId}`;
            const newWatchlist: Watchlist = {
                id: nextId,
                name: name || `Watchlist ${nextId}`,
                groups: [{ id: newGroupId, name: 'Default', symbols: [], isCollapsed: false, isMaximized: false }],
                settings: defaultSettings,
                notes: {},
            };
            setActiveGroupIds((p) => ({ ...p, [nextId]: newGroupId }));
            setActiveView({ type: 'watchlist', id: nextId });

            if (apiAvailable.current) {
                watchlistApi.create(newWatchlist.name).then((saved) => {
                    uuidMap.current.set(nextId, saved.id);
                }).catch(() => {});
            }

            return [...prev, newWatchlist];
        });
    }, [setActiveView]);

    const addWatchlistFromDiscover = useCallback((list: DiscoverList) => {
        setWatchlists((prev) => {
            const nextId = prev.length > 0 ? Math.max(...prev.map((w) => w.id)) + 1 : 8;
            const newGroupId = `default-${nextId}`;
            const newWatchlist: Watchlist = {
                id: nextId, name: list.name,
                groups: [{ id: newGroupId, name: 'Default', symbols: list.symbols, isCollapsed: false, isMaximized: false }],
                settings: defaultSettings, notes: {},
            };
            setActiveGroupIds((p) => ({ ...p, [nextId]: newGroupId }));
            setActiveView({ type: 'watchlist', id: nextId });

            if (apiAvailable.current) {
                watchlistApi.create(list.name).then(async (saved) => {
                    uuidMap.current.set(nextId, saved.id);
                    // Add symbols in background
                    for (const sym of list.symbols) {
                        const { symbol, exchange } = parseInstrumentKey(sym);
                        await watchlistApi.addSymbol(saved.id, symbol, exchange || 'NSE').catch(() => {});
                    }
                }).catch(() => {});
            }

            return [...prev, newWatchlist];
        });
    }, [setActiveView]);

    const removeWatchlist = useCallback((id: number) => {
        setWatchlists((prev) => {
            const newWatchlists = prev.filter((w) => w.id !== id);
            if (activeView.type === 'watchlist' && activeView.id === id) {
                const first = newWatchlists.find((w) => w.id <= 7) || newWatchlists[0];
                setActiveView({ type: 'watchlist', id: first ? first.id : 1 });
            }
            if (apiAvailable.current) {
                const uuid = uuidMap.current.get(id);
                if (uuid) watchlistApi.delete(uuid).catch(() => {});
            }
            return newWatchlists;
        });
    }, [activeView, setActiveView]);

    const updateWatchlistName = useCallback((id: number, name: string) => {
        setWatchlists((prev) => prev.map((w) => (w.id === id ? { ...w, name } : w)));
        if (apiAvailable.current) {
            const uuid = uuidMap.current.get(id);
            if (uuid) watchlistApi.rename(uuid, name).catch(() => {});
        }
    }, []);

    // ── Groups ────────────────────────────────────────────────────────────────
    const addGroup = useCallback((watchlistId: number, groupName: string) => {
        const newGroupId = `group-${watchlistId}-${Date.now()}`;
        setWatchlists((prev) => prev.map((w) => {
            if (w.id !== watchlistId) return w;
            const newGroup: WatchlistGroup = { id: newGroupId, name: groupName, symbols: [], isCollapsed: false, isMaximized: false };
            setActiveGroupIds((p) => ({ ...p, [watchlistId]: newGroupId }));
            return { ...w, groups: [...w.groups, newGroup] };
        }));

        if (apiAvailable.current) {
            const uuid = uuidMap.current.get(watchlistId);
            if (uuid) {
                watchlistApi.createGroup(uuid, groupName).then((saved) => {
                    groupUuidMap.current.set(newGroupId, saved.id);
                }).catch(() => {});
            }
        }
    }, []);

    const removeGroup = useCallback((watchlistId: number, groupId: string) => {
        setWatchlists((prev) => prev.map((w) => {
            if (w.id !== watchlistId) return w;
            return { ...w, groups: w.groups.filter((g) => g.id !== groupId) };
        }));
        if (apiAvailable.current) {
            const wUuid = uuidMap.current.get(watchlistId);
            const gUuid = groupUuidMap.current.get(groupId);
            if (wUuid && gUuid) watchlistApi.deleteGroup(wUuid, gUuid).catch(() => {});
        }
    }, []);

    const updateGroup = useCallback((watchlistId: number, groupId: string, newName: string, newColor?: string) => {
        setWatchlists((prev) => prev.map((w) => {
            if (w.id !== watchlistId) return w;
            return { ...w, groups: w.groups.map((g) => g.id === groupId ? { ...g, name: newName, color: newColor } : g) };
        }));
    }, []);

    const toggleGroupCollapse = useCallback((watchlistId: number, groupId: string) => {
        setWatchlists((prev) => prev.map((w) => {
            if (w.id !== watchlistId) return w;
            return { ...w, groups: w.groups.map((g) => g.id === groupId ? { ...g, isCollapsed: !g.isCollapsed } : g) };
        }));
    }, []);

    const toggleGroupMaximize = useCallback((watchlistId: number, groupId: string) => {
        setWatchlists((prev) => prev.map((w) => {
            if (w.id !== watchlistId) return w;
            return { ...w, groups: w.groups.map((g) => g.id === groupId ? { ...g, isMaximized: !g.isMaximized } : g) };
        }));
    }, []);

    const moveGroupToWatchlist = useCallback((watchlistId: number, groupId: string, targetWatchlistId: number) => {
        setWatchlists((prev) => {
            const src = prev.find((w) => w.id === watchlistId);
            const groupToMove = src?.groups.find((g) => g.id === groupId);
            if (!groupToMove) return prev;
            return prev.map((w) => {
                if (w.id === watchlistId) return { ...w, groups: w.groups.filter((g) => g.id !== groupId) };
                if (w.id === targetWatchlistId) return { ...w, groups: [...w.groups, groupToMove] };
                return w;
            });
        });
    }, []);

    // ── Symbols ───────────────────────────────────────────────────────────────
    const addStockToGroup = useCallback((watchlistId: number, groupId: string, symbolKey: string) => {
        setWatchlists((prev) => prev.map((w) => {
            if (w.id !== watchlistId) return w;
            return {
                ...w,
                groups: w.groups.map((g) => {
                    if (g.id === groupId && !g.symbols.includes(symbolKey)) return { ...g, symbols: [...g.symbols, symbolKey] };
                    return g;
                }),
            };
        }));

        if (apiAvailable.current) {
            const wUuid = uuidMap.current.get(watchlistId);
            if (wUuid) {
                const { symbol, exchange } = parseInstrumentKey(symbolKey);
                const gUuid = groupUuidMap.current.get(groupId);
                watchlistApi.addSymbol(wUuid, symbol, exchange || 'NSE', gUuid).then((saved) => {
                    symbolIdMap.current.set(`${watchlistId}:${symbolKey}`, saved.id);
                }).catch(() => {});
            }
        }
    }, []);

    const removeStockFromGroup = useCallback((watchlistId: number, groupId: string, symbolKey: string) => {
        setWatchlists((prev) => prev.map((w) => {
            if (w.id !== watchlistId) return w;
            return { ...w, groups: w.groups.map((g) => g.id === groupId ? { ...g, symbols: g.symbols.filter((s) => s !== symbolKey) } : g) };
        }));

        if (apiAvailable.current) {
            const wUuid = uuidMap.current.get(watchlistId);
            const sUuid = symbolIdMap.current.get(`${watchlistId}:${symbolKey}`);
            if (wUuid && sUuid) watchlistApi.removeSymbol(wUuid, sUuid).catch(() => {});
        }
    }, []);

    // ── Reorder (local only — sort order persistence is a future enhancement) ─
    const reorderStockInGroup = useCallback((watchlistId: number, groupId: string, startIndex: number, endIndex: number) => {
        setWatchlists((prev) => prev.map((w) => {
            if (w.id !== watchlistId) return w;
            return {
                ...w,
                groups: w.groups.map((g) => {
                    if (g.id !== groupId) return g;
                    const syms = Array.from(g.symbols);
                    const [removed] = syms.splice(startIndex, 1);
                    syms.splice(endIndex, 0, removed);
                    return { ...g, symbols: syms };
                }),
            };
        }));
    }, []);

    const reorderGroups = useCallback((watchlistId: number, startIndex: number, endIndex: number) => {
        setWatchlists((prev) => prev.map((w) => {
            if (w.id !== watchlistId) return w;
            const groups = Array.from(w.groups);
            const [removed] = groups.splice(startIndex, 1);
            groups.splice(endIndex, 0, removed);
            return { ...w, groups };
        }));
    }, []);

    const updateGroupSymbols = useCallback((watchlistId: number, groupId: string, newSymbols: string[]) => {
        setWatchlists((prev) => prev.map((w) => {
            if (w.id !== watchlistId) return w;
            return { ...w, groups: w.groups.map((g) => g.id === groupId ? { ...g, symbols: newSymbols } : g) };
        }));
    }, []);

    // ── Settings ──────────────────────────────────────────────────────────────
    const updateWatchlistSettings = useCallback((watchlistId: number, newSettings: Partial<WatchlistSettings>) => {
        setWatchlists((prev) => prev.map((w) => w.id === watchlistId ? { ...w, settings: { ...w.settings, ...newSettings } } : w));
    }, []);

    const sortAllAssetsInWatchlist = useCallback((watchlistId: number, sortBy: WatchlistSettings['sortBy'], mktData: Stock[]) => {
        setWatchlists((prev) => prev.map((w) => {
            if (w.id !== watchlistId) return w;
            const symbolToGroupMap = new Map<string, string>();
            w.groups.forEach((g) => g.symbols.forEach((s) => symbolToGroupMap.set(s, g.id)));
            const allSymbolKeys = Array.from(symbolToGroupMap.keys());
            const allStocks = allSymbolKeys.map((key) => {
                const { symbol, exchange } = parseInstrumentKey(key);
                const found = mktData.find((s) => s.symbol === symbol && (!exchange || s.exchange === exchange))
                    ?? mktData.find((s) => s.symbol === symbol);
                return { key, stock: found };
            }).filter((item): item is { key: string; stock: Stock } => !!item.stock);

            allStocks.sort((a, b) => {
                const aRef = w.settings.changeType === 'open' ? a.stock.open : a.stock.prevClose;
                const bRef = w.settings.changeType === 'open' ? b.stock.open : b.stock.prevClose;
                switch (sortBy) {
                    case '%': return ((b.stock.ltp - bRef) / bRef) - ((a.stock.ltp - aRef) / aRef);
                    case 'LTP': return b.stock.ltp - a.stock.ltp;
                    case 'A-Z': return a.stock.symbol.localeCompare(b.stock.symbol);
                    case 'EXCH': return a.stock.exchange.localeCompare(b.stock.exchange);
                    default: return 0;
                }
            });

            const groupMap = new Map<string, WatchlistGroup>(w.groups.map((g) => [g.id, { ...g, symbols: [] }]));
            allStocks.forEach(({ key }) => {
                const gId = symbolToGroupMap.get(key);
                if (gId) groupMap.get(gId)?.symbols.push(key);
            });
            return { ...w, groups: Array.from(groupMap.values()) };
        }));
    }, []);

    // ── Notes ─────────────────────────────────────────────────────────────────
    const updateNote = useCallback((watchlistId: number, symbolKey: string, text: string) => {
        setWatchlists((prev) => prev.map((w) => w.id === watchlistId ? { ...w, notes: { ...w.notes, [symbolKey]: text } } : w));
        if (apiAvailable.current) {
            const wUuid = uuidMap.current.get(watchlistId);
            const sUuid = symbolIdMap.current.get(`${watchlistId}:${symbolKey}`);
            if (wUuid && sUuid) watchlistApi.setNote(wUuid, sUuid, text).catch(() => {});
        }
    }, []);

    const deleteNote = useCallback((watchlistId: number, symbolKey: string) => {
        setWatchlists((prev) => prev.map((w) => {
            if (w.id !== watchlistId) return w;
            const notes = { ...w.notes };
            delete notes[symbolKey];
            return { ...w, notes };
        }));
        if (apiAvailable.current) {
            const wUuid = uuidMap.current.get(watchlistId);
            const sUuid = symbolIdMap.current.get(`${watchlistId}:${symbolKey}`);
            if (wUuid && sUuid) watchlistApi.setNote(wUuid, sUuid, '').catch(() => {});
        }
    }, []);

    const activeWatchlist = useMemo(() => {
        if (activeView.type === 'watchlist') return watchlists.find((w) => w.id === activeView.id) || null;
        return null;
    }, [activeView, watchlists]);

    const value: WatchlistContextType = {
        watchlists, activeView, activeWatchlist, lastActiveStackView, loading, pinnedItems, activeGroupIds,
        pinStock, setActiveView, setActiveGroup,
        addWatchlist, removeWatchlist, updateWatchlistName, addWatchlistFromDiscover,
        addStockToGroup, removeStockFromGroup,
        reorderStockInGroup, reorderGroups,
        toggleGroupCollapse, toggleGroupMaximize, updateGroup, addGroup, removeGroup,
        moveGroupToWatchlist, updateGroupSymbols, updateWatchlistSettings, sortAllAssetsInWatchlist,
        updateNote, deleteNote,
    };

    return <WatchlistContext.Provider value={value}>{children}</WatchlistContext.Provider>;
};

export const useWatchlist = () => {
    const context = useContext(WatchlistContext);
    if (context === undefined) throw new Error('useWatchlist must be used within a WatchlistProvider');
    return context;
};
