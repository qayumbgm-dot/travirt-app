
import React, { useState, useEffect, useRef } from 'react';
import { useWatchlist } from '../../../contexts/WatchlistContext';
import Tooltip from '../../common/Tooltip';

interface NotesEditorProps {
    watchlistId: number;
    stockSymbol: string;
    onClose: () => void;
}

const NotesEditor: React.FC<NotesEditorProps> = ({ watchlistId, stockSymbol, onClose }) => {
    const { watchlists, updateNote, deleteNote } = useWatchlist();
    const watchlist = watchlists.find(w => w.id === watchlistId);
    const initialNote = watchlist?.notes?.[stockSymbol] || '';
    
    const [note, setNote] = useState(initialNote);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
        }
    }, [note]);

    const handleSave = () => {
        if (note.trim()) {
            updateNote(watchlistId, stockSymbol, note);
        } else {
            deleteNote(watchlistId, stockSymbol);
        }
        onClose();
    };

    const handleDelete = () => {
        deleteNote(watchlistId, stockSymbol);
        onClose();
    };
    
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onClose();
            }
            if (e.ctrlKey && e.key === 'Enter') {
                handleSave();
            }
        };
        
        const textarea = textareaRef.current;
        textarea?.addEventListener('keydown', handleKeyDown);
        
        return () => {
            textarea?.removeEventListener('keydown', handleKeyDown);
        };
    }, [onClose, handleSave]);


    return (
        <div className="bg-base p-2.5 rounded-b-lg border-t border-overlay animate-fade-in" onClick={e => e.stopPropagation()}>
            <textarea
                ref={textareaRef}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Type your notes here..."
                className="w-full bg-transparent text-text-secondary text-sm resize-y overflow-hidden block min-h-[60px] p-1 focus:outline-none"
                autoFocus
            />
            <div className="flex justify-end items-center gap-2 mt-2">
                <Tooltip title="Save" shortcut="Ctrl+Enter">
                    <button onClick={handleSave} className="text-muted hover:text-success text-lg w-7 h-7 flex items-center justify-center rounded-full hover:bg-overlay">
                        <i className="fas fa-check"></i>
                    </button>
                </Tooltip>
                 <Tooltip title="Delete">
                    <button onClick={handleDelete} className="text-muted hover:text-danger text-lg w-7 h-7 flex items-center justify-center rounded-full hover:bg-overlay">
                        <i className="fas fa-trash"></i>
                    </button>
                </Tooltip>
                 <Tooltip title="Close" shortcut="Esc">
                    <button onClick={onClose} className="text-muted hover:text-text-primary text-lg w-7 h-7 flex items-center justify-center rounded-full hover:bg-overlay">
                        <i className="fas fa-times"></i>
                    </button>
                </Tooltip>
            </div>
        </div>
    );
};

export default NotesEditor;
