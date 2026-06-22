
import React from 'react';
import { WatchlistSettings, SortByType } from '../../../types';
import Tooltip from '../../common/Tooltip';

interface WatchlistSettingsPanelProps {
    settings: WatchlistSettings;
    onSettingsChange: (settings: Partial<WatchlistSettings>) => void;
    onSort: (sortBy: SortByType) => void;
}

const WatchlistSettingsPanel: React.FC<WatchlistSettingsPanelProps> = ({ settings, onSettingsChange, onSort }) => {
    const { changeType, showOptions, sortBy } = settings;

    const handleShowOptionChange = (option: keyof typeof showOptions) => {
        onSettingsChange({ showOptions: { ...showOptions, [option]: !showOptions[option] } });
    };
    
    const handleSort = (newSortBy: SortByType) => {
        onSettingsChange({ sortBy: newSortBy });
        onSort(newSortBy);
    };

    const showOptionsConfig: { key: keyof typeof showOptions, label: string }[] = [
        { key: "priceChange", label: "Price change" },
        { key: "priceChangePercent", label: "Price change %" },
        { key: "priceDirection", label: "Price direction" },
        { key: "holdings", label: "Holdings" },
        { key: "notes", label: "Notes" },
        { key: "groupColors", label: "Group colors" }
    ];

    return (
        <div className="bg-base rounded-lg border border-overlay p-3 space-y-3 text-sm animate-fade-in mb-2">
            {/* Change Type */}
            <div className="flex items-center gap-2">
                <div className="w-24 text-muted flex items-center shrink-0">
                    <span className="font-semibold uppercase text-xs mr-1">CHANGE TYPE</span>
                    <Tooltip title="Change reference for price calculation."><i className="fas fa-info-circle cursor-help text-xs"></i></Tooltip>
                </div>
                <div className="flex gap-4">
                    <label className="flex items-center cursor-pointer">
                        <input type="radio" name="changeType" value="close" checked={changeType === 'close'} onChange={() => onSettingsChange({ changeType: 'close' })} className="h-4 w-4 text-primary bg-surface border-gray-500 focus:ring-primary focus:ring-1"/>
                        <span className="ml-2 text-text-secondary">Close price</span>
                    </label>
                     <label className="flex items-center cursor-pointer">
                        <input type="radio" name="changeType" value="open" checked={changeType === 'open'} onChange={() => onSettingsChange({ changeType: 'open' })} className="h-4 w-4 text-primary bg-surface border-gray-500 focus:ring-primary focus:ring-1"/>
                        <span className="ml-2 text-text-secondary">Open price</span>
                    </label>
                </div>
            </div>

            {/* Show */}
            <div className="flex items-start gap-2">
                 <div className="w-24 text-muted shrink-0 pt-1">
                    <span className="font-semibold uppercase text-xs">SHOW</span>
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                    {showOptionsConfig.map(({ key, label }) => (
                         <label key={key} className="flex items-center cursor-pointer whitespace-nowrap">
                            <input type="checkbox" checked={showOptions[key]} onChange={() => handleShowOptionChange(key)} className="h-4 w-4 rounded-sm text-primary bg-surface border-gray-500 focus:ring-primary focus:ring-1"/>
                            <span className="ml-2 text-text-secondary">{label}</span>
                        </label>
                    ))}
                </div>
            </div>

            {/* Sort By */}
            <div className="flex items-start gap-2">
                <div className="w-24 text-muted shrink-0 pt-1">
                    <span className="font-semibold uppercase text-xs">SORT BY</span>
                </div>
                <div className="flex-1">
                    <div className="flex gap-1 flex-wrap">
                        {(['%', 'LTP', 'A-Z', 'EXCH'] as const).map(option => (
                            <button key={option} onClick={() => handleSort(option)} className={`px-4 py-1.5 border rounded font-semibold ${sortBy === option ? 'bg-primary border-primary text-white' : 'bg-surface border-gray-600 text-muted hover:border-primary'}`}>
                                {option}
                            </button>
                        ))}
                    </div>
                    <p className="text-xs text-muted mt-1">Sort items within a group.</p>
                </div>
            </div>
        </div>
    );
};

export default WatchlistSettingsPanel;
