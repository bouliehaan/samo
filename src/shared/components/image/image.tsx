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
    useState,
} from 'react';

import styles from './image.module.css';
import { useNativeImage } from './use-native-image';

import { AppIcon, Icon } from '/@/shared/components/icon/icon';
import { Skeleton } from '/@/shared/components/skeleton/skeleton';
import { useDebouncedValue } from '/@/shared/hooks/use-debounced-value';
import { useInViewport } from '/@/shared/hooks/use-in-viewport';
import { ImageRequest } from '/@/shared/types/domain-types';
import { isSamoApiMediaUrl } from '@samo/core/server';

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

    const rawImageRequest = useMemo(
        () => {
            if (src && isSamoApiMediaUrl(src) && src.includes('stream_token=')) {
                return undefined;
            }

            return (
                imageRequest ??
                (src && !isSamoApiMediaUrl(src) ? { cacheKey: src, url: src } : undefined)
            );
        },
        [imageRequest, src],
    );
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

    const samoDirectSrc = useMemo(() => {
        const candidates = [src, effectiveImageRequest?.url];
        for (const candidate of candidates) {
            if (
                candidate &&
                isSamoApiMediaUrl(candidate) &&
                candidate.includes('stream_token=')
            ) {
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
