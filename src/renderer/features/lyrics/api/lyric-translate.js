import axios from 'axios';
import { logFn } from '/@/renderer/utils/logger';
export const translateLyrics = async (originalLyrics, translationApiKey, translationApiProvider, translationTargetLanguage) => {
    let TranslatedText = '';
    if (translationApiProvider === 'Microsoft Azure') {
        try {
            const response = await axios({
                data: [
                    {
                        Text: originalLyrics,
                    },
                ],
                headers: {
                    'Content-Type': 'application/json',
                    'Ocp-Apim-Subscription-Key': translationApiKey,
                },
                method: 'post',
                url: `https://api.cognitive.microsofttranslator.com/translate?api-version=3.0&to=${translationTargetLanguage}`,
            });
            TranslatedText = response.data[0].translations[0].text;
        }
        catch (e) {
            logFn.error('Microsoft Azure translate request got an error!', { meta: { error: e } });
            return null;
        }
    }
    else if (translationApiProvider === 'Google Cloud') {
        try {
            const response = await axios({
                data: {
                    format: 'text',
                    q: originalLyrics,
                },
                headers: {
                    'Content-Type': 'application/json',
                },
                method: 'post',
                url: `https://translation.googleapis.com/language/translate/v2?target=${translationTargetLanguage}&key=${translationApiKey}`,
            });
            TranslatedText = response.data.data.translations[0].translatedText;
        }
        catch (e) {
            logFn.error('Google Cloud translate request got an error!', { meta: { error: e } });
            return null;
        }
    }
    return TranslatedText;
};
