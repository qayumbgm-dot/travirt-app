
import React, { useState } from 'react';
import { INDIAN_INDICES_DATA, GLOBAL_INDICES_DATA } from '../../constants';
import { formatCurrency, formatPercent } from '../../utils/formatters';

const IndicesPanel: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'indian' | 'global'>('indian');

    return (
        <div className="flex flex-col h-full bg-base text-text-primary animate-fade-in">
            <div className="flex border-b border-overlay p-4">
                <div className="flex gap-4">
                    <button 
                        onClick={() => setActiveTab('indian')} 
                        className={`px-4 py-2 rounded font-semibold text-sm transition-colors ${activeTab === 'indian' ? 'bg-primary text-white' : 'bg-overlay text-text-secondary hover:bg-surface'}`}
                    >
                        Indian Indices
                    </button>
                    <button 
                        onClick={() => setActiveTab('global')} 
                        className={`px-4 py-2 rounded font-semibold text-sm transition-colors ${activeTab === 'global' ? 'bg-primary text-white' : 'bg-overlay text-text-secondary hover:bg-surface'}`}
                    >
                        Global Indices
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-auto custom-scrollbar p-6">
                {activeTab === 'indian' ? (
                    <div className="bg-surface rounded-lg shadow-lg overflow-hidden border border-overlay">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-overlay text-muted uppercase text-xs">
                                <tr>
                                    <th className="p-4 font-semibold">Index Name</th>
                                    <th className="p-4 font-semibold text-right">Last Traded</th>
                                    <th className="p-4 font-semibold text-right">Day Change</th>
                                    <th className="p-4 font-semibold text-right">High</th>
                                    <th className="p-4 font-semibold text-right">Low</th>
                                    <th className="p-4 font-semibold text-right">Open</th>
                                </tr>
                            </thead>
                            <tbody>
                                {INDIAN_INDICES_DATA.map((index) => (
                                    <tr key={index.name} className="border-b border-overlay last:border-b-0 hover:bg-overlay/30 transition-colors">
                                        <td className={`p-4 font-bold ${index.change >= 0 ? 'text-success' : 'text-danger'}`}>
                                            {index.name} <span className="text-[10px] font-normal text-muted ml-1">{index.exchange}</span>
                                        </td>
                                        <td className={`p-4 text-right font-semibold ${index.change >= 0 ? 'text-success' : 'text-danger'}`}>
                                            {index.lastTraded.toFixed(2)}
                                        </td>
                                        <td className={`p-4 text-right ${index.change >= 0 ? 'text-success' : 'text-danger'}`}>
                                            {index.change.toFixed(2)} ({index.changePercent.toFixed(2)}%)
                                        </td>
                                        <td className="p-4 text-right text-text-secondary">{index.high.toFixed(2)}</td>
                                        <td className="p-4 text-right text-text-secondary">{index.low.toFixed(2)}</td>
                                        <td className="p-4 text-right text-text-secondary">{index.open.toFixed(2)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="bg-surface rounded-lg shadow-lg overflow-hidden border border-overlay">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-overlay text-muted uppercase text-xs">
                                <tr>
                                    <th className="p-4 font-semibold">Index Name</th>
                                    <th className="p-4 font-semibold">Location</th>
                                    <th className="p-4 font-semibold text-right">Last Traded</th>
                                    <th className="p-4 font-semibold text-right">Day Change</th>
                                    <th className="p-4 font-semibold text-right">Prev. Close</th>
                                    <th className="p-4 font-semibold text-right">Date</th>
                                </tr>
                            </thead>
                            <tbody>
                                {GLOBAL_INDICES_DATA.map((index) => (
                                    <tr key={index.name} className="border-b border-overlay last:border-b-0 hover:bg-overlay/30 transition-colors">
                                        <td className={`p-4 flex items-center gap-2 font-bold ${index.change >= 0 ? 'text-success' : 'text-danger'}`}>
                                            {/* Placeholder Flag */}
                                            {/* <span className="w-4 h-3 bg-gray-500 rounded-sm inline-block"></span> */}
                                            {index.name}
                                        </td>
                                        <td className="p-4 text-muted uppercase text-xs tracking-wider">{index.location}</td>
                                        <td className={`p-4 text-right font-semibold ${index.change >= 0 ? 'text-success' : 'text-danger'}`}>
                                            {index.lastTraded.toFixed(2)}
                                        </td>
                                        <td className={`p-4 text-right ${index.change >= 0 ? 'text-success' : 'text-danger'}`}>
                                            {index.change.toFixed(2)} ({index.changePercent.toFixed(2)}%)
                                        </td>
                                        <td className="p-4 text-right text-text-secondary">{index.prevClose.toFixed(2)}</td>
                                        <td className="p-4 text-right text-muted text-xs">{index.date}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

export default IndicesPanel;
