const fallbackLanguage = 'zh_CN';

const legacyLanguageMap = {
  zh_HK: 'zh_CN',
  'zh-HK': 'zh_CN',
  ja_JP: 'en_US',
  'ja-JP': 'en_US',
  'zh-CN': 'zh_CN',
  'en-US': 'en_US'
};

const i18nList = [
  { lng: 'zh_CN', name: 'Chinese', shortName: 'ZH' },
  { lng: 'en_US', name: 'English', shortName: 'EN' }
];

export const normalizeLanguage = (language) => {
  if (!language) {
    return fallbackLanguage;
  }

  const mappedLanguage = legacyLanguageMap[language] || language;
  const matchedLanguage = i18nList.find((item) => item.lng === mappedLanguage);

  return matchedLanguage ? matchedLanguage.lng : fallbackLanguage;
};

export const getLanguageOption = (language) => {
  const normalizedLanguage = normalizeLanguage(language);

  return i18nList.find((item) => item.lng === normalizedLanguage) || i18nList[0];
};

export default i18nList;
