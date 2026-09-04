import { isSamoApiMediaUrl } from '@samo/core/server';
import clsx from 'clsx';
import {
    ForwardedRef,
    forwardRef,
    HTMLAttributes,
    type ImgHTMLAttributes,
    memo,
    ReactNode,
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react';

import styles from './image.module.css';
import { useNativeImage } from './use-native-image';

import { AppIcon, Icon } from '/@/shared/components/icon/icon';
import { Skeleton } from '/@/shared/components/skeleton/skeleton';
import { useDebouncedValue } from '/@/shared/hooks/use-debounced-value';
import { useInViewport } from '/@/shared/hooks/use-in-viewport';
import { ImageRequest } from '/@/shared/types/domain-types';

const loadedImageCacheKeys = new Set<string>();

export interface ImageProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'src'> {
    containerClassName?: string;
    enableAnimation?: boolean;
    enableDebounce?: boolean;
    enableViewport?: boolean;
    fetchPriority?: 'auto' | 'high' | 'low';
    imageContainerProps?: Omit<ImageContainerProps, 'children'>;
    imageRequest?: ImageRequest;
    includeLoader?: boolean;
    includeUnloader?: boolean;
    isExplicit?: boolean;
    src: string | undefined;
    unloaderIcon?: keyof typeof AppIcon;
}

interface ImageContainerProps extends HTMLAttributes<HTMLDivElement> {
    children: ReactNode;
    isExplicit?: boolean;
}

interface ImageLoaderProps {
    className?: string;
}

interface ImageUnloaderProps {
    className?: string;
    icon?: keyof typeof AppIcon;
}

export const FALLBACK_SVG =
    'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMDAiIGhlaWdodD0iMzAwIj48ZmlsdGVyIGlkPSJhIiB4PSIwIiB5PSIwIj48ZmVUdXJidWxlbmNlIHR5cGU9ImZyYWN0YWxOb2lzZSIgYmFzZUZyZXF1ZW5jeT0iLjc1IiBzdGl0Y2hUaWxlcz0ic3RpdGNoIi8+PGZlQ29sb3JNYXRyaXggdHlwZT0ic2F0dXJhdGUiIHZhbHVlcz0iMCIvPjwvZmlsdGVyPjxwYXRoIGZpbHRlcj0idXJsKCNhKSIgb3BhY2l0eT0iLjA1IiBkPSJNMCAwaDMwMHYzMDBIMHoiLz48L3N2Zz4=';

export function BaseImage({
    className,
    containerClassName,
    enableAnimation = false,
    enableDebounce = false,
    enableViewport = true,
    fetchPriority,
    imageContainerProps,
    imageRequest,
    includeLoader = true,
    includeUnloader = true,
    isExplicit = false,
    onError,
    onLoad,
    src,
    unloaderIcon = 'emptyImage',
    ...props
}: ImageProps) {
    const viewport = useInViewport();
    const { inViewport, ref } = enableViewport ? viewport : { inViewport: true, ref: undefined };
    const { className: containerPropsClassName, ...restContainerProps } = imageContainerProps || {};

    const rawImageRequest = useMemo(() => {
        if (src && isSamoApiMediaUrl(src) && !imageRequest) {
            return undefined;
        }

        return (
            imageRequest ??
            (src && !isSamoApiMediaUrl(src) ? { cacheKey: src, url: src } : undefined)
        );
    }, [imageRequest, src]);
    const isInSessionCache = Boolean(
        rawImageRequest?.cacheKey && loadedImageCacheKeys.has(rawImageRequest.cacheKey),
    );
    const [debouncedImageRequest] = useDebouncedValue(rawImageRequest, 100, {
        waitForInitial: true,
    });
    const effectiveImageRequest =
        isInSessionCache || !enableDebounce ? rawImageRequest : debouncedImageRequest;

    const [hasLoadedInInstance, setHasLoadedInInstance] = useState(false);

    useEffect(() => {
        setHasLoadedInInstance(false);
    }, [effectiveImageRequest?.cacheKey]);

    const shouldLoadImage = Boolean(
        effectiveImageRequest &&
        (!enableViewport || isInSessionCache || inViewport || hasLoadedInInstance),
    );

    // samo media URLs go straight into <img>. They no longer carry a stream
    // token — the main process attaches the bearer to these requests — and a
    // plain <img> is what lets Chromium's disk cache serve the same cover on
    // the next launch instead of re-fetching it into a per-session blob.
    // `directImageFailed` still falls back to the header-carrying fetch below,
    // which covers the window before the credential is registered.
    // The request URL is preferred over a raw `src`: it is the fully resolved
    // form, re-homed onto the connected origin and carrying the `width` for the
    // slot. A caller that passes both (long-form covers do) would otherwise
    // render the unresolved `src` and quietly fetch a full-size original.
    const samoDirectSrc = useMemo(() => {
        const candidates = [effectiveImageRequest?.url, src];
        for (const candidate of candidates) {
            if (candidate && isSamoApiMediaUrl(candidate)) {
                return candidate;
            }
        }
        return undefined;
    }, [src, effectiveImageRequest?.url]);

    const [directImageFailed, setDirectImageFailed] = useState(false);

    useEffect(() => {
        setDirectImageFailed(false);
    }, [samoDirectSrc]);

    const nativeImage = useNativeImage({
        enabled: shouldLoadImage && (!samoDirectSrc || directImageFailed),
        fetchPriority,
        onFetchError: src
            ? () => {
                  (onError as ((event: undefined) => void) | undefined)?.(undefined);
              }
            : undefined,
        request: effectiveImageRequest,
    });

    useEffect(() => {
        if (!nativeImage.isLoaded || !effectiveImageRequest?.cacheKey) {
            return;
        }

        loadedImageCacheKeys.add(effectiveImageRequest.cacheKey);
        setHasLoadedInInstance(true);
    }, [effectiveImageRequest?.cacheKey, nativeImage.isLoaded]);

    // Track whether the image has visually appeared (for fade-in)
    const [imageRevealed, setImageRevealed] = useState(isInSessionCache);

    // Reset revealed state when the image source changes
    useEffect(() => {
        setImageRevealed(isInSessionCache);
    }, [effectiveImageRequest?.cacheKey, isInSessionCache]);

    const handleImageLoad = useCallback(
        (event: React.SyntheticEvent<HTMLImageElement>) => {
            // Use requestAnimationFrame to ensure the browser has painted the
            // hidden image before we trigger the opacity transition
            requestAnimationFrame(() => {
                setImageRevealed(true);
            });
            onLoad?.(event);
        },
        [onLoad],
    );

    const imageElementRef = useRef<HTMLImageElement>(null);
    const renderedSrc =
        samoDirectSrc && !directImageFailed ? samoDirectSrc : nativeImage.displaySrc;

    // `load` alone is not enough to end the fade-in, and when it does not
    // arrive the artwork stays at `opacity: 0` — decoded, laid out, and
    // invisible. Two ways it goes missing:
    //
    //   - `load` does not bubble, so React attaches it to the element during
    //     commit; an image already in the memory cache can finish before that
    //     and the event is simply gone.
    //   - React reuses the same <img> node across renders. When the reveal is
    //     re-armed on a node that already holds this `src` — a new cache key, a
    //     debounced request settling back onto the URL that is already there —
    //     the browser has nothing left to load and fires nothing.
    //
    // Asking the element what it already has covers everything that finished
    // before this ran; the listener covers everything that finishes after.
    // Between the two there is no window for the event to fall through, which
    // is the guarantee React's own `onLoad` cannot make.
    useEffect(() => {
        if (imageRevealed) {
            return;
        }

        const element = imageElementRef.current;

        if (!element) {
            return;
        }

        if (element.complete && element.naturalWidth > 0) {
            setImageRevealed(true);
            return;
        }

        const reveal = () => setImageRevealed(true);

        element.addEventListener('load', reveal);

        return () => element.removeEventListener('load', reveal);
    }, [imageRevealed, renderedSrc]);

    // Determine image fade classes
    const imageLoadClasses = isInSessionCache
        ? {} // Already cached — show instantly, no transition
        : {
              [styles.imageFadeIn]: imageRevealed,
              [styles.imageHidden]: !imageRevealed,
          };

    // Should we show the skeleton underlay behind a loading/fading image?
    const showSkeletonUnderlay =
        includeLoader &&
        !imageRevealed &&
        !isInSessionCache &&
        (samoDirectSrc || nativeImage.displaySrc);

    return (
        <ImageContainer
            className={clsx(containerClassName, containerPropsClassName)}
            isExplicit={isExplicit}
            ref={ref}
            {...restContainerProps}
        >
            {showSkeletonUnderlay && (
                <Skeleton
                    className={clsx(styles.skeleton, styles.skeletonUnderlay, className)}
                    containerClassName={styles.skeletonContainer}
                />
            )}
            {samoDirectSrc && !directImageFailed ? (
                <img
                    className={clsx(styles.image, className, {
                        [styles.animated]: enableAnimation,
                        ...imageLoadClasses,
                    })}
                    decoding="async"
                    fetchPriority={fetchPriority}
                    onError={(event) => {
                        setDirectImageFailed(true);
                        onError?.(event);
                    }}
                    onLoad={handleImageLoad}
                    src={samoDirectSrc}
                    {...props}
                    ref={imageElementRef}
                />
            ) : nativeImage.displaySrc ? (
                <img
                    className={clsx(styles.image, className, {
                        [styles.animated]: enableAnimation,
                        ...imageLoadClasses,
                    })}
                    decoding="async"
                    fetchPriority={fetchPriority}
                    onError={onError}
                    onLoad={handleImageLoad}
                    src={nativeImage.displaySrc}
                    {...props}
                    ref={imageElementRef}
                />
            ) : !src && !samoDirectSrc ? (
                <ImageUnloader className={className} icon={unloaderIcon} />
            ) : nativeImage.isError || directImageFailed ? (
                includeUnloader ? (
                    <ImageUnloader className={className} icon={unloaderIcon} />
                ) : null
            ) : includeLoader ? (
                <ImageLoader className={className} />
            ) : null}
        </ImageContainer>
    );
}

export const Image = memo(BaseImage);

const ImageContainer = forwardRef(
    (
        { children, className, isExplicit, ...props }: ImageContainerProps,
        ref: ForwardedRef<HTMLDivElement>,
    ) => {
        return (
            <div
                className={clsx(styles.imageContainer, className, {
                    [styles.censored]: isExplicit,
                })}
                ref={ref}
                {...props}
            >
                {children}
            </div>
        );
    },
);

export function ImageLoader({ className }: ImageLoaderProps) {
    return (
        <Skeleton
            className={clsx(styles.skeleton, styles.loader, className)}
            containerClassName={styles.skeletonContainer}
        />
    );
}

export function ImageUnloader({ className, icon = 'emptyImage' }: ImageUnloaderProps) {
    return (
        <div className={clsx(styles.unloader, className)}>
            <Icon color="default" icon={icon} size="25%" />
        </div>
    );
}
