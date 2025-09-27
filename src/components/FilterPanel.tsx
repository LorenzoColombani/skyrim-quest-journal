import React, { useState } from 'react';
import { Search, Filter, Tag, Users } from 'lucide-react';
import { QuestFilters, QuestState } from '../types';
import { useTags, useFactions } from '../hooks/useLogs';

interface FilterPanelProps {
  filters: QuestFilters;
  onFiltersChange: (filters: QuestFilters) => void;
}

const FilterPanel: React.FC<FilterPanelProps> = ({ filters, onFiltersChange }) => {
  const [searchInput, setSearchInput] = useState(filters.search || '');
  const { tags } = useTags();
  const { factions } = useFactions();

  const handleSearchChange = (value: string) => {
    setSearchInput(value);
    onFiltersChange({
      ...filters,
      search: value || undefined
    });
  };

  const handleStateFilter = (state: QuestState) => {
    const currentStates = filters.state || [];
    const newStates = currentStates.includes(state)
      ? currentStates.filter(s => s !== state)
      : [...currentStates, state];
    
    onFiltersChange({
      ...filters,
      state: newStates.length > 0 ? newStates : undefined
    });
  };

  const handleTagFilter = (tagId: string) => {
    const currentTags = filters.tags || [];
    const newTags = currentTags.includes(tagId)
      ? currentTags.filter(t => t !== tagId)
      : [...currentTags, tagId];
    
    onFiltersChange({
      ...filters,
      tags: newTags.length > 0 ? newTags : undefined
    });
  };

  const handleFactionFilter = (faction: string) => {
    const currentFactions = filters.factions || [];
    const newFactions = currentFactions.includes(faction)
      ? currentFactions.filter(f => f !== faction)
      : [...currentFactions, faction];
    
    onFiltersChange({
      ...filters,
      factions: newFactions.length > 0 ? newFactions : undefined
    });
  };

  const clearAllFilters = () => {
    setSearchInput('');
    onFiltersChange({});
  };

  const activeFilterCount = 
    (filters.state?.length || 0) + 
    (filters.tags?.length || 0) + 
    (filters.factions?.length || 0) +
    (filters.search ? 1 : 0);

  return (
    <div className="filter-panel">
      <div className="filter-header">
        <h2>
          <Filter size={20} />
          Filters
        </h2>
        {activeFilterCount > 0 && (
          <button 
            className="clear-filters-btn"
            onClick={clearAllFilters}
            title="Clear all filters"
          >
            Clear ({activeFilterCount})
          </button>
        )}
      </div>

      {/* Search */}
      <div className="filter-section">
        <div className="search-box">
          <Search size={16} />
          <input
            type="text"
            placeholder="Search quests, objectives, logs..."
            value={searchInput}
            onChange={(e) => handleSearchChange(e.target.value)}
          />
        </div>
      </div>

      {/* Quest State Filters */}
      <div className="filter-section">
        <h3>Quest State</h3>
        <div className="filter-group">
          {Object.values(QuestState).map(state => (
            <label key={state} className="filter-checkbox">
              <input
                type="checkbox"
                checked={(filters.state || []).includes(state)}
                onChange={() => handleStateFilter(state)}
              />
              <span className={`state-badge state-${state}`}>
                {state.charAt(0).toUpperCase() + state.slice(1)}
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* Faction Filters */}
      {factions.length > 0 && (
        <div className="filter-section">
          <h3>
            <Users size={16} />
            Factions
          </h3>
          <div className="filter-group">
            {factions.map(faction => (
              <label key={faction} className="filter-checkbox">
                <input
                  type="checkbox"
                  checked={(filters.factions || []).includes(faction)}
                  onChange={() => handleFactionFilter(faction)}
                />
                <span>{faction}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Tag Filters */}
      {tags.length > 0 && (
        <div className="filter-section">
          <h3>
            <Tag size={16} />
            Tags
          </h3>
          <div className="filter-group">
            {tags.map(tag => (
              <label key={tag.id} className="filter-checkbox">
                <input
                  type="checkbox"
                  checked={(filters.tags || []).includes(tag.id)}
                  onChange={() => handleTagFilter(tag.id)}
                />
                <span 
                  className="tag-badge"
                  style={{ backgroundColor: tag.color_hex }}
                >
                  {tag.name}
                </span>
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default FilterPanel;
