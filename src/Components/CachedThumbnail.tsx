import { useEffect, useState } from "react";
import {
    blobToDataUrl,
    cacheKeys,
    MAX_CACHED_BLOB_BYTES,
    readCache,
    writeCache,
} from "../Functions/BrowserCache";

type CachedThumbnailProps = {
    fileId: number;
    alt?: string;
    className?: string;
    onClick?: React.MouseEventHandler<HTMLImageElement>;
};

/**
 * Thumbnail that is kept in the browser cache for the cache TTL.
 *
 * The plain API url is rendered straight away so the image shows up as fast as
 * the browser allows, and is swapped for the cached copy once it is available.
 */
export function CachedThumbnail({ fileId, alt, className, onClick }: CachedThumbnailProps) {
    const [cachedSrc, setCachedSrc] = useState<string | null>(null);

    const apiUrl = `${process.env.REACT_APP_API_URL}/api/v1/thumbnails/getbyfileid?fileId=${fileId}`;

    useEffect(() => {
        let cancelled = false;
        const cacheKey = cacheKeys.thumbnail(fileId);

        setCachedSrc(null);

        const cached = readCache<string>(cacheKey);
        if (cached) {
            setCachedSrc(cached);
            return;
        }

        fetch(apiUrl, { method: "GET", credentials: "include" })
            .then(response => (response.ok ? response.blob() : null))
            .then(async blob => {
                if (!blob || cancelled) return;
                if (blob.size > MAX_CACHED_BLOB_BYTES) return;
                const dataUrl = await blobToDataUrl(blob);
                if (cancelled) return;
                writeCache(cacheKey, dataUrl);
                setCachedSrc(dataUrl);
            })
            .catch(() => {
                // Keep the plain <img> fallback.
            });

        return () => {
            cancelled = true;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [fileId]);

    return (
        <img
            src={cachedSrc ?? apiUrl}
            alt={alt}
            className={className}
            onClick={onClick}
        />
    );
}
