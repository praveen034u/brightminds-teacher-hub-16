import { useState, useEffect } from 'react';
import { Search, Filter, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { useNavigate } from 'react-router-dom';

interface SearchResult {
  id: string;
  title: string;
  type: 'assignment' | 'student' | 'room';
  description?: string;
  path: string;
}

interface GlobalSearchProps {
  data?: {
    assignments?: any[];
    students?: any[];
    rooms?: any[];
  };
  onSearch?: (query: string) => void;
  placeholder?: string;
}

export const GlobalSearch = ({ data, onSearch, placeholder = "Search assignments, students, rooms..." }: GlobalSearchProps) => {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [filters, setFilters] = useState<string[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    if (!query.trim() || !data) {
      setResults([]);
      return;
    }

    const searchResults: SearchResult[] = [];
    const lowercaseQuery = query.toLowerCase();

    // Search assignments
    if (data.assignments && (filters.length === 0 || filters.includes('assignments'))) {
      data.assignments
        .filter(item => 
          item.title?.toLowerCase().includes(lowercaseQuery) ||
          item.description?.toLowerCase().includes(lowercaseQuery)
        )
        .forEach(item => {
          searchResults.push({
            id: item.id,
            title: item.title,
            type: 'assignment',
            description: item.description,
            path: '/assignments'
          });
        });
    }

    // Search students
    if (data.students && (filters.length === 0 || filters.includes('students'))) {
      data.students
        .filter(item => 
          item.name?.toLowerCase().includes(lowercaseQuery) ||
          item.email?.toLowerCase().includes(lowercaseQuery)
        )
        .forEach(item => {
          searchResults.push({
            id: item.id,
            title: item.name,
            type: 'student',
            description: item.email,
            path: '/students'
          });
        });
    }

    // Search rooms
    if (data.rooms && (filters.length === 0 || filters.includes('rooms'))) {
      data.rooms
        .filter(item => 
          item.name?.toLowerCase().includes(lowercaseQuery) ||
          item.description?.toLowerCase().includes(lowercaseQuery)
        )
        .forEach(item => {
          searchResults.push({
            id: item.id,
            title: item.name,
            type: 'room',
            description: item.description,
            path: `/rooms/${item.id}`
          });
        });
    }

    setResults(searchResults.slice(0, 10)); // Limit results
  }, [query, data, filters]);

  const handleInputChange = (value: string) => {
    setQuery(value);
    onSearch?.(value);
    setIsOpen(value.length > 0);
  };

  const handleResultClick = (result: SearchResult) => {
    navigate(result.path);
    setIsOpen(false);
    setQuery('');
  };

  const toggleFilter = (filter: string) => {
    setFilters(prev => 
      prev.includes(filter)
        ? prev.filter(f => f !== filter)
        : [...prev, filter]
    );
  };

  const clearFilters = () => {
    setFilters([]);
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'assignment': return '📝';
      case 'student': return '👤';
      case 'room': return '🏠';
      default: return '📄';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'assignment': return 'bg-blue-100 text-blue-800';
      case 'student': return 'bg-green-100 text-green-800';
      case 'room': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="relative max-w-md">
      <div className="relative">
        <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
        <Input
          placeholder={placeholder}
          value={query}
          onChange={(e) => handleInputChange(e.target.value)}
          onFocus={() => setIsOpen(query.length > 0)}
          className="pl-10 pr-12"
        />
        <Popover>
          <PopoverTrigger asChild>
            <Button 
              variant="ghost" 
              size="sm" 
              className="absolute right-1 top-1 h-8 w-8 p-0"
            >
              <Filter className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-56" align="end">
            <div className="space-y-2">
              <h4 className="font-medium">Filter by type</h4>
              <div className="space-y-1">
                {['assignments', 'students', 'rooms'].map(filter => (
                  <label key={filter} className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={filters.includes(filter)}
                      onChange={() => toggleFilter(filter)}
                      className="rounded"
                    />
                    <span className="text-sm capitalize">{filter}</span>
                  </label>
                ))}
              </div>
              {filters.length > 0 && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={clearFilters}
                  className="w-full"
                >
                  <X className="h-3 w-3 mr-1" />
                  Clear filters
                </Button>
              )}
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* Active Filters */}
      {filters.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {filters.map(filter => (
            <Badge 
              key={filter} 
              variant="secondary" 
              className="text-xs cursor-pointer"
              onClick={() => toggleFilter(filter)}
            >
              {filter}
              <X className="h-3 w-3 ml-1" />
            </Badge>
          ))}
        </div>
      )}

      {/* Search Results */}
      {isOpen && results.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50 max-h-80 overflow-y-auto">
          <Command>
            <CommandList>
              <CommandGroup heading="Search Results">
                {results.map((result) => (
                  <CommandItem
                    key={result.id}
                    onSelect={() => handleResultClick(result)}
                    className="cursor-pointer"
                  >
                    <div className="flex items-center gap-3 w-full">
                      <span className="text-lg">{getTypeIcon(result.type)}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium truncate">{result.title}</span>
                          <Badge 
                            variant="secondary" 
                            className={`text-xs ${getTypeColor(result.type)}`}
                          >
                            {result.type}
                          </Badge>
                        </div>
                        {result.description && (
                          <p className="text-sm text-gray-500 truncate">{result.description}</p>
                        )}
                      </div>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </div>
      )}

      {isOpen && query.length > 0 && results.length === 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50 p-4 text-center text-gray-500">
          No results found for "{query}"
        </div>
      )}
    </div>
  );
};