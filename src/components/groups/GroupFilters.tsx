import React from 'react';
import { Search, Filter, SlidersHorizontal } from 'lucide-react';

interface GroupFiltersProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  selectedCategory: string;
  onCategoryChange: (category: string) => void;
  categories?: string[];
  selectedLocation: string;
  onLocationChange: (location: string) => void;
  locations?: string[];
  sortBy: string;
  onSortChange: (sort: string) => void;
  sortOptions?: Array<{ value: string; label: string }>;
}

const sortOptions = [
  { value: 'popular', label: 'Most Popular' },
  { value: 'newest', label: 'Newest First' },
  { value: 'savings', label: 'Highest Savings' },
  { value: 'contribution', label: 'Lowest Contribution' },
];

const GroupFilters: React.FC<GroupFiltersProps> = ({
  searchQuery,
  onSearchChange,
  selectedCategory,
  onCategoryChange,
  categories = [],
  selectedLocation,
  onLocationChange,
  locations = [],
  sortBy,
  onSortChange,
  sortOptions: sortOptionsOverride,
}) => {
  const categoryOptions = React.useMemo(() => {
    const unique = Array.from(
      new Set(
        categories.map((cat) => String(cat).trim()).filter((cat) => cat),
      ),
    );
    if (!unique.some((cat) => cat === 'All Categories')) {
      unique.unshift('All Categories');
    }
    return unique;
  }, [categories]);

  const locationOptions = React.useMemo(() => {
    const unique = Array.from(
      new Set(
        locations.map((loc) => String(loc).trim()).filter((loc) => loc),
      ),
    );
    if (!unique.some((loc) => loc === 'All Locations')) {
      unique.unshift('All Locations');
    }
    return unique;
  }, [locations]);

  const effectiveSortOptions = sortOptionsOverride?.length
    ? sortOptionsOverride
    : sortOptions;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-6">
      {/* Search Bar */}
      <div className="relative mb-4">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search groups by name, description, or location..."
          className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
        />
      </div>

      {/* Filter Row */}
      <div className="flex flex-wrap gap-4">
        {/* Category Filter */}
        <div className="flex-1 min-w-[200px]">
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Category
          </label>
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <select
              value={selectedCategory}
              onChange={(e) => onCategoryChange(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none appearance-none bg-white"
            >
              {categoryOptions.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Location Filter */}
        <div className="flex-1 min-w-[200px]">
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Location
          </label>
            <select
              value={selectedLocation}
              onChange={(e) => onLocationChange(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none appearance-none bg-white"
            >
              {locationOptions.map((loc) => (
                <option key={loc} value={loc}>
                  {loc}
                </option>
              ))}
            </select>
        </div>

        {/* Sort By */}
        <div className="flex-1 min-w-[200px]">
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Sort By
          </label>
          <div className="relative">
            <SlidersHorizontal className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <select
              value={sortBy}
              onChange={(e) => onSortChange(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none appearance-none bg-white"
            >
              {effectiveSortOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Quick Category Pills */}
      <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-gray-100">
        {categoryOptions
          .filter((cat) => cat !== 'All Categories')
          .map((cat) => (
          <button
            key={cat}
            onClick={() => onCategoryChange(cat)}
            className={`px-4 py-1.5 text-sm font-medium rounded-full transition-colors ${
              selectedCategory === cat
                ? 'bg-emerald-500 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>
    </div>
  );
};

export default GroupFilters;
