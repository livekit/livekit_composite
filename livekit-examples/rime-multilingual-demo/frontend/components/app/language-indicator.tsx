'use client';

import { useEffect, useRef, useState } from 'react';
import { useSessionContext, useVoiceAssistant } from '@livekit/components-react';
import { APP_CONFIG_DEFAULTS } from '@/app-config';
import { cn } from '@/lib/shadcn/utils';

const DEFAULT_LANGUAGE = 'English';
const LANGUAGE_ATTR = 'current_language';

export function LanguageIndicator() {
  const session = useSessionContext();
  const { agentAttributes } = useVoiceAssistant();
  const displayLanguage = agentAttributes?.[LANGUAGE_ATTR] ?? DEFAULT_LANGUAGE;

  const prevLanguageRef = useRef<string | null>(null);
  const [isPulsing, setIsPulsing] = useState(false);

  useEffect(() => {
    if (prevLanguageRef.current !== null && prevLanguageRef.current !== displayLanguage) {
      setIsPulsing(true);
    }
    prevLanguageRef.current = displayLanguage;
  }, [displayLanguage]);

  if (!session.isConnected) return null;

  const teal = APP_CONFIG_DEFAULTS.accentDark ?? '#1fd5f9';

  return (
    <>
      <style>{`@keyframes ring-pulse-once{0%,100%{opacity:0}50%{opacity:1}}`}</style>
      <span className="relative mr-2 inline-flex">
        <span
          className={cn(
            'pointer-events-none absolute -inset-[3px] rounded-full ring-2 ring-[var(--language-indicator-teal)]',
            !isPulsing && 'opacity-0',
            isPulsing && 'animate-[ring-pulse-once_1.2s_ease-in-out_1]'
          )}
          style={{
            ['--language-indicator-teal' as string]: teal,
            ...(isPulsing && { animationFillMode: 'forwards' }),
          }}
          onAnimationEnd={() => setIsPulsing(false)}
          aria-hidden
        />
        <span
          className={cn(
            'relative inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium',
            'bg-muted text-muted-foreground shrink-0'
          )}
        >
          {displayLanguage}
        </span>
      </span>
    </>
  );
}
