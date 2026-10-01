import { useMemo } from 'react';
import { PixelRatio, View } from 'react-native';
import qrcode from 'qrcode-generator';
import Svg, { Path } from 'react-native-svg';

/** The blank margin a QR reader needs around the code, in modules (ISO 18004). */
const QUIET_ZONE = 4;

/**
 * A QR code for a link a phone should open.
 *
 * Black on white whatever the theme, with the full quiet zone: phone cameras
 * read inverted or tightly cropped codes unreliably. Each module is snapped to a
 * whole number of physical pixels, because at TV densities (tvdpi is 1.33x) a
 * fractional module edge anti-aliases into seams a camera can misread; the
 * code comes out at most one module smaller than `maxSize`.
 */
export function TvQrCode({ value, maxSize }: { value: string; maxSize: number }) {
    const { path, span } = useMemo(() => {
        const qr = qrcode(0, 'M');
        qr.addData(value);
        qr.make();
        const count = qr.getModuleCount();
        // One subpath per horizontal run of dark modules rather than per module.
        let d = '';
        for (let row = 0; row < count; row += 1) {
            for (let col = 0; col < count; ) {
                if (!qr.isDark(row, col)) {
                    col += 1;
                    continue;
                }
                const start = col;
                while (col < count && qr.isDark(row, col)) col += 1;
                d += `M${start + QUIET_ZONE} ${row + QUIET_ZONE}h${col - start}v1h${start - col}z`;
            }
        }
        return { path: d, span: count + QUIET_ZONE * 2 };
    }, [value]);

    const density = PixelRatio.get();
    const modulePixels = Math.max(1, Math.floor((maxSize * density) / span));
    const size = (modulePixels * span) / density;

    return (
        <View
            accessibilityLabel="QR code for the sign-in page"
            accessibilityRole="image"
            style={{ width: size, height: size, backgroundColor: '#ffffff' }}
        >
            <Svg width={size} height={size} viewBox={`0 0 ${span} ${span}`}>
                <Path d={path} fill="#000000" />
            </Svg>
        </View>
    );
}
