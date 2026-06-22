
import React, { useState, useMemo, useRef, useEffect, useLayoutEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Stock, WatchlistGroup, TransactionType, OrderType, WatchlistSettings, SortByType, Watchlist, InstrumentType } from '../../types';
import { useWatchlist } from '../../contexts/WatchlistContext';
import { usePortfolio } from '../../contexts/PortfolioContext';
import { useToast } from '../../contexts/ToastContext';
import { MoreOptionsMenu } from './MoreOptionsMenu';
import { formatCurrency, getInstrumentKey, parseInstrumentKey } from '../../utils/formatters';
import { instrumentsApi, instrumentResultToStock } from '../../apiClient/instruments.api';

// Modular Imports
import Tooltip from '../common/Tooltip';
import StockRow from './watchlist/StockRow';
import WatchlistSettingsPanel from './watchlist/WatchlistSettingsPanel';
import MarketDepthPanel from './watchlist/MarketDepthPanel';
import NotesEditor from './watchlist/NotesEditor';
import OptionChainPanel from './OptionChainPanel';

export type SidebarMode = 'watchlist' | 'predefined' | 'optionChain';

interface WatchlistPanelProps {
    mode: SidebarMode;
    activeList: Watchlist;
    isDiscover: boolean;
    selectedStock: Stock | null;
    onStockSelect: (stock: Stock) => void;
    onOrderAction: (action: { stock: Stock, type: TransactionType, price?: number, orderType?: OrderType }) => void;
    onCreateGTT: (symbol: string) => void;
    onCreateAlert: (symbol: string) => void;
    onShowMarketDepthModal: (symbol: string) => void;
}

// ... (Predefined data and helper functions remain same) ...
const INDICES_LIST = [
  'Major Indices',
  'Global Indices',
  'Nifty 50',
  'BSE Sensex',
  'Nifty Next 50',
  'Bank Nifty',
  // ... (Full list omitted for brevity, keeping existing)
  'Nifty LargeMidcap 250 (Healthcare)'
];

const FNO_LIST = [
  'NSE F&O Stocks',
  'Top Gainers',
  'Top Losers',
  'Most Active',
  '52 Week High',
  '52 Week Low'
];

const CONSTITUENTS_MAP: Record<string, string[]> = {
  'Major Indices': ['NIFTY 50', 'NIFTY NEXT 50', 'NIFTY BANK', 'SENSEX'],
  'Global Indices': ['US30', 'US500', 'DAX', 'FTSE', 'NIKKEI'],
  'Nifty 50': ['RELIANCE', 'TCS', 'HDFCBANK', 'INFY', 'ICICIBANK', 'SBIN', 'BHARTIARTL', 'ITC', 'LT', 'AXISBANK'],
  'BSE Sensex': ['RELIANCE', 'TCS', 'HDFCBANK', 'ICICIBANK', 'INFY', 'ITC', 'SBIN', 'BHARTIARTL', 'LT'],
  'NSE F&O Stocks': ['RELIANCE', 'TCS', 'HDFCBANK', 'SBIN', 'INFY'],
  'default': ['RELIANCE', 'TCS', 'HDFCBANK', 'INFY', 'ICICIBANK']
};

const PredefinedListPanel: React.FC<{
    marketData: Stock[];
    onStockSelect: (stock: Stock) => void;
    onOrderAction: (action: { stock: Stock, type: TransactionType }) => void;
    onMoreClick: (symbol: string, e: React.MouseEvent<HTMLButtonElement>) => void;
    activeSettings: WatchlistSettings;
    selectedStock: Stock | null;
}> = ({ marketData, onStockSelect, onOrderAction, onMoreClick, activeSettings, selectedStock }) => {
    
    const [selectedCategory, setSelectedCategory] = useState<'INDICES' | 'FNO'>('INDICES');
    const [selectedIndex, setSelectedIndex] = useState<string>('Major Indices');
    const [selectedFnoList, setSelectedFnoList] = useState<string>('NSE F&O Stocks');

    const currentListName = selectedCategory === 'INDICES' ? selectedIndex : selectedFnoList;

    const stocks = useMemo(() => {
        const constituentSymbols = CONSTITUENTS_MAP[currentListName] || CONSTITUENTS_MAP['default'];
        
        return constituentSymbols.map(symbol => {
            const { symbol: parsedSymbol, exchange } = parseInstrumentKey(symbol);
            // Try matching composite first (if list uses composite keys), otherwise just symbol
            let found = marketData.find(s => s.symbol === parsedSymbol && (!exchange || s.exchange === exchange));
            if (!found && !exchange) found = marketData.find(s => s.symbol === parsedSymbol);
            
            if (found) return found;
            
            return {
                symbol: parsedSymbol,
                name: parsedSymbol,
                exchange: exchange || 'NSE',
                instrumentType: InstrumentType.EQUITY,
                ltp: 0,
                change: 0,
                changePercent: 0,
                open: 0, high: 0, low: 0, prevClose: 0,
                marketDepth: { bids: [], asks: [] }
            } as Stock;
        });
    }, [currentListName, marketData]);
    
    return (
        <div className="flex flex-col h-full bg-base">
            <div className="p-2 border-b border-overlay bg-surface shadow-sm z-10">
                <div className="flex flex-row gap-2">
                    <div className="flex-1 min-w-0">
                        <label className="text-[9px] uppercase text-muted font-bold block mb-0.5 tracking-wider truncate">Indices</label>
                        <div className="relative group">
                            <select 
                                value={selectedCategory === 'INDICES' ? selectedIndex : ''}
                                onChange={(e) => {
                                    setSelectedCategory('INDICES');
                                    setSelectedIndex(e.target.value);
                                }}
                                className={`w-full appearance-none bg-base border rounded px-2 py-1.5 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer transition-colors truncate pr-6 ${
                                    selectedCategory === 'INDICES' 
                                    ? 'border-primary text-text-primary shadow-[0_0_8px_rgba(0,123,255,0.15)]' 
                                    : 'border-gray-700 text-muted hover:border-gray-500'
                                }`}
                            >
                                <option value="" disabled>Select Index</option>
                                {INDICES_LIST.map(idx => <option key={idx} value={idx}>{idx}</option>)}
                            </select>
                            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-1.5 text-muted group-hover:text-text-primary bg-base/50 rounded-r">
                                <i className="fas fa-chevron-down text-[9px]"></i>
                            </div>
                        </div>
                    </div>

                    <div className="flex-1 min-w-0">
                        <label className="text-[9px] uppercase text-muted font-bold block mb-0.5 tracking-wider truncate">F&O Stocks</label>
                        <div className="relative group">
                            <select 
                                value={selectedCategory === 'FNO' ? selectedFnoList : ''}
                                onChange={(e) => {
                                    setSelectedCategory('FNO');
                                    setSelectedFnoList(e.target.value);
                                }}
                                className={`w-full appearance-none bg-base border rounded px-2 py-1.5 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer transition-colors truncate pr-6 ${
                                    selectedCategory === 'FNO' 
                                    ? 'border-primary text-text-primary shadow-[0_0_8px_rgba(0,123,255,0.15)]' 
                                    : 'border-gray-700 text-muted hover:border-gray-500'
                                }`}
                            >
                                <option value="" disabled>Select F&O List</option>
                                {FNO_LIST.map(item => <option key={item} value={item}>{item}</option>)}
                            </select>
                            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-1.5 text-muted group-hover:text-text-primary bg-base/50 rounded-r">
                                <i className="fas fa-chevron-down text-[9px]"></i>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="bg-overlay/50 px-3 py-1.5 text-[10px] font-bold text-muted uppercase tracking-wider flex justify-between items-center shrink-0 border-b border-overlay">
                <span>Constituents</span>
                <div className="flex items-center gap-2">
                    <span className="text-[9px] bg-primary/20 px-1.5 py-0.5 rounded border border-primary/30 text-primary truncate max-w-[100px]">
                        {currentListName}
                    </span>
                    <span className="text-text-secondary">{stocks.length} Items</span>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-1.5">
                {stocks.map((stock, index) => (
                    <div key={`${stock.exchange}:${stock.symbol}`} className="hover:bg-overlay/30 rounded-md transition-colors mb-0.5 border border-transparent hover:border-overlay/50">
                        <StockRow
                            stock={stock}
                            settings={activeSettings}
                            isDiscover={false}
                            isPredefined={true}
                            hasNote={false}
                            onSelect={() => onStockSelect(stock)}
                            onOrder={(type) => onOrderAction({ stock, type })}
                            onRemove={() => {}}
                            onDragStart={() => {}}
                            onDragEnter={() => {}}
                            onDragEnd={() => {}}
                            onMouseEnter={() => {}}
                            onMouseLeave={() => {}}
                            isExpanded={false}
                            onDepthClick={() => {}}
                            onMoreClick={onMoreClick}
                        />
                    </div>
                ))}
            </div>
        </div>
    );
};

const SidebarOptionChainPanel: React.FC<WatchlistPanelProps> = ({
    selectedStock,
    onStockSelect,
    onOrderAction,
    onCreateGTT,
    onCreateAlert,
    onShowMarketDepthModal,
}) => {
    const { showToast } = useToast();
    const { addStockToGroup, activeGroupIds, watchlists } = useWatchlist();

    if (!selectedStock) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-center p-6 text-muted">
                <i className="fas fa-layer-group text-4xl mb-3 opacity-30"></i>
                <p className="font-semibold text-text-primary text-sm">No instrument selected</p>
                <p className="text-xs mt-1 text-muted">Select a stock from the Watchlist tab to view its option chain.</p>
            </div>
        );
    }

    const handleAddToWatchlist = (stock: Stock) => {
        const watchlist = watchlists.find(w => w.id === 1) || watchlists[0];
        if (!watchlist) return;
        const targetGroupId = activeGroupIds[watchlist.id] || watchlist.groups[0]?.id;
        if (targetGroupId) {
            addStockToGroup(watchlist.id, targetGroupId, getInstrumentKey(stock));
            showToast(`${stock.symbol} added to watchlist.`, 'success');
        }
    };

    const underlyingSymbol =
        selectedStock.instrumentType === InstrumentType.FUTURE ||
        selectedStock.instrumentType === InstrumentType.OPTION
            ? (selectedStock.underlying ?? selectedStock.symbol)
            : selectedStock.symbol;

    return (
        <OptionChainPanel
            underlyingSymbol={underlyingSymbol}
            underlyingLtp={selectedStock.ltp}
            exchange={selectedStock.exchange}
            onOrderAction={onOrderAction}
            onAddToWatchlist={handleAddToWatchlist}
            onChartSelect={onStockSelect}
            onCreateGTT={onCreateGTT}
            onCreateAlert={onCreateAlert}
            onShowDepth={onShowMarketDepthModal}
        />
    );
};

const NewGroupForm: React.FC<{ onCancel: () => void; onCreate: (name: string) => void; }> = ({ onCancel, onCreate }) => {
    const [name, setName] = useState('');
    const handleCreateClick = (e: React.MouseEvent) => { e.preventDefault(); if (name.trim()) onCreate(name.trim()); };
    return <div className="p-2 border bg-base"><input value={name} onChange={e=>setName(e.target.value)} /><button onClick={handleCreateClick}>Create</button><button onClick={onCancel}>Cancel</button></div>;
};

const PredefinedWatchlistWrapper: React.FC<WatchlistPanelProps> = ({ activeList, onStockSelect, onOrderAction, onCreateGTT, onCreateAlert, onShowMarketDepthModal, selectedStock }) => {
    const { marketData } = usePortfolio();
    const { pinStock } = useWatchlist();
    const [activeMoreMenu, setActiveMoreMenu] = useState<{ symbol: string; triggerEl: HTMLElement } | null>(null);

    const handleMoreClick = (symbol: string, event: React.MouseEvent<HTMLButtonElement>) => {
        const target = event.currentTarget;
        setActiveMoreMenu(prev => prev?.symbol === symbol ? null : { symbol, triggerEl: target });
    };

    return (
        <div className="flex flex-col h-full">
            <PredefinedListPanel 
                marketData={marketData} 
                onStockSelect={onStockSelect} 
                onOrderAction={(action) => onOrderAction({ ...action, orderType: OrderType.LIMIT })}
                activeSettings={activeList.settings}
                onMoreClick={handleMoreClick}
                selectedStock={selectedStock}
            />
             {activeMoreMenu && (
                 <MoreOptionsMenu
                    stock={marketData.find(s => s.symbol === activeMoreMenu.symbol)!}
                    triggerEl={activeMoreMenu.triggerEl}
                    onClose={() => setActiveMoreMenu(null)}
                    onPin={pinStock}
                    onCreateGTT={() => onCreateGTT(activeMoreMenu.symbol)}
                    onCreateAlert={() => onCreateAlert(activeMoreMenu.symbol)}
                    onShowNotes={() => {}}
                    onShowMarketDepthModal={() => onShowMarketDepthModal(activeMoreMenu.symbol)}
                />
            )}
        </div>
    );
};

// Main Watchlist Wrapper with Composite Key Logic
const StandardWatchlistWrapper: React.FC<WatchlistPanelProps> = ({ activeList, isDiscover, selectedStock, onStockSelect, onOrderAction, onCreateGTT, onCreateAlert, onShowMarketDepthModal }) => {
    const { showToast } = useToast();
    const [query, setQuery] = useState('');
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [isCreatingGroup, setIsCreatingGroup] = useState(false);
    const [hoveredStockInfo, setHoveredStockInfo] = useState<{ stock: Stock, groupId: string } | null>(null);
    const [expandedSymbolKey, setExpandedSymbolKey] = useState<string | null>(null);
    const [notesOpenForSymbolKey, setNotesOpenForSymbolKey] = useState<string | null>(null);
    const [activeMoreMenu, setActiveMoreMenu] = useState<{ stock: Stock; triggerEl: HTMLElement } | null>(null);
    const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
    const [draggingType, setDraggingType] = useState<'stock' | 'group' | null>(null);

    const [activeGroupMenu, setActiveGroupMenu] = useState<string | null>(null);

    const { addStockToGroup, removeStockFromGroup, reorderStockInGroup, reorderGroups, toggleGroupCollapse, toggleGroupMaximize, updateGroup, addGroup, pinStock, removeGroup, activeGroupIds, setActiveGroup, updateWatchlistSettings, sortAllAssetsInWatchlist, addWatchlistFromDiscover } = useWatchlist();
    const { marketData, loading: marketLoading, portfolio, addInstruments } = usePortfolio();
    
    const activeGroupId = activeGroupIds[activeList.id] || (activeList.groups.length > 0 ? activeList.groups[0].id : null);

    const handleMoreClick = (stock: Stock, event: React.MouseEvent<HTMLButtonElement>) => {
        const target = event.currentTarget;
        setActiveMoreMenu(prev => prev?.stock.symbol === stock.symbol && prev.stock.exchange === stock.exchange ? null : { stock, triggerEl: target });
    };

    const holdingsMap = useMemo(() => {
        const map = new Map<string, number>();
        portfolio.positions.forEach(p => map.set(getInstrumentKey({symbol: p.symbol, exchange: p.exchange}), p.quantity));
        return map;
    }, [portfolio.positions]);

    // Refs
    const panelRef = useRef<HTMLDivElement>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);
    const searchContainerRef = useRef<HTMLDivElement>(null);
    const settingsPanelRef = useRef<HTMLDivElement>(null);
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const searchResultsRef = useRef<HTMLDivElement>(null);
    const groupMenuRef = useRef<HTMLDivElement>(null);
    const dragItem = useRef<{ group: string; index: number } | null>(null);
    const dragOverItem = useRef<{ group: string; index: number } | null>(null);
    const dragGroupIndex = useRef<number | null>(null);
    const dragOverGroupIndex = useRef<number | null>(null);
    
    const handlePriceClickForOrder = (stock: Stock, price: number, type: TransactionType) => {
        onOrderAction({ stock, type, price, orderType: OrderType.LIMIT });
    };
    
    // Drag Handlers
    const handleStockDragStart = (e: React.DragEvent, index: number, groupId: string) => {
        dragItem.current = { group: groupId, index };
        setDraggingType('stock');
    };
    const handleStockDragEnter = (e: React.DragEvent, index: number, groupId: string) => {
        if (draggingType !== 'stock') return;
        dragOverItem.current = { group: groupId, index };
    };
    const handleStockDragEnd = () => {
        if (draggingType !== 'stock') return;
        if (dragItem.current && dragOverItem.current && dragItem.current.group === dragOverItem.current.group) {
            reorderStockInGroup(activeList.id, dragItem.current.group, dragItem.current.index, dragOverItem.current.index);
        }
        dragItem.current = null; dragOverItem.current = null; setDraggingType(null);
    };
    const handleGroupDragStart = (e: React.DragEvent, index: number) => {
        e.stopPropagation(); dragGroupIndex.current = index; setDraggingType('group');
    };
    const handleGroupDragEnter = (e: React.DragEvent, index: number) => {
        if (draggingType !== 'group') return; dragOverGroupIndex.current = index;
    };
    const handleGroupDragEnd = () => {
        if (draggingType !== 'group') return;
        if (dragGroupIndex.current !== null && dragOverGroupIndex.current !== null && dragGroupIndex.current !== dragOverGroupIndex.current) {
            reorderGroups(activeList.id, dragGroupIndex.current, dragOverGroupIndex.current);
        }
        dragGroupIndex.current = null; dragOverGroupIndex.current = null; setDraggingType(null);
    };

    // Close logic
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            // Clicked completely outside BOTH input AND results dropdown → close results
            const clickedInsideInput = searchContainerRef.current?.contains(event.target as Node);
            const clickedInsideResults = searchResultsRef.current?.contains(event.target as Node);

            if (!clickedInsideInput && !clickedInsideResults) {
                setQuery(''); // this closes the dropdown
            }

            // Group menu close (unchanged)
            if (groupMenuRef.current && !groupMenuRef.current.contains(event.target as Node)) {
                setActiveGroupMenu(null);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        if (!activeMoreMenu) return;
        const handleOutside = (e: MouseEvent) => {
            const inMenu = (e.target as Element)?.closest('[data-more-menu-container]');
            const onTrigger = activeMoreMenu.triggerEl.contains(e.target as Node);
            if (!inMenu && !onTrigger) setActiveMoreMenu(null);
        };
        document.addEventListener('mousedown', handleOutside, true);
        return () => document.removeEventListener('mousedown', handleOutside, true);
    }, [activeMoreMenu]);

    // Derived Data
    const watchlistKeys = useMemo(() => new Set(activeList.groups.flatMap(g => g.symbols)), [activeList]);

    const [searchResults, setSearchResults] = useState<Stock[]>([]);
    const [searchLoading, setSearchLoading] = useState(false);

    useEffect(() => {
        if (!query || query.length < 1 || isDiscover) {
            setSearchResults([]);
            return;
        }
        setSearchLoading(true);
        const timer = setTimeout(async () => {
            try {
                const results = await instrumentsApi.search(query, undefined, 30);
                const stocks = results.map(instrumentResultToStock);
                addInstruments(stocks);
                setSearchResults(stocks.filter(s => !watchlistKeys.has(getInstrumentKey(s))));
            } catch {
                setSearchResults([]);
            } finally {
                setSearchLoading(false);
            }
        }, 300);
        return () => clearTimeout(timer);
    }, [query, isDiscover, watchlistKeys, addInstruments]);
    
    const scrollToTop = () => scrollContainerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    const scrollToBottom = () => scrollContainerRef.current?.scrollTo({ top: scrollContainerRef.current.scrollHeight, behavior: 'smooth' });

    const handleCreateGroup = (name: string) => { addGroup(activeList.id, name); setIsCreatingGroup(false); };
    
    const handleToggleNotes = (key: string) => {
        setNotesOpenForSymbolKey(prev => (prev === key ? null : key));
        setExpandedSymbolKey(null);
    };

    const allSymbolsInActiveWl = activeList.groups.flatMap(g => g.symbols) || [];
    const totalStocks = allSymbolsInActiveWl.length;

    if (marketLoading) return <p className="text-muted p-4 text-center">Loading...</p>;

    return (
        <div ref={panelRef} className="flex flex-col h-full">
            <div className="shrink-0">
                <div className="p-3 border-b border-overlay">
                    <div className="relative z-30" ref={searchContainerRef}>
                        <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-muted z-10"></i>
                        {!isDiscover &&
                            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-muted z-10 flex items-center gap-2">
                                <div className="text-xs border border-gray-600 rounded px-1.5 py-0.5">Ctrl + K</div>
                                <Tooltip title="Settings">
                                    <button onClick={() => setIsSettingsOpen(prev => !prev)} className={`text-muted hover:text-text-primary ${isSettingsOpen ? 'text-primary' : ''}`}>
                                        <i className="fas fa-sliders-h"></i>
                                    </button>
                                </Tooltip>
                            </div>
                        }
                        <input
                            ref={searchInputRef}
                            type="text"
                            placeholder="Search eg: infy bse, nifty fut, index fund, etc"
                            value={query}
                            onChange={(e) => {
                                setQuery(e.target.value);
                                if(isSettingsOpen) setIsSettingsOpen(false);
                            }}
                            onFocus={() => { if(isSettingsOpen) setIsSettingsOpen(false); }}
                            className="w-full bg-base border border-gray-600 rounded-md py-2 pl-10 pr-28 text-text-primary focus:ring-1 focus:ring-primary focus:border-primary"
                            autoComplete="off"
                        />
                        
                        {query && !isDiscover && (
                            <div ref={searchResultsRef} className="absolute top-full left-0 right-0 mt-1 bg-base border border-overlay rounded-md shadow-lg z-20 max-h-96 overflow-y-auto custom-scrollbar">
                                {searchLoading ? (
                                    <p className="p-3 text-sm text-center text-muted">
                                        <i className="fas fa-circle-notch fa-spin mr-2"></i>Searching 1,46,623 instruments...
                                    </p>
                                ) : searchResults.length > 0 ? (
                                    searchResults.map(stock => (
                                        <div key={getInstrumentKey(stock)} className="p-2 hover:bg-overlay flex items-center justify-between">
                                            <div className="flex items-center gap-2 flex-1 min-w-0">
                                                <div className="min-w-0">
                                                    <p className="font-semibold text-sm truncate">{stock.symbol}</p>
                                                    <p className="text-xs text-muted truncate">{stock.name}</p>
                                                </div>
                                                <div className="flex items-center gap-1 shrink-0">
                                                    <span className="text-[10px] bg-primary/20 text-primary px-1 rounded font-bold">{stock.exchange}</span>
                                                    {stock.instrumentType && stock.instrumentType !== InstrumentType.EQUITY && (
                                                        <span className="text-[10px] bg-overlay text-muted px-1 rounded font-bold uppercase">
                                                            {stock.instrumentType === InstrumentType.OPTION ? (stock.optionType ?? 'OPT') : stock.instrumentType}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            <Tooltip title={activeGroupId ? `Add to '${activeList.groups.find(g => g.id === activeGroupId)?.name}'` : 'Select a group first'}>
                                                <div>
                                                    <button
                                                        onClick={() => {
                                                            if (activeGroupId) {
                                                                addStockToGroup(activeList.id, activeGroupId, getInstrumentKey(stock));
                                                                setQuery('');
                                                            }
                                                        }}
                                                        disabled={!activeGroupId}
                                                        className="text-primary text-xl hover:text-primary-focus disabled:text-muted disabled:cursor-not-allowed ml-2"
                                                    >
                                                        <i className="fas fa-plus-circle"></i>
                                                    </button>
                                                </div>
                                            </Tooltip>
                                        </div>
                                    ))
                                ) : (
                                    <p className="p-3 text-sm text-center text-muted">No results found.</p>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                <div className="p-2">
                    <div className="flex justify-between items-center px-1 relative z-20">
                        <div className="flex items-center gap-2">
                             <p className="text-text-primary">{activeList.name} <span className="text-sm text-muted">({totalStocks} / 250)</span></p>
                             {!isDiscover &&
                             <>
                                 <Tooltip title="Scroll to bottom">
                                    <button onClick={scrollToBottom} className="text-text-secondary text-sm hover:text-text-primary leading-none">↓</button>
                                 </Tooltip>
                                 <Tooltip title="Scroll to top">
                                     <button onClick={scrollToTop} className="text-text-secondary text-sm hover:text-text-primary leading-none">↑</button>
                                 </Tooltip>
                             </>
                             }
                        </div>
                        {isDiscover ? (
                            <button onClick={() => addWatchlistFromDiscover({ name: activeList.name, symbols: allSymbolsInActiveWl })} className="text-sm text-primary hover:underline font-semibold">+ Add to my lists</button>
                        ) : (
                            <Tooltip title="Create a group">
                                <button onClick={() => setIsCreatingGroup(!isCreatingGroup)} className="text-sm text-primary hover:underline font-semibold">+ New group</button>
                            </Tooltip>
                        )}
                    </div>
                     {isCreatingGroup && <NewGroupForm onCreate={handleCreateGroup} onCancel={() => setIsCreatingGroup(false)} />}
                     {isSettingsOpen && !isDiscover && (
                        <div ref={settingsPanelRef}>
                            <WatchlistSettingsPanel 
                                settings={activeList.settings}
                                onSettingsChange={(newSettings) => updateWatchlistSettings(activeList.id, newSettings)}
                                onSort={(sortBy) => sortAllAssetsInWatchlist(activeList.id, sortBy, marketData)}
                            />
                        </div>
                    )}
                </div>
            </div>
            
            <div className="flex-1 overflow-y-auto custom-scrollbar p-2 pt-0 min-h-0" ref={scrollContainerRef}>
                {allSymbolsInActiveWl.length === 0 && !query && !isCreatingGroup && !isDiscover ? (
                    <div className="flex flex-col items-center justify-center text-center text-muted p-4 py-10">
                        <i className="fas fa-layer-group text-5xl text-gray-500 mb-4"></i>
                        <p className="text-text-secondary mb-6">You don't have any stocks in your watchlist.</p>
                        <button 
                            onClick={() => searchInputRef.current?.focus()}
                            className="bg-primary hover:bg-primary-focus text-white font-semibold py-2 px-6 rounded-md text-sm transition-colors">
                            Add a stock
                        </button>
                    </div>
                ) : (
                    activeList.groups.map((group, groupIndex) => {
                        const isEditing = editingGroupId === group.id;
                        return (
                        <div 
                            key={group.id} 
                            className={`mb-1 rounded-md transition-colors ${!isDiscover && activeGroupId === group.id ? 'bg-primary/10' : ''}`} 
                            style={activeList.settings.showOptions.groupColors && group.color ? { borderLeft: `3px solid ${group.color}` } : {}}
                            onDragEnter={(e) => handleGroupDragEnter(e, groupIndex)}
                            onDragOver={(e) => e.preventDefault()}
                        >
                            <div 
                                className={`flex justify-between items-center px-2.5 py-2 sticky top-0 bg-surface z-10 rounded-t-md ${!isDiscover ? 'cursor-pointer' : ''} ${!isDiscover && activeGroupId === group.id ? 'bg-primary/20' : 'hover:bg-overlay/30'}`}
                                onClick={() => {
                                    if (!isEditing && !isDiscover) {
                                        setActiveGroup(activeList.id, group.id);
                                    }
                                }}
                            >
                                <div className="flex items-center gap-2 flex-1 min-w-0">
                                    {!group.isMaximized && !isDiscover && (
                                        <span 
                                            className="text-muted cursor-grab touch-none"
                                            draggable
                                            onDragStart={(e) => handleGroupDragStart(e, groupIndex)}
                                            onDragEnd={handleGroupDragEnd}
                                        >
                                            <i className="fas fa-grip-vertical"></i>
                                        </span>
                                    )}
                                    <h3 className={`text-sm font-semibold truncate ${!isDiscover && activeGroupId === group.id ? 'text-primary' : ''}`} title={group.name}>
                                        {group.name}
                                    </h3>
                                    <span className="text-muted text-sm">({group.symbols.length})</span>
                                </div>
                                
                                {!isDiscover &&
                                    <div className="flex items-center gap-3 text-muted text-xs">
                                        <Tooltip title={group.isCollapsed ? "Expand" : "Collapse"} shortcut="Space">
                                            <button onClick={(e) => { e.stopPropagation(); toggleGroupCollapse(activeList.id, group.id); }}>
                                                <i className={`fas fa-chevron-up transition-transform ${group.isCollapsed ? 'rotate-180' : ''}`}></i>
                                            </button>
                                        </Tooltip>
                                        <Tooltip title={group.isMaximized ? "Minimize" : "Maximize"} shortcut="Shift + Space">
                                            <button onClick={(e) => { e.stopPropagation(); toggleGroupMaximize(activeList.id, group.id); }}>
                                                <i className={`fas ${group.isMaximized ? 'fa-compress' : 'fa-expand'}`}></i>
                                            </button>
                                        </Tooltip>
                                        <div className="relative">
                                            <Tooltip title="More options">
                                                <button onClick={(e) => { e.stopPropagation(); setActiveGroupMenu(activeGroupMenu === group.id ? null : group.id); }}>
                                                    <i className="fas fa-ellipsis-h"></i>
                                                </button>
                                            </Tooltip>
                                            {activeGroupMenu === group.id && (
                                                <div ref={groupMenuRef} onMouseLeave={() => setActiveGroupMenu(null)} className="absolute top-full right-0 mt-1 w-32 bg-base border border-overlay rounded-md shadow-lg z-20 animate-fade-in">
                                                    <ul>
                                                        <li>
                                                            <button onClick={() => { removeGroup(activeList.id, group.id); setActiveGroupMenu(null); showToast(`Group "${group.name}" deleted.`, 'info'); }} className="w-full text-left flex items-center gap-2 px-3 py-2 hover:bg-overlay text-sm text-danger">
                                                                <i className="fas fa-trash-alt w-4 text-center"></i> Delete
                                                            </button>
                                                        </li>
                                                    </ul>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                }
                            </div>

                            {!group.isCollapsed && (
                                <div onDragOver={(e) => e.preventDefault()}>
                                    {group.symbols.map((symbolKey, index) => {
                                        const { symbol, exchange } = parseInstrumentKey(symbolKey);
                                        let stock = marketData.find(s => s.symbol === symbol && (!exchange || s.exchange === exchange));
                                        if (!stock) stock = marketData.find(s => s.symbol === symbol);
                                        
                                        if (!stock) return null;
                                        const uniqueKey = getInstrumentKey(stock);
                                        const isExpanded = expandedSymbolKey === uniqueKey;
                                        const isNotesOpen = notesOpenForSymbolKey === uniqueKey;
                                        const hasNote = !!activeList.notes?.[uniqueKey];
                                        return (
                                             <div key={uniqueKey} className={`rounded-lg transition-colors duration-200 ${isExpanded || isNotesOpen ? 'bg-base shadow-lg' : 'hover:bg-overlay/50'}`}>
                                                <StockRow
                                                    stock={stock}
                                                    settings={activeList.settings}
                                                    isDiscover={isDiscover}
                                                    holdingQty={holdingsMap.get(uniqueKey)}
                                                    hasNote={hasNote}
                                                    onSelect={() => onStockSelect(stock)}
                                                    onOrder={(type) => onOrderAction({ stock, type })}
                                                    onRemove={() => removeStockFromGroup(activeList.id, group.id, uniqueKey)}
                                                    onDragStart={(e) => handleStockDragStart(e, index, group.id)}
                                                    onDragEnter={(e) => handleStockDragEnter(e, index, group.id)}
                                                    onDragEnd={handleStockDragEnd}
                                                    onMouseEnter={() => setHoveredStockInfo({ stock, groupId: group.id })}
                                                    onMouseLeave={() => setHoveredStockInfo(null)}
                                                    isExpanded={isExpanded}
                                                    onDepthClick={() => setExpandedSymbolKey(isExpanded ? null : uniqueKey)}
                                                    onMoreClick={(sym, e) => handleMoreClick(stock, e)}
                                                />
                                                {isExpanded && stock.marketDepth && (
                                                    <MarketDepthPanel
                                                        stock={stock}
                                                        onPriceClick={(price, type) => handlePriceClickForOrder(stock, price, type)}
                                                    />
                                                )}
                                                {isNotesOpen && (
                                                    <NotesEditor
                                                        watchlistId={activeList.id}
                                                        stockSymbol={uniqueKey}
                                                        onClose={() => setNotesOpenForSymbolKey(null)}
                                                    />
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )})
                )}
            </div>
             {activeMoreMenu && (
                 <MoreOptionsMenu
                    stock={activeMoreMenu.stock}
                    triggerEl={activeMoreMenu.triggerEl}
                    onClose={() => setActiveMoreMenu(null)}
                    onPin={pinStock}
                    onCreateGTT={() => onCreateGTT(activeMoreMenu.stock.symbol)}
                    onCreateAlert={() => onCreateAlert(activeMoreMenu.stock.symbol)}
                    onShowNotes={() => handleToggleNotes(getInstrumentKey(activeMoreMenu.stock))}
                    onShowMarketDepthModal={() => onShowMarketDepthModal(activeMoreMenu.stock.symbol)}
                />
            )}
        </div>
    );
};

// Main Export
const WatchlistPanel: React.FC<WatchlistPanelProps> = (props) => {
    if (props.mode === 'predefined') return <PredefinedWatchlistWrapper {...props} />;
    if (props.mode === 'optionChain') return <SidebarOptionChainPanel {...props} />;
    return <StandardWatchlistWrapper {...props} />;
};

export default WatchlistPanel;
