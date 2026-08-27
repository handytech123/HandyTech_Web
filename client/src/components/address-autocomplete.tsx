import { useEffect, useRef, useState } from "react";
import { Loader2, MapPin } from "lucide-react";
import { Input } from "@/components/ui/input";

export type SelectedAddress = { street: string; city: string; state: string; zip: string; formattedAddress: string };

type Suggestion = { placeId: string; text: string };

export default function AddressAutocomplete({
  value,
  onChange,
  onAddressSelect,
  placeholder = "Start typing the service address",
  id,
  testId,
}: {
  value: string;
  onChange: (value: string) => void;
  onAddressSelect: (address: SelectedAddress) => void;
  placeholder?: string;
  id?: string;
  testId?: string;
}) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const sessionToken = useRef(crypto.randomUUID());

  useEffect(() => {
    const input = value.trim();
    if (input.length < 3 || !open) { setSuggestions([]); return; }
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/places/autocomplete?input=${encodeURIComponent(input)}&sessionToken=${encodeURIComponent(sessionToken.current)}`, { signal: controller.signal });
        if (!response.ok) { setSuggestions([]); return; }
        const data = await response.json();
        setSuggestions(data.suggestions || []);
      } catch (error) {
        if ((error as Error).name !== "AbortError") setSuggestions([]);
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [value, open]);

  const chooseSuggestion = async (suggestion: Suggestion) => {
    setOpen(false);
    setSuggestions([]);
    setLoading(true);
    try {
      const response = await fetch(`/api/places/details/${encodeURIComponent(suggestion.placeId)}?sessionToken=${encodeURIComponent(sessionToken.current)}`);
      if (!response.ok) throw new Error("Address details unavailable");
      const address = await response.json() as SelectedAddress;
      onAddressSelect(address);
      sessionToken.current = crypto.randomUUID();
    } catch {
      onChange(suggestion.text);
    } finally {
      setLoading(false);
    }
  };

  return <div className="relative">
    <div className="relative">
      <Input id={id} value={value} onChange={(event) => { onChange(event.target.value); setOpen(true); }} onFocus={() => setOpen(true)} onBlur={() => window.setTimeout(() => setOpen(false), 150)} placeholder={placeholder} autoComplete="street-address" data-testid={testId} className="pr-9" />
      {loading ? <Loader2 className="absolute right-3 top-3 h-4 w-4 animate-spin text-muted-foreground" /> : <MapPin className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />}
    </div>
    {open && suggestions.length > 0 && <div className="absolute z-50 mt-1 w-full overflow-hidden rounded-md border bg-white shadow-lg">
      {suggestions.map((suggestion) => <button key={suggestion.placeId} type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => chooseSuggestion(suggestion)} className="flex w-full items-start gap-2 border-b px-3 py-3 text-left text-sm hover:bg-slate-50 last:border-b-0">
        <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-brand-primary" /><span>{suggestion.text}</span>
      </button>)}
      <div className="px-3 py-1.5 text-right text-[10px] font-medium text-slate-500">Powered by Google</div>
    </div>}
  </div>;
}
