import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Check, ChevronsUpDown, X, Plus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface Option {
  value: string;
  label: string;
  group?: string;
}

interface MultiSearchableSelectProps {
  options: Option[];
  values: string[];
  onValuesChange: (values: string[]) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  grouped?: boolean;
  className?: string;
  /** When provided, allows creating a new option from the search query. Should return the new option's value (string) once persisted. */
  onCreateOption?: (label: string) => Promise<string | null> | string | null;
  createLabel?: string;
}

export function MultiSearchableSelect({
  options,
  values,
  onValuesChange,
  placeholder = 'Select...',
  searchPlaceholder = 'Search...',
  emptyText = 'No results found.',
  grouped = false,
  className,
  onCreateOption,
  createLabel = 'Add',
}: MultiSearchableSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [creating, setCreating] = useState(false);

  const selectedLabels = useMemo(() => {
    return values.map(v => options.find(o => o.value === v)?.label).filter(Boolean) as string[];
  }, [options, values]);

  const groups = useMemo(() => {
    if (!grouped) return null;
    const map = new Map<string, Option[]>();
    options.forEach((o) => {
      const g = o.group || '';
      if (!map.has(g)) map.set(g, []);
      map.get(g)!.push(o);
    });
    return map;
  }, [options, grouped]);

  const toggleValue = (val: string) => {
    if (values.includes(val)) {
      onValuesChange(values.filter(v => v !== val));
    } else {
      onValuesChange([...values, val]);
    }
  };

  const removeValue = (val: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onValuesChange(values.filter(v => v !== val));
  };

  const handleCreate = async () => {
    if (!onCreateOption || !query.trim() || creating) return;
    setCreating(true);
    try {
      const newVal = await onCreateOption(query.trim());
      if (newVal) {
        onValuesChange([...values, newVal]);
        setQuery('');
      }
    } finally {
      setCreating(false);
    }
  };

  const trimmedQuery = query.trim().toLowerCase();
  const hasExactMatch = trimmedQuery.length > 0 && options.some(o => o.label.toLowerCase() === trimmedQuery);
  const showCreate = !!onCreateOption && trimmedQuery.length > 0 && !hasExactMatch;

  const renderItems = (items: Option[]) =>
    items.map((option) => (
      <CommandItem
        key={option.value}
        value={option.label}
        onSelect={() => toggleValue(option.value)}
      >
        <Check
          className={cn('mr-2 h-4 w-4', values.includes(option.value) ? 'opacity-100' : 'opacity-0')}
        />
        {option.label}
      </CommandItem>
    ));

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn('w-full justify-between font-normal min-h-[40px] h-auto', className)}
        >
          <div className="flex flex-wrap gap-1 flex-1 text-left">
            {selectedLabels.length > 0 ? (
              selectedLabels.map((label, i) => (
                <Badge key={i} variant="secondary" className="text-xs">
                  {label}
                  <X className="h-3 w-3 ml-1 cursor-pointer" onClick={(e) => removeValue(values[i], e)} />
                </Badge>
              ))
            ) : (
              <span className="text-muted-foreground">{placeholder}</span>
            )}
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" align="start">
        <Command>
          <CommandInput placeholder={searchPlaceholder} value={query} onValueChange={setQuery} />
          <CommandList>
            {showCreate && (
              <CommandGroup>
                <CommandItem
                  value={`__create__${query}`}
                  onSelect={handleCreate}
                  disabled={creating}
                  className="text-primary"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  {creating ? 'Adding…' : `${createLabel} "${query.trim()}"`}
                </CommandItem>
              </CommandGroup>
            )}
            <CommandEmpty>{showCreate ? null : emptyText}</CommandEmpty>
            {grouped && groups ? (
              Array.from(groups.entries()).map(([groupName, items]) => (
                <CommandGroup key={groupName} heading={groupName}>
                  {renderItems(items)}
                </CommandGroup>
              ))
            ) : (
              <CommandGroup>{renderItems(options)}</CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
