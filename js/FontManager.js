/**
 * FontManager
 * Sistema de gerenciamento de fontes locais da pasta './fonts'
 * Detecta fontes disponíveis e injeta o CSS necessário
 */
export class FontManager {
    constructor(fontsPath = './fonts') {
        this.fontsPath = fontsPath;
        this.availableFonts = [];
        this.loaded = false;
    }

    /**
     * Inicializa o gerenciador de fontes
     * @returns {Promise<Array>} Lista de fontes disponíveis
     */
    async init() {
        if (this.loaded) return this.availableFonts;

        // Always start with default system fonts
        this.useDefaultFonts();

        try {
            // Tenta carregar o arquivo de manifesto de fontes e adicionar às existentes
            await this.loadFontManifest();
        } catch (e) {
            console.log('Font manifest not found or invalid', e);
            // Default fonts are already loaded, so we just proceed
        }

        // Injeta as fontes no documento
        this.injectFontCSS();

        this.loaded = true;
        return this.availableFonts;
    }

    /**
     * Tenta carregar um arquivo manifest.json da pasta de fontes
     */
    async loadFontManifest() {
        try {
            const response = await fetch(`${this.fontsPath}/manifest.json`);
            if (response.ok) {
                const manifest = await response.json();
                const customFonts = manifest.fonts || [];
                // Append custom fonts to the existing list (which contains default fonts)
                this.availableFonts = [...this.availableFonts, ...customFonts];
            } else {
                throw new Error('Manifest not found');
            }
        } catch (e) {
            throw e;
        }
    }

    /**
     * Usa uma lista padrão de fontes comuns
     */
    useDefaultFonts() {
        // Fontes do sistema que já existem
        this.availableFonts = [
            { name: 'Arial', family: 'Arial, sans-serif', system: true },
            { name: 'Helvetica', family: 'Helvetica, Arial, sans-serif', system: true },
            { name: 'Verdana', family: 'Verdana, Geneva, sans-serif', system: true },
            { name: 'Tahoma', family: 'Tahoma, Geneva, sans-serif', system: true },
            { name: 'Trebuchet MS', family: '"Trebuchet MS", Helvetica, sans-serif', system: true },
            { name: 'Times New Roman', family: '"Times New Roman", Times, serif', system: true },
            { name: 'Georgia', family: 'Georgia, "Times New Roman", serif', system: true },
            { name: 'Garamond', family: 'Garamond, Baskerville, serif', system: true },
            { name: 'Courier New', family: '"Courier New", Courier, monospace', system: true },
            { name: 'Brush Script MT', family: '"Brush Script MT", cursive', system: true },
            { name: 'Impact', family: 'Impact, Haettenschweiler, sans-serif', system: true },
            { name: 'Segoe UI', family: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif', system: true }
        ];
    }

    /**
     * Adiciona fontes customizadas à lista
     * @param {Array} fonts - Array de objetos {name, file, format, weight, style}
     */
    addCustomFonts(fonts) {
        fonts.forEach(font => {
            // Verifica se a fonte já existe
            const exists = this.availableFonts.find(f => f.name === font.name);
            if (!exists) {
                this.availableFonts.push({
                    name: font.name,
                    family: `"${font.name}", ${font.fallback || 'sans-serif'}`,
                    file: font.file,
                    format: font.format || this.getFontFormat(font.file),
                    weight: font.weight || 'normal',
                    style: font.style || 'normal',
                    system: false
                });
            }
        });

        // Reinjeta o CSS com as novas fontes
        this.injectFontCSS();
    }

    /**
     * Detecta o formato da fonte pelo nome do arquivo
     */
    getFontFormat(filename) {
        const ext = filename.split('.').pop().toLowerCase();
        const formats = {
            'woff2': 'woff2',
            'woff': 'woff',
            'ttf': 'truetype',
            'otf': 'opentype',
            'eot': 'embedded-opentype',
            'svg': 'svg'
        };
        return formats[ext] || 'truetype';
    }

    /**
     * Injeta o CSS @font-face para as fontes customizadas
     */
    injectFontCSS() {
        // Remove o style anterior se existir
        const existingStyle = document.getElementById('font-manager-styles');
        if (existingStyle) {
            existingStyle.remove();
        }

        const style = document.createElement('style');
        style.id = 'font-manager-styles';

        let css = '';

        this.availableFonts.forEach(font => {
            if (!font.system && font.file) {
                const format = font.format || this.getFontFormat(font.file);
                css += `
                    @font-face {
                        font-family: "${font.name}";
                        src: url("${this.fontsPath}/${font.file}") format("${format}");
                        font-weight: ${font.weight || 'normal'};
                        font-style: ${font.style || 'normal'};
                        font-display: swap;
                    }
                `;
            }
        });

        style.textContent = css;
        document.head.appendChild(style);
    }

    /**
     * Retorna as opções de fonte para um select/combobox
     * @returns {Array} Array de objetos {value, label}
     */
    getFontOptions() {
        return this.availableFonts.map(font => ({
            value: font.name,
            label: font.name + (font.system ? ' (Sistema)' : ' (Custom)')
        }));
    }

    /**
     * Retorna a família de fonte CSS para um nome de fonte
     */
    getFontFamily(fontName) {
        const font = this.availableFonts.find(f => f.name === fontName);
        return font ? font.family : `"${fontName}", sans-serif`;
    }

    /**
     * Gera o HTML de opções para um select
     */
    generateSelectOptions(selectedFont = 'Arial') {
        return this.availableFonts.map(font =>
            `<option value="${font.name}" ${font.name === selectedFont ? 'selected' : ''}>${font.name}</option>`
        ).join('');
    }

    /**
     * Verifica se uma fonte está disponível
     */
    hasFont(fontName) {
        return this.availableFonts.some(f => f.name === fontName);
    }

    /**
     * Retorna todas as fontes disponíveis
     */
    getAllFonts() {
        return [...this.availableFonts];
    }
}

// Instância global
let fontManagerInstance = null;

export function getFontManager(fontsPath = './fonts') {
    if (!fontManagerInstance) {
        fontManagerInstance = new FontManager(fontsPath);
    }
    return fontManagerInstance;
}
