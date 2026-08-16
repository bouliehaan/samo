import { PostProcessorModule, TOptions } from 'i18next';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import en from './locales/en.json';

const resources = {
    en: { translation: en },
};

export const languages = [
    {
        label: 'English',
        value: 'en',
    },
    {
        label: 'العربية',
        value: 'ar',
    },
    {
        label: 'Català',
        value: 'ca',
    },
    {
        label: 'Čeština',
        value: 'cs',
    },
    {
        label: 'Deutsch',
        value: 'de',
    },
    {
        label: 'Español',
        value: 'es',
    },
    {
        label: 'Basque',
        value: 'eu',
    },
    {
        label: 'Français',
        value: 'fr',
    },
    {
        label: 'Bahasa Indonesia',
        value: 'id',
    },
    {
        label: 'Suomeksi',
        value: 'fi',
    },
    {
        label: 'Magyar',
        value: 'hu',
    },
    {
        label: 'Italiano',
        value: 'it',
    },
    {
        label: '日本語',
        value: 'ja',
    },
    {
        label: '한국어',
        value: 'ko',
    },
    {
        label: 'Nederlands',
        value: 'nl',
    },
    {
        label: 'Norsk (Bokmål)',
        value: 'nb-NO',
    },
    {
        label: 'فارسی',
        value: 'fa',
    },
    {
        label: 'Português',
        value: 'pt',
    },
    {
        label: 'Português (Brasil)',
        value: 'pt-BR',
    },
    {
        label: 'Polski',
        value: 'pl',
    },
    {
        label: 'Русский',
        value: 'ru',
    },
    {
        label: 'Slovenščina',
        value: 'sl',
    },
    {
        label: 'Srpski',
        value: 'sr',
    },
    {
        label: 'Svenska',
        value: 'sv',
    },
    {
        label: 'Tamil',
        value: 'ta',
    },
    {
        label: 'Türkçe',
        value: 'tr',
    },
    {
        label: '简体中文',
        value: 'zh-Hans',
    },
    {
        label: '繁體中文',
        value: 'zh-Hant',
    },
];

const lowerCasePostProcessor: PostProcessorModule = {
    name: 'lowerCase',
    process: (value: string) => {
        return value.toLocaleLowerCase();
    },
    type: 'postProcessor',
};

const upperCasePostProcessor: PostProcessorModule = {
    name: 'upperCase',
    process: (value: string) => {
        return value.toLocaleUpperCase();
    },
    type: 'postProcessor',
};

const titleCasePostProcessor: PostProcessorModule = {
    name: 'titleCase',
    process: (value: string) => {
        return value.replace(/\S\S*/g, (txt) => {
            return txt.charAt(0).toLocaleUpperCase() + txt.slice(1).toLowerCase();
        });
    },
    type: 'postProcessor',
};

const ignoreSentenceCaseLanguages = ['de'];

const sentenceCasePostProcessor: PostProcessorModule = {
    name: 'sentenceCase',
    process: (
        value: string,
        _key: string,
        _options: TOptions<Record<string, string>>,
        translator: any,
    ) => {
        const sentences = value.split('. ');

        return sentences
            .map((sentence) => {
                return (
                    sentence.charAt(0).toLocaleUpperCase() +
                    (!ignoreSentenceCaseLanguages.includes(translator.language)
                        ? sentence.slice(1).toLocaleLowerCase()
                        : sentence.slice(1))
                );
            })
            .join('. ');
    },
    type: 'postProcessor',
};
i18n.use(lowerCasePostProcessor)
    .use(upperCasePostProcessor)
    .use(titleCasePostProcessor)
    .use(sentenceCasePostProcessor)
    .use(initReactI18next) // passes i18n down to react-i18next
    .init({
        fallbackLng: 'en',
        // language to use, more information here: https://www.i18next.com/overview/configuration-options#languages-namespaces-resources
        // you can use the i18n.changeLanguage function to change the language manually: https://www.i18next.com/overview/api#changelanguage
        // if you're using a language detector, do not define the lng option
        interpolation: {
            escapeValue: false, // react already safes from xss
        },
        resources,
    });

/**
 * Every locale except the fallback is fetched on demand.
 *
 * Importing all 28 statically put ~936 KB of translation tables — a quarter of
 * the renderer's entry chunk — on the critical path of every cold start, to
 * hand 27 of them to a user who reads one. `import.meta.glob` gives Vite a
 * chunk per locale instead, so the bundle carries English and the rest arrive
 * only if someone actually switches.
 */
const localeLoaders = import.meta.glob<{ default: Record<string, unknown> }>('./locales/*.json');

const loadedLanguages = new Set(['en']);

export const loadLanguage = async (language: string): Promise<void> => {
    if (loadedLanguages.has(language)) {
        return;
    }

    const loader = localeLoaders[`./locales/${language}.json`];

    if (!loader) {
        return;
    }

    const module = await loader();
    i18n.addResourceBundle(language, 'translation', module.default, true, true);
    // Only after the bundle lands — marking it loaded first would let a
    // concurrent caller skip the wait and render raw keys.
    loadedLanguages.add(language);
};

/** Fetch a language's table if needed, then switch to it. */
export const changeLanguage = async (language: string): Promise<void> => {
    await loadLanguage(language);
    await i18n.changeLanguage(language);
};

export default i18n;
