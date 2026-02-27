import { locales } from './locales.js';

export class LanguageManager {
    constructor() {
        this.currentLang = localStorage.getItem('sp_lang') || 'pt';
        this.listeners = [];
    }

    setLanguage(lang) {
        if (locales[lang]) {
            this.currentLang = lang;
            localStorage.setItem('sp_lang', lang);
            this.notifyListeners();
        }
    }

    getLanguage() {
        return this.currentLang;
    }

    t(key) {
        const dict = locales[this.currentLang] || locales['pt'];
        return dict[key] || key;
    }

    subscribe(callback) {
        this.listeners.push(callback);
    }

    notifyListeners() {
        this.listeners.forEach(cb => cb(this.currentLang));
    }
}
