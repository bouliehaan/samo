import { jsx as _jsx } from "react/jsx-runtime";
import { Box } from '/@/shared/components/box/box';
import { Text } from '/@/shared/components/text/text';
const diff = (newSettings, originalSettings) => {
    const diffs = [];
    const newSettingsString = JSON.stringify(newSettings, null, 2);
    const originalSettingsString = JSON.stringify(originalSettings, null, 2);
    const newSettingsLines = newSettingsString.split('\n');
    const originalSettingsLines = originalSettingsString.split('\n');
    originalSettingsLines.forEach((line, index) => {
        if (line !== newSettingsLines[index]) {
            diffs.push(`- ${line}`);
            if (newSettingsLines[index] !== undefined) {
                diffs.push(`+ ${newSettingsLines[index]}`);
            }
        }
        else {
            diffs.push(`  ${line}`);
        }
    });
    return diffs;
};
export const DiffVisualiser = ({ newSettings, originalSettings }) => {
    const differences = diff(newSettings, originalSettings);
    return (_jsx(Box, { mah: "400px", p: "md", style: { fontFamily: 'monospace', overflow: 'auto', whiteSpace: 'pre-wrap' }, children: differences.map((line, index) => (_jsx(Text, { style: {
                color: line.startsWith('+')
                    ? 'green'
                    : line.startsWith('-')
                        ? 'red'
                        : 'white',
            }, children: line }, index))) }));
};
