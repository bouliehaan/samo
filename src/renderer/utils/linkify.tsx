import { ReactNode } from 'react';

const URL_REGEX =
    /((?:https?:\/\/)?(?:[\w-]{1,32}(?:\.[\w-]{1,32})+)(?:\/[\w\-./?%&=][^.|^\s]*)?)/g;

export const replaceURLWithHTMLLinks = (text: string) => {
    const urlRegex = new RegExp(URL_REGEX, 'g');
    const matches = text.matchAll(urlRegex);
    const elements: (ReactNode | string)[] = [];
    let lastIndex = 0;

    for (const match of matches) {
        const position = match.index!;

        if (position > lastIndex) {
            elements.push(text.substring(lastIndex, position));
        }

        const link = match[0];
        const prefix = link.startsWith('http') ? '' : 'https://';
        elements.push(
            <a href={prefix + link} key={lastIndex} rel="noopener noreferrer" target="_blank">
                {link}
            </a>,
        );

        lastIndex = position + link.length;
    }

    if (text.length > lastIndex) {
        elements.push(text.substring(lastIndex));
    }

    return elements;
};
