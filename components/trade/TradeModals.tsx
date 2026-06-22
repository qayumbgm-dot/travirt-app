
import React, { useState, useEffect } from 'react';
import { Stock, TransactionType, GTTTriggerType, AlertProperty, AlertOperator, AlertType } from '../../types';
import { usePortfolio } from '../../contexts/PortfolioContext';
import { useToast } from '../../contexts/ToastContext';
import { formatCurrency } from '../../utils/formatters';

// Alert Create Modal Component
export const AlertCreateModal: React.FC<{ stock: Stock, onClose: () => void }> = ({ stock, onClose }) => {
    const { createAlert } = usePortfolio();

    const [property, setProperty] = useState<AlertProperty>(AlertProperty.LTP);
    const [operator, setOperator] = useState<AlertOperator>(AlertOperator.GTE);
    const [value, setValue] = useState(stock.ltp);
    const [alertType, setAlertType] = useState<AlertType>(AlertType.ALERT_ONLY);

    const ltp = stock.ltp;

    const handlePercentChange = (val: string) => {
        const percent = parseFloat(val);
        if (!isNaN(percent)) {
            setValue(ltp * (1 + percent / 100));
        } else {
            setValue(ltp);
        }
    };
    
    const getValuePercent = () => {
        if (property !== AlertProperty.LTP || ltp === 0) return '0.00';
        return (((value - ltp) / ltp) * 100).toFixed(2);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        createAlert({
            symbol: stock.symbol,
            property,
            operator,
            value,
            type: alertType,
        });
        onClose();
    };
    
    const propertyOptions = [
        { value: AlertProperty.LTP, label: 'Last price' },
        { value: AlertProperty.HIGH, label: 'High price' },
        { value: AlertProperty.LOW, label: 'Low price' },
        { value: AlertProperty.OPEN, label: 'Open price' },
        { value: AlertProperty.CLOSE, label: 'Close price' },
        { value: AlertProperty.CHANGE, label: 'Day change' },
        { value: AlertProperty.CHANGE_PERCENT, label: 'Day change %' },
        { value: AlertProperty.VOLUME, label: 'Volume' },
    ];
    
    const operatorOptions = Object.values(AlertOperator);

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 z-[110] flex items-center justify-center animate-fade-in" onClick={onClose}>
            <form role="dialog" aria-modal="true" aria-label={`Create alert for ${stock.symbol}`} onSubmit={handleSubmit} className="bg-surface rounded-lg shadow-2xl w-full max-w-lg border border-overlay" onClick={e => e.stopPropagation()}>
                <div className="p-4 border-b border-overlay flex justify-between items-center">
                    <div className="flex items-center gap-2">
                         <i className="fas fa-file-alt text-lg text-muted"></i>
                        <h3 className="font-bold text-lg text-text-primary">{stock.symbol}</h3>
                    </div>
                     <button type="button" className="text-primary hover:underline text-sm font-semibold">Help</button>
                </div>
                 <div className="p-6 space-y-6">
                    {/* Condition Builder */}
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-2 items-end text-sm">
                        <span className="md:col-span-1 self-center">If</span>
                        <div className="md:col-span-3">
                            <select value={property} onChange={e => setProperty(e.target.value as AlertProperty)} className="w-full bg-base border border-gray-600 rounded-md p-2 text-text-primary">
                               {propertyOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                            </select>
                        </div>
                         <span className="md:col-span-1 self-center">of</span>
                        <div className="md:col-span-3">
                             <input type="text" value={`${stock.symbol} (${stock.exchange})`} readOnly className="w-full bg-base border border-gray-600 rounded-md p-2 text-muted"/>
                        </div>
                        <span className="md:col-span-1 self-center">is</span>
                        <div className="md:col-span-1">
                            <select value={operator} onChange={e => setOperator(e.target.value as AlertOperator)} className="w-full bg-base border border-gray-600 rounded-md p-2 text-text-primary">
                                {operatorOptions.map(op => <option key={op} value={op}>{op}</option>)}
                            </select>
                        </div>
                         <span className="md:col-span-1 self-center">than</span>
                         <div className="md:col-span-1">
                            <input type="number" value={value.toFixed(2)} onChange={e => setValue(parseFloat(e.target.value))} step="0.05" className="w-full bg-base border border-gray-600 rounded-md p-2 text-text-primary" />
                        </div>
                    </div>
                    <div className="flex justify-end items-center gap-2 -mt-2">
                         <p className="text-xs text-muted mr-2">Last price: {formatCurrency(stock.ltp)}</p>
                         <input type="number" step="0.01" onChange={e => handlePercentChange(e.target.value)} value={getValuePercent()} className="w-20 bg-base border border-gray-600 rounded-md p-1 text-xs text-center text-text-primary"/>
                         <span className="text-xs text-muted">% of Last price</span>
                    </div>

                    {/* Alert Type */}
                    <div>
                        <div className="flex gap-6">
                            <label className="flex items-center cursor-pointer">
                                <input type="radio" name="alertType" value={AlertType.ALERT_ONLY} checked={alertType === AlertType.ALERT_ONLY} onChange={() => setAlertType(AlertType.ALERT_ONLY)} className="h-4 w-4 text-primary bg-base border-gray-500" />
                                <span className="ml-2 text-text-primary">Only alert</span>
                            </label>
                            <label className="flex items-center cursor-pointer">
                                <input type="radio" name="alertType" value={AlertType.ATO} checked={alertType === AlertType.ATO} onChange={() => setAlertType(AlertType.ATO)} className="h-4 w-4 text-primary bg-base border-gray-500"/>
                                <span className="ml-2 text-text-primary">Alert Triggers Order (ATO)</span>
                            </label>
                        </div>
                    </div>
                    
                    {alertType === AlertType.ATO && (
                        <div className="text-center p-8 bg-overlay/50 rounded-md text-muted border border-dashed border-gray-600">
                             <i className="fas fa-box-open text-3xl mb-3"></i>
                            <p>ATO Basket creation is coming soon!</p>
                            <p className="text-xs">This will allow you to execute a basket of orders when the alert triggers.</p>
                        </div>
                    )}

                </div>
                 <div className="p-4 border-t border-overlay flex justify-end gap-3">
                    <button type="button" onClick={onClose} className="px-8 py-2 rounded-md bg-overlay hover:bg-base text-text-primary font-semibold transition">Cancel</button>
                    <button type="submit" className="px-8 py-2 rounded-md bg-primary hover:bg-primary-focus text-white font-semibold transition">Create</button>
                </div>
            </form>
        </div>
    );
};


// GTT Create Modal Component
export const GTTCreateModal: React.FC<{ stock: Stock, onClose: () => void }> = ({ stock, onClose }) => {
    const { createGTT } = usePortfolio();
    const { showToast } = useToast();

    const [transactionType, setTransactionType] = useState<TransactionType>(TransactionType.BUY);
    const [triggerType, setTriggerType] = useState<GTTTriggerType>(GTTTriggerType.SINGLE);
    
    // Single Trigger State
    const [triggerPrice, setTriggerPrice] = useState(stock.ltp);
    const [quantity, setQuantity] = useState(1);
    const [limitPrice, setLimitPrice] = useState(stock.ltp);

    // OCO State
    const [stoplossTrigger, setStoplossTrigger] = useState(stock.ltp * 0.95);
    const [targetTrigger, setTargetTrigger] = useState(stock.ltp * 1.05);

    const [agreed, setAgreed] = useState(false);

    const ltp = stock.ltp;

    useEffect(() => {
        if (triggerType === GTTTriggerType.OCO) {
            setTransactionType(TransactionType.SELL);
        }
    }, [triggerType]);
    
    const handlePercentChange = (setter: React.Dispatch<React.SetStateAction<number>>, value: string) => {
        const percent = parseFloat(value);
        if (!isNaN(percent)) {
            setter(ltp * (1 + percent / 100));
        }
    };
    
    const getPercent = (price: number) => {
        return ltp > 0 ? ((price - ltp) / ltp * 100).toFixed(2) : '0.00';
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!agreed) {
            showToast('Please agree to the terms and conditions.', 'warning');
            return;
        }

        if (triggerType === GTTTriggerType.SINGLE) {
            createGTT({
                symbol: stock.symbol,
                transactionType,
                triggerType,
                quantity,
                triggerPrice,
                limitPrice,
            });
        } else { // OCO
             createGTT({
                symbol: stock.symbol,
                transactionType: TransactionType.SELL,
                triggerType,
                quantity,
                stoplossTriggerPrice: stoplossTrigger,
                stoplossLimitPrice: stoplossTrigger, // Simplified for demo
                targetTriggerPrice: targetTrigger,
                targetLimitPrice: targetTrigger, // Simplified for demo
            });
        }
        onClose();
    };

    const triggerTypeDescription = triggerType === GTTTriggerType.SINGLE
        ? "The order is placed when the Last Traded Price (LTP) crosses the trigger price. Used to buy or sell stock holdings."
        : "One Cancels Other: Either the stoploss or the target order is placed when the LTP crosses the respective trigger. Used to set target and stoploss for stock holdings.";


    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 z-[110] flex items-center justify-center animate-fade-in" onClick={onClose}>
            <form role="dialog" aria-modal="true" aria-label={`Create GTT order for ${stock.symbol}`} onSubmit={handleSubmit} className="bg-surface rounded-lg shadow-2xl w-full max-w-md border border-overlay" onClick={e => e.stopPropagation()}>
                <div className="p-4 border-b border-overlay flex justify-between items-center">
                    <div className="flex items-baseline gap-2">
                        <h3 className="font-bold text-lg text-text-primary">{stock.symbol}</h3>
                        <span className="text-sm font-semibold text-primary">{stock.exchange}</span>
                        <span className="text-sm text-muted">{formatCurrency(stock.ltp)}</span>
                    </div>
                     <i className="fas fa-info-circle text-primary text-lg"></i>
                </div>

                <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto custom-scrollbar">
                    {/* Transaction & Trigger Type */}
                    <div className="grid grid-cols-2 gap-6">
                        <div>
                            <label className="text-sm font-semibold mb-2 block text-text-secondary">Transaction type</label>
                            <div className="flex gap-4">
                                <label className="flex items-center cursor-pointer">
                                    <input type="radio" name="transactionType" value={TransactionType.BUY} checked={transactionType === TransactionType.BUY} onChange={() => setTransactionType(TransactionType.BUY)} disabled={triggerType === GTTTriggerType.OCO} className="h-4 w-4 text-primary bg-base border-gray-500" />
                                    <span className="ml-2 text-text-primary">Buy</span>
                                </label>
                                <label className="flex items-center cursor-pointer">
                                    <input type="radio" name="transactionType" value={TransactionType.SELL} checked={transactionType === TransactionType.SELL} onChange={() => setTransactionType(TransactionType.SELL)} className="h-4 w-4 text-primary bg-base border-gray-500"/>
                                    <span className="ml-2 text-text-primary">Sell</span>
                                </label>
                            </div>
                        </div>
                         <div>
                            <label className="text-sm font-semibold mb-2 block text-text-secondary">Trigger type</label>
                            <div className="flex gap-4">
                                <label className="flex items-center cursor-pointer">
                                    <input type="radio" name="triggerType" value={GTTTriggerType.SINGLE} checked={triggerType === GTTTriggerType.SINGLE} onChange={() => setTriggerType(GTTTriggerType.SINGLE)} className="h-4 w-4 text-primary bg-base border-gray-500"/>
                                    <span className="ml-2 text-text-primary">Single</span>
                                </label>
                                <label className="flex items-center cursor-pointer">
                                    <input type="radio" name="triggerType" value={GTTTriggerType.OCO} checked={triggerType === GTTTriggerType.OCO} onChange={() => setTriggerType(GTTTriggerType.OCO)} className="h-4 w-4 text-primary bg-base border-gray-500"/>
                                    <span className="ml-2 text-text-primary">OCO</span>
                                </label>
                            </div>
                        </div>
                    </div>
                    <p className="text-xs text-muted">{triggerTypeDescription}</p>

                    {/* Form fields based on trigger type */}
                    {triggerType === GTTTriggerType.SINGLE && (
                        <div className="grid grid-cols-5 items-end gap-3 p-4 bg-overlay/50 rounded-md">
                            <div className="col-span-2">
                                <label className="text-xs text-muted">Trigger price</label>
                                <input type="number" value={triggerPrice.toFixed(2)} onChange={e => setTriggerPrice(parseFloat(e.target.value))} step="0.05" className="w-full bg-base border border-gray-600 rounded-md p-2 mt-1 text-sm text-text-primary"/>
                                <input type="text" value={getPercent(triggerPrice)} onChange={e => handlePercentChange(setTriggerPrice, e.target.value)} className="w-full bg-transparent text-center text-xs text-primary mt-1" placeholder="% of LTP" />
                            </div>
                            <div className="text-center text-muted col-span-1 pb-2">&rarr;</div>
                            <div className="col-span-1">
                                <label className="text-xs text-muted">Qty.</label>
                                <input type="number" value={quantity} onChange={e => setQuantity(parseInt(e.target.value))} min="1" className="w-full bg-base border border-gray-600 rounded-md p-2 mt-1 text-sm text-text-primary"/>
                            </div>
                            <div className="col-span-1">
                                <label className="text-xs text-muted">Price</label>
                                <input type="number" value={limitPrice.toFixed(2)} onChange={e => setLimitPrice(parseFloat(e.target.value))} step="0.05" className="w-full bg-base border border-gray-600 rounded-md p-2 mt-1 text-sm text-text-primary"/>
                            </div>
                        </div>
                    )}

                    {triggerType === GTTTriggerType.OCO && (
                        <div className="space-y-3">
                            {/* Stoploss */}
                             <div className="grid grid-cols-5 items-end gap-3 p-4 bg-overlay/50 rounded-md">
                                <label className="text-sm font-semibold text-purple-400 col-span-5">Stoploss</label>
                                <div className="col-span-2">
                                    <label className="text-xs text-muted">Trigger price</label>
                                    <input type="number" value={stoplossTrigger.toFixed(2)} onChange={e => setStoplossTrigger(parseFloat(e.target.value))} step="0.05" className="w-full bg-base border border-gray-600 rounded-md p-2 mt-1 text-sm text-text-primary"/>
                                    <input type="text" value={getPercent(stoplossTrigger)} onChange={e => handlePercentChange(setStoplossTrigger, e.target.value)} className="w-full bg-transparent text-center text-xs text-primary mt-1" placeholder="% of LTP" />
                                </div>
                                <div className="text-center text-muted col-span-1 pb-2">&rarr;</div>
                                <div className="col-span-1">
                                    <label className="text-xs text-muted">Qty.</label>
                                    <input type="number" value={quantity} onChange={e => setQuantity(parseInt(e.target.value))} min="1" className="w-full bg-base border border-gray-600 rounded-md p-2 mt-1 text-sm text-text-primary"/>
                                </div>
                                <div className="col-span-1">
                                    <label className="text-xs text-muted">Price</label>
                                    <input type="number" value={stoplossTrigger.toFixed(2)} readOnly className="w-full bg-base/50 border border-gray-700 rounded-md p-2 mt-1 text-sm text-muted"/>
                                </div>
                            </div>
                            {/* Target */}
                             <div className="grid grid-cols-5 items-end gap-3 p-4 bg-overlay/50 rounded-md">
                                 <label className="text-sm font-semibold text-purple-400 col-span-5">Target</label>
                                <div className="col-span-2">
                                    <label className="text-xs text-muted">Trigger price</label>
                                    <input type="number" value={targetTrigger.toFixed(2)} onChange={e => setTargetTrigger(parseFloat(e.target.value))} step="0.05" className="w-full bg-base border border-gray-600 rounded-md p-2 mt-1 text-sm text-text-primary"/>
                                    <input type="text" value={getPercent(targetTrigger)} onChange={e => handlePercentChange(setTargetTrigger, e.target.value)} className="w-full bg-transparent text-center text-xs text-primary mt-1" placeholder="% of LTP" />
                                </div>
                                <div className="text-center text-muted col-span-1 pb-2">&rarr;</div>
                                <div className="col-span-1">
                                    <label className="text-xs text-muted">Qty.</label>
                                    <input type="number" value={quantity} readOnly className="w-full bg-base/50 border border-gray-700 rounded-md p-2 mt-1 text-sm text-muted"/>
                                </div>
                                <div className="col-span-1">
                                    <label className="text-xs text-muted">Price</label>
                                    <input type="number" value={targetTrigger.toFixed(2)} readOnly className="w-full bg-base/50 border border-gray-700 rounded-md p-2 mt-1 text-sm text-muted"/>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <div className="p-4 border-t border-overlay">
                     <div className="flex items-start">
                        <input type="checkbox" id="gtt-terms" checked={agreed} onChange={e => setAgreed(e.target.checked)} className="h-4 w-4 rounded border-gray-500 text-primary focus:ring-primary mt-1"/>
                        <label htmlFor="gtt-terms" className="ml-2 text-xs text-muted cursor-pointer">
                            I agree to the <span className="text-primary hover:underline">terms</span> and accept that trigger executions are not guaranteed. This trigger expires on {new Date(Date.now() + 31536000000).toLocaleDateString('en-CA')}.
                        </label>
                    </div>
                    <div className="flex justify-end gap-3 mt-4">
                        <button type="button" onClick={onClose} className="px-8 py-2 rounded-md bg-overlay hover:bg-base text-text-primary font-semibold transition">Cancel</button>
                        <button type="submit" className="px-8 py-2 rounded-md bg-primary hover:bg-primary-focus text-white font-semibold transition">Place</button>
                    </div>
                </div>
            </form>
        </div>
    );
};
