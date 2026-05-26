const CAST_SENDER_SCRIPT =
    'https://www.gstatic.com/cv/js/sender/v1/cast_sender.js?loadCastFramework=1';

let loadPromise: null | Promise<boolean> = null;

export const isCastApiAvailable = () =>
    typeof window !== 'undefined' &&
    Boolean((window as Window & { cast?: { framework?: unknown } }).cast?.framework);

export const loadCastFramework = (): Promise<boolean> => {
    if (isCastApiAvailable()) {
        return Promise.resolve(true);
    }

    if (loadPromise) {
        return loadPromise;
    }

    loadPromise = new Promise((resolve) => {
        const existing = document.querySelector<HTMLScriptElement>(
            'script[data-samo-cast-sender="true"]',
        );
        if (existing) {
            existing.addEventListener('load', () => resolve(isCastApiAvailable()), { once: true });
            existing.addEventListener('error', () => resolve(false), { once: true });
            return;
        }

        const script = document.createElement('script');
        script.async = true;
        script.dataset.samoCastSender = 'true';
        script.src = CAST_SENDER_SCRIPT;
        script.onload = () => resolve(isCastApiAvailable());
        script.onerror = () => resolve(false);
        document.head.appendChild(script);
    });

    return loadPromise;
};
