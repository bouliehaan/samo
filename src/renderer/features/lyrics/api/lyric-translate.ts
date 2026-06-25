import { logFn } from '/@/shared/utils/logger';

export const translateLyrics = async (
    originalLyrics: string,
    translationApiKey: string,
    translationApiProvider: null | string,
    translationTargetLanguage: null | string,
) => {
    let TranslatedText = '';
    if (translationApiProvider === 'Microsoft Azure') {
        try {
            const response = await fetch(
                `https://api.cognitive.microsofttranslator.com/translate?api-version=3.0&to=${translationTargetLanguage as string}`,
                {
                    body: JSON.stringify([
                        {
                            Text: originalLyrics,
                        },
                    ]),
                    headers: {
                        'Content-Type': 'application/json',
                        'Ocp-Apim-Subscription-Key': translationApiKey,
                    },
                    method: 'POST',
                },
            );
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            TranslatedText = data[0].translations[0].text;
        } catch (e) {
            logFn.error('Microsoft Azure translate request got an error!', { meta: { error: e } });
            return null;
        }
    } else if (translationApiProvider === 'Google Cloud') {
        try {
            const response = await fetch(
                `https://translation.googleapis.com/language/translate/v2?target=${translationTargetLanguage as string}&key=${translationApiKey}`,
                {
                    body: JSON.stringify({
                        format: 'text',
                        q: originalLyrics,
                    }),
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    method: 'POST',
                },
            );
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            TranslatedText = data.data.translations[0].translatedText;
        } catch (e) {
            logFn.error('Google Cloud translate request got an error!', { meta: { error: e } });
            return null;
        }
    }
    return TranslatedText;
};
