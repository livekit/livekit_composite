import { useState } from 'react';
import { Button } from '@/components/ui/button';

interface WelcomeProps {
  disabled: boolean;
  startButtonText: string;
  onStartCall: (phoneNumber: string) => void;
}

export const Welcome = ({
  disabled,
  startButtonText,
  onStartCall,
  ref,
}: React.ComponentProps<'div'> & WelcomeProps) => {
  const [phoneNumber, setPhoneNumber] = useState('');

  const formatPhoneNumber = (number: string): string => {
    // Remove all non-digit characters
    const digitsOnly = number.replace(/\D/g, '');

    // If it's 10 digits, assume it's a US number and add 1
    if (digitsOnly.length === 10) {
      return `+1${digitsOnly}`;
    }

    // If it doesn't start with +, add it
    if (digitsOnly.length > 0 && !number.startsWith('+')) {
      return `+${digitsOnly}`;
    }

    // If it already starts with +, just return the cleaned number
    return number.startsWith('+') ? `+${digitsOnly}` : digitsOnly;
  };

  const handleStartCall = () => {
    if (phoneNumber) {
      const formattedNumber = formatPhoneNumber(phoneNumber);
      onStartCall(formattedNumber);
    }
  };

  return (
    <div
      ref={ref}
      inert={disabled}
      className="fixed inset-0 z-10 mx-auto flex h-svh flex-col items-center justify-center text-center"
    >
      <div className="mx-auto mb-4 text-6xl">📞</div>
      <h1 className="font-semibold">LiveKit Phone Caller</h1>
      <p className="text-muted-foreground max-w-prose pt-1 font-medium">
        Connect to any phone number through LiveKit&apos;s SIP integration.
        <br />
        Enter a phone number below to start your call.
      </p>
      <div className="mt-8 flex flex-col items-center gap-4">
        <input
          type="tel"
          value={phoneNumber}
          onChange={(e) => setPhoneNumber(e.target.value)}
          placeholder="Enter phone number"
          className="focus:border-primary focus:ring-primary/20 w-64 rounded-lg border border-gray-300 px-4 py-2 text-center font-mono text-sm focus:ring-2 focus:outline-none"
          disabled={disabled}
        />
        <Button
          variant="primary"
          size="lg"
          onClick={handleStartCall}
          className="w-64 font-mono"
          disabled={!phoneNumber || disabled}
        >
          {startButtonText}
        </Button>
      </div>
    </div>
  );
};
