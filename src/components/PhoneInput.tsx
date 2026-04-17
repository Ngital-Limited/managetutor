import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface PhoneInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

// Strict format: 01XXXXXXXXX (11 digits, starting with 01, 3rd digit 3-9)
const BD_PHONE_REGEX = /^01[3-9]\d{8}$/;

export function isValidBDPhone(phone: string): boolean {
  if (!phone || phone.trim() === '') return true; // empty is valid (optional field)
  return BD_PHONE_REGEX.test(phone.trim());
}

export function formatBDPhone(raw: string): string {
  // Keep digits only
  let digits = raw.replace(/\D/g, '');

  // Strip country code variants
  if (digits.startsWith('880')) digits = digits.slice(3);
  if (digits.startsWith('0') && digits.length > 11) {
    // keep first 11
  }

  // Ensure starts with 0 if user typed 1XXXXXXXXX
  if (digits.length > 0 && digits[0] === '1') {
    digits = '0' + digits;
  }

  return digits.slice(0, 11);
}

export function PhoneInput({ value, onChange, placeholder = '01XXXXXXXXX', className }: PhoneInputProps) {
  const [touched, setTouched] = useState(false);
  const isValid = isValidBDPhone(value);
  const showError = touched && value.trim() !== '' && !isValid;

  return (
    <div className="space-y-1">
      <Input
        type="tel"
        inputMode="numeric"
        value={value}
        onChange={(e) => onChange(formatBDPhone(e.target.value))}
        onBlur={() => setTouched(true)}
        placeholder={placeholder}
        className={cn(showError && 'border-destructive focus-visible:ring-destructive', className)}
        maxLength={11}
      />
      {showError && (
        <p className="text-xs text-destructive">
          Please enter a valid 11-digit Bangladesh phone number (e.g., 01712345678)
        </p>
      )}
    </div>
  );
}
