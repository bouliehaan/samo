import { type ServerAuthenticationResult } from '@samo/core/server';
import { createContext, useContext } from 'react';

export const ServerConnectionsContext = createContext<ServerAuthenticationResult | null>(null);

export const useServerConnections = () => useContext(ServerConnectionsContext);
