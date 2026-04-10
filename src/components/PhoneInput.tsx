import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface PhoneInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

const BD_PHONE_REGEX = /^(\+880\s?1[3-9]\d{2}-?\d{6}|01[3-9]\d{2}-?\d{6})$/;

export function isValidBDPhone(phone: string): boolean {
  if (!phone || phone.trim() === '') return true; // empty is valid (optional field)
  return BD_PHONE_REGEX.test(phone.trim());
}

export function formatBDPhone(raw: string): string {
  // Strip everything except digits and +
  const digits = raw.replace(/[^\d+]/g, '');
  
  // Auto-format as user types
  if (digits.startsWith('+880')) {
    const local = digits.slice(4);
    if (local.length <= 5) return `+880 ${local}`;
    return `+880 ${local.slice(0, 5)}-${local.slice(5, 11)}`;
  }
  if (digits.startsWith('880')) {
    const local = digits.slice(3);
    if (local.length <= 5) return `+880 ${local}`;
    return `+880 ${local.slice(0, 5)}-${local.slice(5, 11)}`;
  }
  if (digits.startsWith('01')) {
    if (digits.length <= 5) return digits;
    return `${digits.slice(0, 5)}-${digits.slice(5, 11)}`;
  }
  return raw;
}

export function PhoneInput({ value, onChange, placeholder = '+880 1XXX-XXXXXX', className }: PhoneInputProps) {
  const [touched, setTouched] = useState(false);
  const isValid = isValidBDPhone(value);
  const showError = touched && value.trim() !== '' && !isValid;

  return (
    <div className="space-y-1">
      <Input
        type="tel"
        value={value}
        onChange={(e) => {
          const formatted = formatBDPhone(e.target.value);
          onChange(formatted);
        }}
        onBlur={() => setTouched(true)}
        placeholder={placeholder}
        className={cn(showError && 'border-destructive focus-visible:ring-destructive', className)}
        maxLength={18}
      />
      {showError && (
        <p className="text-xs text-destructive">
          Please enter a valid Bangladesh phone number (e.g., +880 1XXXX-XXXXXX or 01XXX-XXXXXX)
        </p>
      )}
    </div>
  );
}
