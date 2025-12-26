import React, { useState, useEffect, useRef } from 'react';
import { Search, X } from 'lucide-react';
import { searchStocks } from '../services/stockApi';

const StockSearch = ({ 
  onSelect, 
  placeholder = "Cari kode saham...", 
  value = "",
  className = ""
}) => {
  const [query, setQuery] = useState(value);
  const [results, setResults] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const inputRef = useRef(null);
  const dropdownRef = useRef(null);

  // Update query when value prop changes
  useEffect(() => {
    setQuery(value);
  }, [value]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Search stocks
  useEffect(() => {
    if (query.length < 1) {
      setResults([]);
      setIsOpen(false);
      return;
    }

    const filteredStocks = searchStocks(query, 15);
    setResults(filteredStocks);
    setIsOpen(filteredStocks.length > 0);
  }, [query]);

  const handleSelect = (stock) => {
    setQuery(stock.symbol);
    setIsOpen(false);
    onSelect?.(stock);
  };

  const handleClear = () => {
    setQuery('');
    setResults([]);
    inputRef.current?.focus();
  };

  const handleInputChange = (e) => {
    const newValue = e.target.value.toUpperCase();
    setQuery(newValue);
  };

  const getBoardColor = (board) => {
    switch (board) {
      case 'Utama': return 'bg-white text-black';
      case 'Pengembangan': return 'bg-gray-600 text-white';
      case 'Akselerasi': return 'bg-gray-500 text-white';
      case 'Pemantauan Khusus': return 'bg-red-600 text-white';
      case 'Ekonomi Baru': return 'bg-gray-400 text-black';
      default: return 'bg-gray-700 text-white';
    }
  };

  return (
    <div ref={dropdownRef} className={`relative ${className}`}>
      <div className="relative group">
        <Search 
          size={18} 
          className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-white transition-colors" 
        />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleInputChange}
          onFocus={() => query.length > 0 && results.length > 0 && setIsOpen(true)}
          placeholder={placeholder}
          className="w-full pl-12 pr-10 py-3.5 bg-black text-white 
                     border-2 border-gray-800 rounded-xl
                     hover:border-gray-700 transition-all duration-300
                     focus:outline-none focus:border-gray-600 focus:shadow-[0_0_0_4px_rgba(255,255,255,0.05)]
                     placeholder:text-gray-600
                     text-sm font-medium"
        />
        {query && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-full
                       text-gray-500 hover:text-white
                       hover:bg-gray-800 transition-colors"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {/* Dropdown Results */}
      {isOpen && results.length > 0 && (
        <div className="absolute z-50 w-full mt-2 bg-[#111] 
                        border border-gray-800 rounded-xl 
                        shadow-2xl shadow-black/50
                        overflow-hidden"
             style={{ animation: 'fadeInUp 0.2s ease-out' }}>
          <div className="p-3 text-xs font-medium text-gray-500 
                          uppercase tracking-wider border-b border-gray-800
                          flex justify-between items-center">
            <span>Hasil Pencarian</span>
            <span className="text-white">{results.length} saham</span>
          </div>
          <div className="max-h-72 overflow-y-auto">
            {results.map((stock) => (
              <button
                key={stock.symbol}
                type="button"
                onClick={() => handleSelect(stock)}
                className="w-full px-4 py-3 flex items-center gap-3
                           hover:bg-gray-800/50 
                           transition-colors duration-150 text-left group"
              >
                <div className={`w-10 h-10 rounded-xl ${getBoardColor(stock.board)}
                                flex items-center justify-center font-bold text-xs
                                group-hover:scale-105 transition-transform flex-shrink-0`}>
                  {stock.symbol.slice(0, 2)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white">
                      {stock.symbol}
                    </span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium
                                    ${stock.board === 'Utama' ? 'bg-gray-800 text-white' :
                                      stock.board === 'Pengembangan' ? 'bg-gray-800 text-gray-400' :
                                      stock.board === 'Pemantauan Khusus' ? 'bg-red-900/50 text-red-400' :
                                      'bg-gray-800 text-gray-500'}`}>
                      {stock.board === 'Pemantauan Khusus' ? 'PK' : stock.board === 'Pengembangan' ? 'Dev' : stock.board}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 truncate">
                    {stock.name}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
};

export default StockSearch;
