import DomPurify from 'dompurify';
const SANITIZE_OPTIONS = {
    ALLOWED_ATTR: ['href'],
    ALLOWED_TAGS: ['a', 'b', 'div', 'em', 'i', 'p', 'span', 'strong'],
    // allow http://, https://, and // (mapped to https)
    ALLOWED_URI_REGEXP: /^(http(s?):)?\/\/.+/i,
};
const regex = /(url\(["'](?!data:))/gim;
const addStyles = (output, styles) => {
    for (let prop = styles.length - 1; prop >= 0; prop -= 1) {
        const key = styles[prop];
        if (key !== 'content' && styles[key]) {
            const value = styles[key];
            const priority = styles.getPropertyPriority(key);
            const priorityString = priority === 'important' ? ` !important` : '';
            if (typeof value === 'string') {
                if (!value.match(regex)) {
                    output.push(`${key}:${value}${priorityString};`);
                }
            }
            else if (typeof value === 'number') {
                output.push(`${key}:${value}${priorityString};`);
            }
        }
        else if (styles.getPropertyValue(key)) {
            // These will not override the value unless not declared !important
            output.push(`${key}: ${styles.getPropertyValue(key)} !important;`);
        }
    }
};
const addCssRules = (rules, output) => {
    for (let index = rules.length - 1; index >= 0; index -= 1) {
        const rule = rules[index];
        if (rule.constructor.name === 'CSSStyleRule') {
            const cssRule = rule;
            output.push(`${cssRule.selectorText} {`);
            if (cssRule.style) {
                addStyles(output, cssRule.style);
            }
            output.push('}');
        }
        else if (rule.constructor.name === 'CSSMediaRule') {
            const mediaRule = rule;
            output.push(`@media ${mediaRule.media.mediaText}{`);
            addCssRules(mediaRule.cssRules, output);
            output.push('}');
        }
        else if (rule.constructor.name === 'CSSKeyframesRule') {
            const keyFrameRule = rule;
            for (let i = keyFrameRule.cssRules.length - 1; i >= 0; i -= 1) {
                const frame = keyFrameRule.cssRules[i];
                if (frame.constructor.name === 'CSSKeyframeRule') {
                    const keyframeRule = frame;
                    if (keyframeRule.keyText) {
                        output.push(`${keyframeRule.keyText}{`);
                        if (keyframeRule.style) {
                            addStyles(output, keyframeRule.style);
                        }
                        output.push('}');
                    }
                }
            }
            output.push('}');
        }
    }
};
DomPurify.addHook('afterSanitizeAttributes', (node) => {
    if (node.tagName === 'A') {
        if (node.getAttribute('href')?.startsWith('//')) {
            node.setAttribute('href', `https:${node.getAttribute('href')}`);
        }
        node.setAttribute('target', '_blank');
        node.setAttribute('rel', 'noopener noreferrer');
    }
});
DomPurify.addHook('uponSanitizeElement', (node) => {
    if (node.tagName === 'STYLE') {
        const rules = node.sheet?.cssRules;
        if (rules) {
            const output = [];
            addCssRules(rules, output);
            node.textContent = output.join('\n');
        }
    }
});
export const sanitize = (text) => {
    return DomPurify.sanitize(text, SANITIZE_OPTIONS);
};
export const sanitizeCss = (text) => {
    return DomPurify.sanitize(text, {
        ALLOWED_ATTR: [],
        ALLOWED_TAGS: ['style'],
        RETURN_DOM: true,
        WHOLE_DOCUMENT: true,
    }).innerText;
};
