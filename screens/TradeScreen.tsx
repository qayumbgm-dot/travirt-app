
import React from 'react';
import { Stock, InstrumentType, TransactionType, OrderType } from '../types';
import ChartPanel from '../components/trade/ChartPanel';
import OptionChainPanel from '../components/trade/OptionChainPanel';
import IndicesPanel from '../components/trade/IndicesPanel';
import { TradeViewMode } from '../App';

interface TradeScreenProps {
    selectedStock: Stock | null;
    viewMode: TradeViewMode;
    setViewMode: (mode: TradeViewMode) => void;
    onOrderAction: (action: { stock: Stock, type: TransactionType, price?: number, orderType?: OrderType }) => void;
    onChartSelect: (stock: Stock) => void;
    onAddToWatchlist: (stock: Stock) => void;
    onCreateGTT: (symbol: string) => void;
    onCreateAlert: (symbol: string) => void;
    onShowMarketDepthModal: (symbol: string) => void;
}

const TradeScreen: React.FC<TradeScreenProps> = ({
    selectedStock,
    viewMode,
    setViewMode,
    onOrderAction,
    onChartSelect,
    onAddToWatchlist,
    onCreateGTT,
    onCreateAlert,
    onShowMarketDepthModal,
}) => {
    if (viewMode === 'indices') {
        return <IndicesPanel />;
    }

    if (!selectedStock) {
        return (
            <div className="flex items-center justify-center h-full text-muted">
                Select a stock to view its chart
            </div>
        );
    }

    const showOptionChainTab =
        selectedStock.exchange === 'INDEX' ||
        selectedStock.instrumentType === InstrumentType.INDEX ||
        selectedStock.instrumentType === InstrumentType.FUTURE ||
        selectedStock.instrumentType === InstrumentType.OPTION ||
        selectedStock.exchange === 'NSE' ||
        selectedStock.exchange === 'BSE';

    // Key includes exchange so NSE:TATASTEEL and BSE:TATASTEEL get separate chart instances
    const instrumentKey = `${selectedStock.exchange}:${selectedStock.symbol}`;

    return (
        <div className="flex flex-col h-full w-full bg-surface">
            {/* Tab bar */}
            <div role="tablist" aria-label="Trade view" className="flex items-center px-4 bg-surface border-b border-overlay h-12 shrink-0">
                <button
                    role="tab"
                    aria-selected={viewMode === 'chart'}
                    onClick={() => setViewMode('chart')}
                    className={`mr-6 h-full text-sm font-bold border-b-2 transition-colors px-2 ${
                        viewMode === 'chart'
                            ? 'border-primary text-primary'
                            : 'border-transparent text-muted hover:text-text-primary'
                    }`}
                >
                    Chart
                </button>

                {showOptionChainTab && (
                    <button
                        role="tab"
                        aria-selected={viewMode === 'optionChain'}
                        onClick={() => setViewMode('optionChain')}
                        className={`mr-6 h-full text-sm font-bold border-b-2 transition-colors px-2 ${
                            viewMode === 'optionChain'
                                ? 'border-primary text-primary'
                                : 'border-transparent text-muted hover:text-text-primary'
                        }`}
                    >
                        Option Chain
                    </button>
                )}
            </div>

            {/* Content */}
            <div className="flex-1 relative bg-base overflow-hidden">
                {viewMode === 'optionChain' && showOptionChainTab ? (
                    <OptionChainPanel
                        key={`option-chain-${instrumentKey}`}
                        underlyingSymbol={
                            selectedStock.instrumentType === InstrumentType.FUTURE ||
                            selectedStock.instrumentType === InstrumentType.OPTION
                                ? (selectedStock.underlying ?? selectedStock.symbol)
                                : selectedStock.symbol
                        }
                        underlyingLtp={selectedStock.ltp}
                        exchange={selectedStock.exchange}
                        onOrderAction={onOrderAction}
                        onAddToWatchlist={onAddToWatchlist}
                        onChartSelect={onChartSelect}
                        onCreateGTT={onCreateGTT}
                        onCreateAlert={onCreateAlert}
                        onShowDepth={onShowMarketDepthModal}
                    />
                ) : (
                    <ChartPanel
                        key={`chart-${instrumentKey}`}
                        stock={selectedStock}
                    />
                )}
            </div>
        </div>
    );
};

export default TradeScreen;
