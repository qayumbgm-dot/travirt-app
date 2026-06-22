import React, { useState, Fragment, useId, useEffect, useRef, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { useWatchlist } from '../../contexts/WatchlistContext';
import { Watchlist } from '../../types';

interface ManageWatchlistsModalProps {
    onClose: () => void;
}

const NewListModal: React.FC<{ onCreate: (name: string) => void; onCancel: () => void; }> = ({ onCreate, onCancel }) => {
    const [name, setName] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        inputRef.current?.focus();
    }, []);
    
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (name.trim()) {
            onCreate(name.trim());
        }
    };

    return createPortal(
        <div className="fixed inset-0 bg-black bg-opacity-50 z-[60] flex items-center justify-center animate-fade-in" onClick={onCancel}>
            <div role="dialog" aria-modal="true" aria-label="Create watchlist" className="bg-base p-4 rounded-lg shadow-xl w-full max-w-xs border border-overlay" onClick={e => e.stopPropagation()}>
                <form onSubmit={handleSubmit} className="space-y-3">
                    <label htmlFor="list-name" className="font-semibold text-text-primary">List name</label>
                    <input
                        ref={inputRef}
                        id="list-name"
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full bg-overlay border border-gray-600 rounded-md py-1.5 px-3 text-sm text-text-primary focus:ring-1 focus:ring-primary focus:border-primary focus:outline-none"
                    />
                    <div className="flex justify-end gap-2">
                        <button type="submit" className="px-4 py-1.5 bg-primary text-white font-semibold rounded-md text-sm hover:bg-primary-focus transition-colors" disabled={!name.trim()}>Create</button>
                        <button type="button" onClick={onCancel} className="px-4 py-1.5 bg-overlay text-text-secondary font-semibold rounded-md text-sm hover:bg-base transition-colors">Cancel</button>
                    </div>
                </form>
            </div>
        </div>,
        document.body
    );
};

const WatchlistRow: React.FC<{
    wl: Watchlist;
    onEdit: (wl: Watchlist) => void;
    onDelete: (id: number) => void;
}> = ({ wl, onEdit, onDelete }) => {
    const { updateWatchlistName } = useWatchlist();
    const [isEditing, setIsEditing] = useState(false);
    const [name, setName] = useState(wl.name);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if(isEditing) {
            inputRef.current?.focus();
            inputRef.current?.select();
        }
    }, [isEditing]);

    const handleSave = () => {
        if (name.trim() && name.trim() !== wl.name) {
            updateWatchlistName(wl.id, name.trim());
        }
        setIsEditing(false);
    };

    return (
        <li className="flex items-center p-2 rounded-md hover:bg-overlay group text-sm transition-colors">
            <span className="text-muted mr-3 w-4 text-center text-xs font-mono">{wl.id}</span>
            <div className="flex-1">
                {isEditing ? (
                    <input
                        ref={inputRef}
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        onBlur={handleSave}
                        onKeyDown={(e) => e.key === 'Enter' && handleSave()}
                        className="w-full bg-base border border-primary rounded-md px-2 py-1 text-sm text-text-primary focus:outline-none"
                    />
                ) : (
                    <span className="text-text-primary font-medium">{wl.name}</span>
                )}
            </div>
            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => setIsEditing(true)} className="text-muted hover:text-primary transition-colors p-1"><i className="fas fa-pencil-alt"></i></button>
                <button onClick={() => onDelete(wl.id)} className="text-muted hover:text-danger transition-colors p-1"><i className="fas fa-trash-alt"></i></button>
            </div>
        </li>
    );
};


const ManageWatchlistsModal: React.FC<ManageWatchlistsModalProps> = ({ onClose }) => {
    const { watchlists, addWatchlist, removeWatchlist } = useWatchlist();
    const [isCreating, setIsCreating] = useState(false);
    
    const favoriteLists = watchlists.filter(w => w.id <= 7);
    const otherLists = watchlists.filter(w => w.id > 7);

    return (
        <>
        <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex items-center justify-center backdrop-blur-sm" onClick={onClose}>
            <div role="dialog" aria-modal="true" aria-label="Manage watchlists" className="bg-surface rounded-lg shadow-2xl w-full max-w-sm h-[60vh] flex flex-col border border-overlay animate-fade-in overflow-hidden" onClick={e => e.stopPropagation()}>
                {/* Search Header */}
                <div className="p-4 border-b border-overlay bg-base/50">
                    <div className="relative">
                        <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-muted"></i>
                        <input type="text" placeholder="Search lists" className="w-full bg-base border border-gray-600 rounded-md py-1.5 pl-9 pr-24 text-sm text-text-primary focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary" />
                        <div className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted border border-gray-600 rounded px-1.5 py-0.5 pointer-events-none">Ctrl+Shift+K</div>
                    </div>
                </div>

                {/* Title & Action */}
                <div className="border-b border-overlay px-4 py-3 flex justify-between items-center bg-base/30">
                    <span className="text-sm font-bold text-text-primary">My Watchlists</span>
                    <button onClick={() => setIsCreating(true)} className="text-primary font-bold text-xs hover:text-primary-focus uppercase tracking-wider flex items-center gap-1 transition-colors">
                        <i className="fas fa-plus"></i> New list
                    </button>
                </div>

                {/* List Content */}
                <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
                    <div>
                        <h4 className="text-[10px] uppercase text-muted font-bold p-2 tracking-wider">Favorites (1-7)</h4>
                        <ul>
                            {favoriteLists.map(wl => (
                                <WatchlistRow key={wl.id} wl={wl} onEdit={() => {}} onDelete={removeWatchlist} />
                            ))}
                        </ul>

                         {otherLists.length > 0 && 
                            <>
                                <h4 className="text-[10px] uppercase text-muted font-bold p-2 mt-4 tracking-wider">Other Lists</h4>
                                <ul>
                                    {otherLists.map(wl => (
                                        <WatchlistRow key={wl.id} wl={wl} onEdit={() => {}} onDelete={removeWatchlist} />
                                    ))}
                                </ul>
                            </>
                         }
                         
                         {watchlists.length === 0 && (
                             <p className="text-center text-muted text-sm py-8">No watchlists found.</p>
                         )}
                    </div>
                </div>
            </div>
        </div>
        {isCreating && <NewListModal onCreate={(name) => {addWatchlist(name); setIsCreating(false);}} onCancel={() => setIsCreating(false)} />}
        </>
    );
};

export default ManageWatchlistsModal;