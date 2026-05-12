import { useEffect, useState } from 'react';
import { HocuspocusProvider } from '@hocuspocus/provider';

interface PresenceState {
  user?: {
    name: string;
    color: string;
  };
}

interface PresenceUser {
  clientId: number;
  name: string;
  color: string;
}

interface PresenceBarProps {
  provider: HocuspocusProvider;
  /** Email of the current user — their avatar is hidden from the bar. */
  ownEmail: string;
}

export function PresenceBar({ provider, ownEmail }: PresenceBarProps) {
  const [users, setUsers] = useState<PresenceUser[]>([]);

  useEffect(() => {
    const updateUsers = () => {
      const states = provider.awareness?.getStates();
      if (!states) return;

      // The local client's awareness ID — filter it out so users don't
      // see their own avatar.
      const ownClientId = provider.awareness?.clientID ?? -1;

      // Deduplicate remote users by email so that multiple WebSocket
      // connections from the same account only produce one avatar.
      const seenNames = new Set<string>();
      const presenceUsers: PresenceUser[] = [];

      states.forEach((state: unknown, clientId: number) => {
        if (clientId === ownClientId) return;
        const typedState = state as PresenceState;
        if (typedState?.user && !seenNames.has(typedState.user.name)) {
          seenNames.add(typedState.user.name);
          presenceUsers.push({
            clientId,
            name: typedState.user.name,
            color: typedState.user.color,
          });
        }
      });

      setUsers(presenceUsers);
    };

    updateUsers();
    provider.awareness?.on('change', updateUsers);

    return () => {
      provider.awareness?.off('change', updateUsers);
    };
  }, [provider, ownEmail]);

  const visibleUsers = users.slice(0, 5);
  const overflow = users.length - 5;

  if (users.length === 0) return null;

  return (
    <div className="flex items-center gap-1">
      {visibleUsers.map((user) => (
        <div
          key={user.clientId}
          className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0 cursor-default"
          style={{ backgroundColor: user.color }}
          title={user.name}
        >
          {user.name.charAt(0).toUpperCase()}
        </div>
      ))}
      {overflow > 0 && (
        <div className="w-7 h-7 rounded-full bg-gray-300 flex items-center justify-center text-gray-700 text-xs font-bold">
          +{overflow}
        </div>
      )}
    </div>
  );
}
