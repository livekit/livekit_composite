'use client';

import * as React from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { useLocalParticipant } from '@livekit/components-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface DtmfKeypadProps extends React.HTMLAttributes<HTMLDivElement> {
  isOpen: boolean;
  onClose?: () => void;
}

const DTMF_KEYS = [
  { value: '1', dtmfCode: 1, label: '1' },
  { value: '2', dtmfCode: 2, label: '2', subLabel: 'ABC' },
  { value: '3', dtmfCode: 3, label: '3', subLabel: 'DEF' },
  { value: '4', dtmfCode: 4, label: '4', subLabel: 'GHI' },
  { value: '5', dtmfCode: 5, label: '5', subLabel: 'JKL' },
  { value: '6', dtmfCode: 6, label: '6', subLabel: 'MNO' },
  { value: '7', dtmfCode: 7, label: '7', subLabel: 'PQRS' },
  { value: '8', dtmfCode: 8, label: '8', subLabel: 'TUV' },
  { value: '9', dtmfCode: 9, label: '9', subLabel: 'WXYZ' },
  { value: '*', dtmfCode: 10, label: '*' },
  { value: '0', dtmfCode: 0, label: '0', subLabel: '+' },
  { value: '#', dtmfCode: 11, label: '#' },
];

export function DtmfKeypad({ isOpen, onClose, className }: DtmfKeypadProps) {
  const { localParticipant } = useLocalParticipant();
  const [pressedKeys, setPressedKeys] = React.useState<Set<string>>(new Set());

  const handleKeyPress = React.useCallback(
    async (key: (typeof DTMF_KEYS)[0]) => {
      // Visual feedback
      setPressedKeys((prev) => new Set(prev).add(key.value));
      setTimeout(() => {
        setPressedKeys((prev) => {
          const next = new Set(prev);
          next.delete(key.value);
          return next;
        });
      }, 150);

      // Send DTMF tone
      try {
        await localParticipant.publishDtmf(key.dtmfCode, key.value);
      } catch (error) {
        console.error('Failed to send DTMF tone:', error);
      }
    },
    [localParticipant]
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className={cn(
            'bg-background border-border absolute bottom-full left-0 mb-2 rounded-2xl border p-4 shadow-lg',
            'z-50 min-w-[280px]',
            className
          )}
        >
          <div className="grid grid-cols-3 gap-2">
            {DTMF_KEYS.map((key) => (
              <Button
                key={key.value}
                variant="outline"
                size="lg"
                onClick={() => handleKeyPress(key)}
                className={cn(
                  'relative h-14 font-mono text-lg transition-all',
                  'hover:bg-accent hover:text-accent-foreground',
                  'active:scale-95',
                  pressedKeys.has(key.value) && 'bg-primary text-primary-foreground scale-95'
                )}
              >
                <span className="text-xl font-semibold">{key.label}</span>
                {key.subLabel && (
                  <span className="text-muted-foreground absolute bottom-1 text-[10px]">
                    {key.subLabel}
                  </span>
                )}
              </Button>
            ))}
          </div>
          {onClose && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground mt-3 w-full"
            >
              Close keypad
            </Button>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
