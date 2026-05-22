import { create } from 'zustand';

export type DesktopCastStatus =
    | 'connected'
    | 'connecting'
    | 'disconnected'
    | 'no-devices'
    | 'unavailable';

export interface DesktopCastDevice {
    id: string;
    isSelected: boolean;
    name: string;
}

export interface DesktopCastState {
    deviceName: string | null;
    devices: DesktopCastDevice[];
    isConnected: boolean;
    isScanning: boolean;
    status: DesktopCastStatus;
}

const initialCastState: DesktopCastState = {
    deviceName: null,
    devices: [],
    isConnected: false,
    isScanning: false,
    status: 'unavailable',
};

interface CastStore {
    cast: DesktopCastState;
    setCast: (cast: Partial<DesktopCastState>) => void;
}

export const useCastStore = create<CastStore>((set) => ({
    cast: initialCastState,
    setCast: (next) =>
        set((state) => ({
            cast: { ...state.cast, ...next },
        })),
}));

export const useDesktopCastState = () => useCastStore((state) => state.cast);

export const useDesktopCastActions = () => useCastStore((state) => ({ setCast: state.setCast }));
