
import { SlideEditor } from './SlideEditor.js';
import { getToast } from './ToastSystem.js';

/**
 * SlidePresentation
 * Manages multiple slides with enhanced transition system.
 * Supports individual slide transitions and presentation transition models.
 */
export class SlidePresentation {
    constructor(container, inputData = []) {
        this.container = container;

        // Handle new generic object structure vs legacy array
        if (Array.isArray(inputData)) {
            this.meta = {
                name: 'Nova Apresentação',
                title: 'Sem Título',
                updated_at: new Date().toISOString(),
                transitionMode: 'free' // 'free', 'carousel', 'flipcards', 'carddeck', 'cube', 'coverflow'
            };
            this.slides = inputData;
        } else {
            this.meta = {
                name: inputData.name || 'Nova Apresentação',
                title: inputData.title || 'Sem Título',
                updated_at: inputData.updated_at || new Date().toISOString(),
                transitionMode: inputData.transitionMode || 'free'
            };
            this.slides = inputData.slides || [];
        }

        this.currentIndex = 0;
        this.editor = null;
        this.isTransitioning = false;
        this.toast = getToast();

        // Ensure at least one slide exists
        if (this.slides.length === 0) {
            this.slides.push(this.createDefaultSlide());
        }

        // Ensure all slides have transition config
        this.slides.forEach(slide => {
            if (!slide.transition) {
                slide.transition = {
                    enter: 'slide-fade',
                    exit: 'slide-fade',
                    duration: 0.8,
                    delay: 0,
                    easing: 'ease-in-out'
                };
            }
            // Garante que o delay existe (para slides carregados de JSON antigo)
            if (slide.transition.delay === undefined) {
                slide.transition.delay = 0;
            }
        });

        // I18n Init
        if (window.LanguageManager) {
            this.i18n = new window.LanguageManager();
            this.i18n.subscribe(() => this.updateLanguage());
        } else {
            // Fallback mock if missing
            this.i18n = { t: (k) => k, getLanguage: () => 'pt', setLanguage: () => { } };
        }

        this.init();
    }

    createDefaultSlide() {
        return {
            id: 'slide_' + Date.now(),
            width: 960,
            height: 540,
            background: { type: 'color', value: '#ffffff', opacity: 1 },
            transition: {
                enter: 'slide-fade',
                exit: 'slide-fade',
                duration: 0.8,
                delay: 0,
                easing: 'ease-in-out'
            },
            items: []
        };
    }

    init() {
        this.editor = new SlideEditor(this.container, this.slides[this.currentIndex], this.i18n);
        window.editor = this.editor;

        // Listen for Link Clicks from Viewer
        window.addEventListener('slide-link-click', (e) => {
            const link = e.detail.link;
            if (link) this.handleLinkClick(link);
        });

        this.injectStyles();
        this.createToolbar();

        this.editor.onChange = (newConfig) => {
            this.slides[this.currentIndex] = JSON.parse(JSON.stringify(newConfig));
            this.renderSlideList();
        };

        setTimeout(() => {
            if (this.editor.viewer) {
                // Prepara elementos para entrada antes de mostrar
                this.editor.viewer.prepareForEntry();
                this.editor.testShow();
            }
        }, 500);

        // Auto-save loop
        setInterval(() => {
            if (this.meta && this.slides.length > 0) {
                localStorage.setItem('k_slides_autosave', JSON.stringify({
                    meta: this.meta,
                    slides: this.slides
                }));
            }
        }, 30000);
    }

    injectStyles() {
        if (document.getElementById('sp-styles')) return;
        const style = document.createElement('style');
        style.id = 'sp-styles';
        style.textContent = `
            .sp-list::-webkit-scrollbar { width: 6px; }
            .sp-list::-webkit-scrollbar-thumb { background: #ccc; border-radius: 3px; }

            .sp-window {
                position: fixed;
                bottom: 20px;
                right: 20px;
                width: 320px;
                background: white;
                border-radius: 8px;
                box-shadow: 0 5px 25px rgba(0,0,0,0.2);
                display: flex;
                flex-direction: column;
                z-index: 5000;
                font-family: 'Segoe UI', sans-serif;
                font-size: 14px;
                border: 1px solid #ddd;
                max-height: 85vh;
                overflow-y: auto;
            }
            .sp-header {
                padding: 12px 15px;
                background: #f8f9fa;
                border-bottom: 1px solid #ddd;
                border-radius: 8px 8px 0 0;
                font-weight: 600;
                color: #333;
                display: flex;
                justify-content: space-between;
                align-items: center;
                cursor: move;
            }
            .sp-body {
                flex: 1;
                overflow: hidden;
                display: flex;
                flex-direction: column;
            }
            .sp-list {
                flex: 1;
                overflow-y: auto;
                padding: 0;
                margin: 0;
                list-style: none;
                max-height: 250px;
            }
            .sp-item {
                display: flex;
                align-items: center;
                padding: 8px 12px;
                border-bottom: 1px solid #f0f0f0;
                cursor: pointer;
                transition: background 0.2s;
            }
            .sp-item:hover { background: #f9f9f9; }
            .sp-item.active { background: #e0f2fe; border-left: 4px solid #2563eb; }
            .sp-item-name { flex: 1; font-weight: 500; color: #444; }
            .sp-item-actions { display: flex; gap: 4px; opacity: 0.5; transition: opacity 0.2s; }
            .sp-item:hover .sp-item-actions { opacity: 1; }
            
            .sp-btn-icon {
                background: none;
                border: none;
                cursor: pointer;
                padding: 4px;
                border-radius: 4px;
                color: #666;
                display: flex;
            }
            .sp-btn-icon:hover { background: #ddd; color: #000; }
            .sp-btn-icon svg { width: 14px; height: 14px; fill: currentColor; }

            .sp-meta {
                padding: 10px 15px 5px 15px;
                display: flex;
                flex-direction: column;
                gap: 5px;
                background: #f8f9fa;
                border-bottom: 1px solid #ddd;
            }
            .sp-meta input, .sp-meta select {
                padding: 5px;
                border: 1px solid #ddd;
                border-radius: 4px;
                font-size: 12px;
                width: 100%;
                box-sizing: border-box;
            }

            .sp-footer {
                padding: 10px 15px;
                border-top: 1px solid #ddd;
                background: #fff;
                border-radius: 0 0 8px 8px;
                display: flex;
                gap: 10px;
                justify-content: space-around;
            }
            .sp-footer-btn {
                flex: 1;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 5px;
                padding: 8px;
                border: 1px solid #ddd;
                border-radius: 4px;
                background: #fff;
                cursor: pointer;
                font-size: 11px;
                color: #555;
            }
            .sp-footer-btn:hover { background: #f0f0f0; border-color: #bbb; }
            .sp-footer-btn svg { width: 14px; height: 14px; fill: currentColor; }

            .sp-section-title {
                font-size: 11px;
                font-weight: 600;
                color: #666;
                text-transform: uppercase;
                padding: 10px 15px 5px;
                background: #f8f9fa;
                border-bottom: 1px solid #eee;
            }

            .sp-tabs {
                display: flex;
                background: #f1f3f5;
                border-bottom: 1px solid #ddd;
            }
            .sp-tab {
                flex: 1;
                border: none;
                background: transparent;
                padding: 8px;
                font-size: 11px;
                cursor: pointer;
                border-bottom: 2px solid transparent;
                color: #666;
            }
            .sp-tab.active {
                background: white;
                color: #2563eb;
                border-bottom-color: #2563eb;
            }
            .sp-tab:hover {
                background: #e9ecef;
            }

            .sp-tools-row {
                display: flex;
                gap: 8px;
                padding: 0 10px 10px;
                flex-wrap: wrap;
            }
            .sp-tool-btn-icon {
                width: 40px;
                height: 40px;
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 8px;
                border: 1px solid #ddd;
                border-radius: 8px;
                background: #fff;
                cursor: pointer;
                color: #555;
                transition: all 0.2s;
            }
            .sp-tool-btn-icon:hover {
                background: #f0f0f0;
                border-color: #2563eb;
            }
            .sp-tool-btn-icon svg {
                width: 20px;
                height: 20px;
                fill: currentColor;
            }
            .sp-tool-btn-icon.primary {
                background: #2563eb;
                color: white;
                border-color: #2563eb;
            }
            .sp-tool-btn-icon.primary:hover {
                background: #1d4ed8;
            }
            .sp-tool-btn-icon.danger {
                background: #dc2626;
                color: white;
                border-color: #dc2626;
            }
            .sp-tool-btn-icon.danger:hover {
                background: #b91c1c;
            }

            .sp-transition-panel {
                padding: 15px;
            }
            .sp-transition-panel .pc-form-group {
                margin-bottom: 12px;
            }
            .sp-transition-panel label {
                display: block;
                font-size: 11px;
                color: #666;
                margin-bottom: 4px;
                text-transform: uppercase;
            }
            .sp-transition-panel select,
            .sp-transition-panel input {
                width: 100%;
                padding: 6px;
                border: 1px solid #ddd;
                border-radius: 4px;
                font-size: 13px;
                box-sizing: border-box;
            }
            .sp-transition-panel .pc-row {
                display: flex;
                gap: 10px;
            }
            .sp-transition-panel .pc-row > * {
                flex: 1;
            }

            /* Modal de exportação */
            .export-modal {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0,0,0,0.6);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 10000;
            }
            .export-modal-content {
                background: white;
                padding: 25px;
                border-radius: 12px;
                width: 400px;
                max-width: 90%;
                box-shadow: 0 10px 40px rgba(0,0,0,0.3);
            }
            .export-modal h3 {
                margin: 0 0 20px 0;
                color: #333;
                font-size: 18px;
            }
            .export-option {
                display: flex;
                align-items: center;
                gap: 12px;
                padding: 15px;
                background: #f8f9fa;
                border-radius: 8px;
                margin-bottom: 15px;
                cursor: pointer;
                transition: background 0.2s;
            }
            .export-option:hover {
                background: #e9ecef;
            }
            .export-option input[type="checkbox"] {
                width: 20px;
                height: 20px;
                cursor: pointer;
            }
            .export-option label {
                margin: 0;
                cursor: pointer;
                flex: 1;
            }
            .export-option-title {
                font-weight: 600;
                color: #333;
                display: block;
                margin-bottom: 4px;
            }
            .export-option-desc {
                font-size: 12px;
                color: #666;
            }
            .export-modal-buttons {
                display: flex;
                gap: 10px;
                margin-top: 20px;
            }
            .export-modal-buttons button {
                flex: 1;
                padding: 10px;
                border: none;
                border-radius: 6px;
                cursor: pointer;
                font-weight: 600;
            }
            .export-btn-primary {
                background: #2563eb;
                color: white;
            }
            .export-btn-primary:hover {
                background: #1d4ed8;
            }
            .export-btn-secondary {
                background: #e5e7eb;
                color: #374151;
            }
            .export-btn-secondary:hover {
                background: #d1d5db;
            }
            
            /* Modal de confirmação */
            .confirm-modal {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0,0,0,0.6);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 10000;
            }
            .confirm-modal-content {
                background: white;
                padding: 25px;
                border-radius: 12px;
                width: 350px;
                max-width: 90%;
                box-shadow: 0 10px 40px rgba(0,0,0,0.3);
            }

            /* Modal de modelos */
            .model-modal-content {
                background: white;
                padding: 25px;
                border-radius: 12px;
                width: 500px;
                max-width: 90%;
                box-shadow: 0 10px 40px rgba(0,0,0,0.3);
                font-family: 'Segoe UI', sans-serif;
            }
            .model-list {
                list-style: none;
                padding: 0;
                margin: 0;
                max-height: 400px;
                overflow-y: auto;
            }
            .model-item {
                display: flex;
                flex-direction: column;
                padding: 15px;
                border: 1px solid #eee;
                border-radius: 8px;
                margin-bottom: 10px;
                cursor: pointer;
                transition: all 0.2s;
            }
            .model-item:hover {
                background: #f0f9ff;
                border-color: #bae6fd;
            }
            .model-item-title {
                font-weight: 600;
                color: #333;
                margin-bottom: 5px;
            }
            .model-item-desc {
                font-size: 13px;
                color: #666;
            }
        `;
        document.head.appendChild(style);
    }

    handleLinkClick(link) {
        if (link.startsWith('#')) {
            // Internal Slide Link
            const targetId = link.substring(1);
            const targetIndex = this.slides.findIndex(s => s.id === targetId);

            if (targetIndex !== -1) {
                this.goToSlide(targetIndex);
            } else {
                this.toast.error(`Slide com ID "${targetId}" não encontrado.`, 4000, 'Link Quebrado');
            }
        } else {
            // External URL
            try {
                window.open(link, '_blank');
            } catch (e) {
                this.toast.error('Erro ao abrir link externo.', 4000, 'Erro');
            }
        }
    }

    updateLanguage() {
        // Re-render toolbar to update strings
        if (this.toolbar) {
            const wasMinimized = document.getElementById('sp-body-content').style.display === 'none';
            this.toolbar.remove();
            this.createToolbar();
            if (wasMinimized) {
                document.getElementById('sp-body-content').style.display = 'none';
            }
        }

        // Update Editor Language if active
        if (this.editor) {
            this.editor.i18n = this.i18n; // Ensure reference is standard
            // Safely update editor UI without destroying viewer
            if (typeof this.editor.updateLanguage === 'function') {
                this.editor.updateLanguage();
            } else {
                this.editor.renderLayout(); // Fallback if not updated yet
            }
        }

        // Update any open modals if possible (simpler to close them or let them be)
    }

    createToolbar() {
        this.toolbar = document.createElement('div');
        this.toolbar.className = 'sp-window';
        this.toolbar.style.height = 'auto'; // Allow auto height

        const iconAdd = `<svg viewBox="0 0 24 24"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>`;
        const iconSave = `<svg viewBox="0 0 24 24"><path d="M17 3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V7l-4-4zm-5 16c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3zm3-10H5V5h10v4z"/></svg>`;
        const iconLoad = `<svg viewBox="0 0 24 24"><path d="M20 6h-8l-2-2H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm0 12H4V8h16v10z"/></svg>`;
        const iconModel = `<svg viewBox="0 0 24 24"><path d="M4 6h16v12H4z" fill="none" stroke="currentColor" stroke-width="2"/><path d="M8 6v12M16 6v12M4 10h16M4 14h16" stroke="currentColor" stroke-width="2"/></svg>`;
        const iconExport = `<svg viewBox="0 0 24 24"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/></svg>`;

        // Language Icons/Text
        const currentLang = this.i18n.getLanguage().toUpperCase();

        this.toolbar.innerHTML = `
            <div class="sp-header">
                <span>${this.i18n.t('toolbar_title')}</span>
                <div style="margin-left:auto; display:flex; gap:5px;">
                    <button class="sp-btn-icon" id="lang-btn" title="Language" style="width:auto; padding:0 5px; font-size:11px; font-weight:bold;">
                        ${currentLang}
                    </button>
                    <button class="sp-btn-icon" onclick="presentation.toggleMinimize()" title="${this.i18n.t('minimize')}">
                        <svg viewBox="0 0 24 24"><path d="M6 19h12v2H6z"/></svg>
                    </button>
                </div>
            </div>
            
            <div class="sp-body" id="sp-body-content">
                <!-- Global Actions -->
                <div class="sp-tools-row" style="padding-top:10px; justify-content: space-between;">
                    <button class="sp-tool-btn-icon primary" title="${this.i18n.t('new_slide')}" onclick="presentation.addSlide()">${iconAdd}</button>
                    <button class="sp-tool-btn-icon" title="${this.i18n.t('save_json')}" onclick="presentation.saveJSON()">${iconSave}</button>
                    <button class="sp-tool-btn-icon" title="${this.i18n.t('load_json')}" onclick="document.getElementById('sp-file-input').click()">${iconLoad}</button>
                    <button class="sp-tool-btn-icon" title="${this.i18n.t('load_model')}" onclick="presentation.fetchModels()">${iconModel}</button>
                    <button class="sp-tool-btn-icon" title="${this.i18n.t('export_html')}" onclick="presentation.showExportDialog()">${iconExport}</button>
                </div>

                <!-- Global Transition -->
                <div style="padding: 0 10px 10px; border-bottom: 1px solid #eee;">
                    <label style="font-size:11px;color:#666;text-transform:uppercase;display:block;margin-bottom:4px;">${this.i18n.t('global_transition')}</label>
                    <select id="sp-transition-mode" style="width: 100%; padding: 6px; border: 1px solid #ddd; border-radius: 4px; font-size: 13px;">
                        <option value="free" ${this.meta.transitionMode === 'free' ? 'selected' : ''}>${this.i18n.t('trans_free')}</option>
                        <option value="carousel" ${this.meta.transitionMode === 'carousel' ? 'selected' : ''}>${this.i18n.t('trans_carousel')}</option>
                        <option value="flipcards" ${this.meta.transitionMode === 'flipcards' ? 'selected' : ''}>${this.i18n.t('trans_flipcards')}</option>
                        <option value="carddeck" ${this.meta.transitionMode === 'carddeck' ? 'selected' : ''}>${this.i18n.t('trans_carddeck')}</option>
                        <option value="cube" ${this.meta.transitionMode === 'cube' ? 'selected' : ''}>${this.i18n.t('trans_cube')}</option>
                        <option value="coverflow" ${this.meta.transitionMode === 'coverflow' ? 'selected' : ''}>${this.i18n.t('trans_coverflow')}</option>
                    </select>
                </div>

                <!-- Slide List -->
                <div class="sp-section-title">${this.i18n.t('slides_title')} (${this.slides.length})</div>
                <ul class="sp-list" id="sp-list" style="max-height: 250px; overflow-y: auto;"></ul>
            </div>
            
            <!-- Context Menu for Language -->
            <div id="lang-menu" style="display:none; position:absolute; top:30px; right:40px; background:white; border:1px solid #ddd; border-radius:4px; box-shadow:0 5px 15px rgba(0,0,0,0.2); z-index:10000; overflow:hidden;">
                <div class="lang-option" onclick="presentation.setLang('pt')" style="padding:8px 15px; cursor:pointer; font-size:13px; hover:bg-gray-100">PT - Português</div>
                <div class="lang-option" onclick="presentation.setLang('en')" style="padding:8px 15px; cursor:pointer; font-size:13px; hover:bg-gray-100">US - English</div>
                <div class="lang-option" onclick="presentation.setLang('es')" style="padding:8px 15px; cursor:pointer; font-size:13px; hover:bg-gray-100">ES - Español</div>
            </div>

            <input type="file" id="sp-file-input" style="display:none" accept=".json">
        `;

        document.body.appendChild(this.toolbar);

        // Bind events
        document.getElementById('sp-file-input').onchange = (e) => this.loadJSON(e);

        const modeSelect = document.getElementById('sp-transition-mode');
        if (modeSelect) {
            modeSelect.onchange = (e) => {
                this.meta.transitionMode = e.target.value;
                this.toast.info(`Modo de transição: ${e.target.value}`);
            };
        }

        // Language Menu Logic
        const langBtn = document.getElementById('lang-btn');
        const langMenu = document.getElementById('lang-menu');

        langBtn.onclick = (e) => {
            e.stopPropagation();
            langMenu.style.display = langMenu.style.display === 'block' ? 'none' : 'block';
        };

        // Close menu when clicking outside
        const closeMenu = () => langMenu.style.display = 'none';
        window.addEventListener('click', closeMenu);
        langMenu.addEventListener('click', (e) => e.stopPropagation());

        // Hover effect for lang options
        const opts = langMenu.querySelectorAll('.lang-option');
        opts.forEach(opt => {
            opt.onmouseenter = () => opt.style.background = '#f0f0f0';
            opt.onmouseleave = () => opt.style.background = 'white';
        });

        this.makeDraggable(this.toolbar);
        this.renderSlideList();
    }

    setLang(lang) {
        this.i18n.setLanguage(lang);
        document.getElementById('lang-menu').style.display = 'none';
    }

    toggleMinimize() {
        const body = document.getElementById('sp-body-content');
        if (body.style.display === 'none') {
            body.style.display = 'flex';
        } else {
            body.style.display = 'none';
        }
    }

    renderTransitionTab(container) {
        const currentSlide = this.slides[this.currentIndex] || {};
        const slideTransition = currentSlide.transition || { enter: 'slide-fade', exit: 'slide-fade', duration: 0.8, delay: 0, easing: 'ease-in-out' };

        const transitions = [
            { name: 'slide-fade', label: 'Fade' },
            { name: 'slide-slide-left', label: 'Slide ←' },
            { name: 'slide-slide-right', label: 'Slide →' },
            { name: 'slide-slide-up', label: 'Slide ↑' },
            { name: 'slide-slide-down', label: 'Slide ↓' },
            { name: 'slide-scale-up', label: 'Scale Up' },
            { name: 'slide-scale-down', label: 'Scale Down' },
            { name: 'slide-rotate-cw', label: 'Rotate CW' },
            { name: 'slide-rotate-ccw', label: 'Rotate CCW' },
            { name: 'slide-flip-horizontal', label: 'Flip H' },
            { name: 'slide-flip-vertical', label: 'Flip V' },
            { name: 'slide-cube-left', label: 'Cube ←' },
            { name: 'slide-cube-right', label: 'Cube →' },
            { name: 'slide-wipe-left', label: 'Wipe ←' },
            { name: 'slide-wipe-right', label: 'Wipe →' },
            { name: 'slide-wipe-circle', label: 'Wipe ○' },
            { name: 'slide-blur-in', label: 'Blur' },
            { name: 'slide-pixelate', label: 'Pixelate' },
            { name: 'slide-ken-burns', label: 'Ken Burns' },
            { name: 'slide-morph', label: 'Morph' }
        ];

        const easings = [
            { val: 'linear', label: 'Linear' },
            { val: 'ease', label: 'Ease' },
            { val: 'ease-in', label: 'Ease In' },
            { val: 'ease-out', label: 'Ease Out' },
            { val: 'ease-in-out', label: 'Ease In-Out' },
            { val: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)', label: 'Bounce' }
        ];

        const transOptions = transitions.map(t =>
            `<option value="${t.name}" ${slideTransition.enter === t.name ? 'selected' : ''}>${t.label}</option>`
        ).join('');

        const exitOptions = transitions.map(t =>
            `<option value="${t.name}" ${slideTransition.exit === t.name ? 'selected' : ''}>${t.label}</option>`
        ).join('');

        const easingOptions = easings.map(e =>
            `<option value="${e.val}" ${slideTransition.easing === e.val ? 'selected' : ''}>${e.label}</option>`
        ).join('');

        container.innerHTML = `
            <div class="sp-transition-panel">
                <div class="pc-form-group">
                    <label>Transição de Entrada</label>
                    <select id="trans-enter">${transOptions}</select>
                </div>
                
                <div class="pc-form-group">
                    <label>Transição de Saída</label>
                    <select id="trans-exit">${exitOptions}</select>
                </div>
                
                <div class="pc-row">
                    <div class="pc-form-group">
                        <label>Duração (s)</label>
                        <input type="number" id="trans-duration" step="0.1" min="0.1" max="3" value="${slideTransition.duration || 0.8}">
                    </div>
                    <div class="pc-form-group">
                        <label>Delay (s)</label>
                        <input type="number" id="trans-delay" step="0.1" min="0" max="5" value="${slideTransition.delay || 0}" title="Tempo de espera antes da transição começar">
                    </div>
                </div>
                
                <div class="pc-form-group">
                    <label>Curva</label>
                    <select id="trans-easing">${easingOptions}</select>
                </div>
                
                <div style="margin-top: 15px; padding: 10px; background: #f0f9ff; border-radius: 4px; font-size: 11px; color: #0369a1;">
                    <strong>Dica:</strong> O <strong>Delay</strong> define quanto tempo esperar antes da transição começar. 
                    Use isso para dar tempo às animações de saída dos elementos serem vistas antes do slide sair da tela.
                </div>
            </div>
        `;

        // Bind events
        setTimeout(() => {
            const saveTransition = () => {
                if (!this.slides[this.currentIndex].transition) {
                    this.slides[this.currentIndex].transition = {};
                }
                this.slides[this.currentIndex].transition.enter = document.getElementById('trans-enter').value;
                this.slides[this.currentIndex].transition.exit = document.getElementById('trans-exit').value;
                this.slides[this.currentIndex].transition.duration = parseFloat(document.getElementById('trans-duration').value);
                this.slides[this.currentIndex].transition.delay = parseFloat(document.getElementById('trans-delay').value);
                this.slides[this.currentIndex].transition.easing = document.getElementById('trans-easing').value;

                // Update editor
                if (this.editor) {
                    this.editor.config = JSON.parse(JSON.stringify(this.slides[this.currentIndex]));
                    this.editor.render();
                }
            };

            ['trans-enter', 'trans-exit', 'trans-duration', 'trans-delay', 'trans-easing'].forEach(id => {
                const el = document.getElementById(id);
                if (el) el.onchange = saveTransition;
            });
        }, 0);
    }

    showExportModal() {
        this.showExportDialog();
    }

    showConfirmModal(title, message) {
        return new Promise((resolve) => {
            const modal = document.createElement('div');
            modal.className = 'export-modal';
            modal.innerHTML = `
                <div class="export-modal-content" style="width: 350px; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 4px 15px rgba(0,0,0,0.2);">
                    <h3>${title}</h3>
                    <p style="color: #666; margin-bottom: 20px;">${message}</p>
                    <div class="export-modal-buttons">
                        <button class="export-btn-secondary" id="confirm-no">${this.i18n.t('btn_cancel')}</button>
                        <button class="export-btn-primary" id="confirm-yes" style="background: #dc2626;">${this.i18n.t('btn_confirm')}</button>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);

            modal.querySelector('#confirm-yes').onclick = () => {
                modal.remove();
                resolve(true);
            };

            modal.querySelector('#confirm-no').onclick = () => {
                modal.remove();
                resolve(false);
            };

            modal.onclick = (e) => {
                if (e.target === modal) {
                    modal.remove();
                    resolve(false);
                }
            };
        });
    }

    makeDraggable(el) {
        const header = el.querySelector('.sp-header');
        let isDown = false, startX, startY, initLeft, initTop;

        header.onmousedown = (e) => {
            isDown = true;
            startX = e.clientX;
            startY = e.clientY;
            const rect = el.getBoundingClientRect();
            initLeft = rect.left;
            initTop = rect.top;

            el.style.bottom = 'auto';
            el.style.right = 'auto';
            el.style.left = initLeft + 'px';
            el.style.top = initTop + 'px';
        };

        window.addEventListener('mousemove', (e) => {
            if (!isDown) return;
            const dx = e.clientX - startX;
            const dy = e.clientY - startY;
            el.style.left = (initLeft + dx) + 'px';
            el.style.top = (initTop + dy) + 'px';
        });

        window.addEventListener('mouseup', () => { isDown = false; });
    }

    renderSlideList() {
        const list = document.getElementById('sp-list');
        if (!list) return;
        list.innerHTML = '';

        const iconUp = `<svg viewBox="0 0 24 24"><path d="M7.41 15.41L12 10.83l4.59 4.58L18 14l-6-6-6 6z"/></svg>`;
        const iconDown = `<svg viewBox="0 0 24 24"><path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6z"/></svg>`;
        const iconDel = `<svg viewBox="0 0 24 24"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>`;

        this.slides.forEach((slide, index) => {
            const li = document.createElement('li');
            li.className = `sp-item ${index === this.currentIndex ? 'active' : ''}`;
            li.style.display = 'flex';
            li.style.alignItems = 'center';
            li.style.borderBottom = '1px solid #eee';

            // Click to select
            li.onclick = (e) => {
                if (!e.target.closest('button')) {
                    this.goToSlide(index);
                }
            };

            // Order Number
            const orderSpan = document.createElement('span');
            orderSpan.innerText = `${index + 1}.`;
            orderSpan.style.marginRight = '8px';
            orderSpan.style.width = '20px';
            orderSpan.style.fontWeight = 'bold';
            orderSpan.style.color = '#888';
            li.appendChild(orderSpan);

            // ID (Display Only)
            const idSpan = document.createElement('span');
            idSpan.className = 'sp-item-name';
            idSpan.innerText = slide.id;
            idSpan.style.flex = '1';
            idSpan.style.fontSize = '12px';
            idSpan.style.whiteSpace = 'nowrap';
            idSpan.style.overflow = 'hidden';
            idSpan.style.textOverflow = 'ellipsis';
            li.appendChild(idSpan);

            // Actions
            const actions = document.createElement('div');
            actions.className = 'sp-item-actions';

            const btnUp = document.createElement('button');
            btnUp.className = 'sp-btn-icon';
            btnUp.innerHTML = iconUp;
            btnUp.title = this.i18n.t("move_up");
            btnUp.onclick = (e) => { e.stopPropagation(); this.moveSlide(index, -1); };

            const btnDown = document.createElement('button');
            btnDown.className = 'sp-btn-icon';
            btnDown.innerHTML = iconDown;
            btnDown.title = this.i18n.t("move_down");
            btnDown.onclick = (e) => { e.stopPropagation(); this.moveSlide(index, 1); };

            const btnDel = document.createElement('button');
            btnDel.className = 'sp-btn-icon';
            btnDel.innerHTML = iconDel;
            btnDel.title = this.i18n.t("delete_slide");
            btnDel.style.color = '#dc2626';
            btnDel.onclick = (e) => { e.stopPropagation(); this.deleteSlide(index); };

            actions.appendChild(btnUp);
            actions.appendChild(btnDown);
            actions.appendChild(btnDel);
            li.appendChild(actions);

            list.appendChild(li);
        });

        // Update total count
        const countEl = document.getElementById('sp-count');
        if (countEl) countEl.innerText = this.slides.length;
    }

    moveSlide(index, direction) {
        const newIndex = index + direction;
        if (newIndex < 0 || newIndex >= this.slides.length) return;

        const slide = this.slides.splice(index, 1)[0];
        this.slides.splice(newIndex, 0, slide);

        // Update current index logic
        if (this.currentIndex === index) {
            this.currentIndex = newIndex;
        } else if (this.currentIndex === newIndex) {
            this.currentIndex = index;
        }

        this.renderSlideList();

        // If the moved slide was active, refresh view
        if (this.currentIndex === newIndex) {
            this.goToSlide(newIndex);
        }
    }

    deleteSlide(index) {
        if (this.slides.length <= 1) {
            this.toast.error(this.i18n.t("msg_min_slide"));
            return;
        }

        this.showConfirmModal(this.i18n.t("confirm_delete_title"), this.i18n.t("confirm_delete_msg")).then(confirmed => {
            if (confirmed) {
                this.slides.splice(index, 1);
                if (this.currentIndex >= this.slides.length) {
                    this.currentIndex = this.slides.length - 1;
                }
                this.goToSlide(this.currentIndex);
                this.renderSlideList();
            }
        });
    }



    updateUI() {
        // Atualiza o contador de slides
        const countEl = document.getElementById('sp-count');
        if (countEl) countEl.innerText = this.slides.length;

        // Atualiza a lista de slides se estiver visível
        this.renderSlideList();

        // Atualiza os inputs de meta se estiverem visíveis
        if (this.meta) {
            const nameInput = document.getElementById('sp-meta-name');
            const titleInput = document.getElementById('sp-meta-title');
            if (nameInput) nameInput.value = this.meta.name;
            if (titleInput) titleInput.value = this.meta.title;
        }
    }

    saveCurrentState() {
        if (this.editor) {
            this.slides[this.currentIndex] = JSON.parse(JSON.stringify(this.editor.config));
        }
    }

    getTransitionForSlide(index, direction) {
        const mode = this.meta.transitionMode || 'free';

        // If free mode, use individual slide transitions
        if (mode === 'free') {
            const slide = this.slides[index];
            if (slide.transition) {
                return direction === 'enter' ? slide.transition.enter : slide.transition.exit;
            }
            return 'slide-fade';
        }

        // Otherwise, use model-based transitions
        const transitions = {
            'carousel': { enter: 'slide-cube-left', exit: 'slide-cube-right' },
            'flipcards': { enter: 'slide-flip-horizontal', exit: 'slide-flip-horizontal' },
            'carddeck': { enter: 'slide-scale-up', exit: 'slide-scale-down' },
            'cube': { enter: 'slide-rotate-cw', exit: 'slide-rotate-ccw' },
            'coverflow': { enter: 'slide-flip-horizontal', exit: 'slide-flip-horizontal' }
        };

        const trans = transitions[mode] || transitions['free'];
        return direction === 'enter' ? trans.enter : trans.exit;
    }

    async goToSlide(index) {
        if (index < 0 || index >= this.slides.length) return;
        if (index === this.currentIndex || this.isTransitioning) return;

        this.isTransitioning = true;
        this.saveCurrentState();

        const direction = index > this.currentIndex ? 'next' : 'prev';
        const exitTransition = this.getTransitionForSlide(this.currentIndex, 'exit');

        // Pega o delay da transição do slide atual (converte segundos para ms)
        const currentSlide = this.slides[this.currentIndex];
        const transitionDelay = (currentSlide.transition?.delay || 0) * 1000;

        // Apply exit transition com delay
        // O delay permite que as animações de saída dos elementos sejam executadas
        if (this.editor && this.editor.viewer) {
            await this.editor.viewer.applyTransition(exitTransition, direction, transitionDelay);
        }

        this.currentIndex = index;

        const enterTransition = this.getTransitionForSlide(this.currentIndex, 'enter');

        if (typeof this.editor.setConfig === 'function') {
            this.editor.setConfig(this.slides[this.currentIndex]);
        } else {
            this.editor.config = JSON.parse(JSON.stringify(this.slides[this.currentIndex]));
            this.editor.selectItem(null);
            this.editor.render();
        }

        // Reset and apply enter transition
        if (this.editor && this.editor.viewer) {
            const viewer = this.editor.viewer;
            viewer.resetTransition();

            // 2. Prepare Entrance (Set Initial State)
            viewer.prepareEntrance(enterTransition);

            // 3. Prepare Items (Opacity 0)
            viewer.prepareForEntry();

            // 4. Execute Entrance
            setTimeout(() => {
                viewer.playEntrance(enterTransition);
                viewer.show(); // Show items
                this.isTransitioning = false;
            }, 100);
        } else {
            this.isTransitioning = false;
        }
        this.updateUI();
    }

    async addSlide() {
        this.saveCurrentState();
        const newSlide = this.createDefaultSlide();
        this.slides.push(newSlide);
        this.toast.success(`Slide ${this.slides.length} criado com sucesso!`);
        await this.goToSlide(this.slides.length - 1);
    }

    saveJSON() {
        this.saveCurrentState();
        this.meta.updated_at = new Date().toISOString();

        const exportData = {
            ...this.meta,
            slides: this.slides
        };

        const dataStr = JSON.stringify(exportData, null, 2);
        const blob = new Blob([dataStr], { type: "application/json" });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = 'presentation_slides.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        this.toast.success('Apresentação salva com sucesso!', 4000, 'JSON Exportado');
    }



    async fetchViewerCode() {
        try {
            const response = await fetch('./js/SlideViewer.js');
            if (response.ok) {
                let text = await response.text();
                return text.replace('export class SlideViewer', 'class SlideViewer');
            }
        } catch (e) {
            console.error(e);
        }
        return '';
    }

    showExportDialog() {
        const existing = document.querySelector('.confirm-modal');
        if (existing) existing.remove();

        const modal = document.createElement('div');
        modal.className = 'confirm-modal';
        modal.innerHTML = `
            <div class="confirm-content" style="width: 400px; padding: 25px; background: white; border-radius: 8px; box-shadow: 0 4px 20px rgba(0,0,0,0.15);">
                <h3 style="margin-top:0; color:#333; margin-bottom: 15px;">${this.i18n.t('export_title')}</h3>
                <p style="color:#666; margin-bottom:20px;">${this.i18n.t('export_msg')}</p>
                
                <div style="margin-bottom: 25px; display: flex; align-items: flex-start; gap: 10px; background: #f8f9fa; padding: 15px; border-radius: 8px; border: 1px solid #e9ecef;">
                    <input type="checkbox" id="pack-media-check" style="margin-top: 3px; cursor: pointer;">
                    <label for="pack-media-check" style="cursor: pointer;">
                        <div style="font-weight: 600; color: #333; margin-bottom: 4px;">${this.i18n.t('pack_media')}</div>
                        <div style="font-size: 12px; color: #666; line-height: 1.4;">
                            ${this.i18n.t('pack_media_desc')}
                        </div>
                    </label>
                </div>

                <div class="confirm-buttons" style="display: flex; justify-content: flex-end; gap: 10px;">
                    <button class="cancel-btn" onclick="this.closest('.confirm-modal').remove()" style="padding: 10px 20px; border: 1px solid #ddd; background: white; border-radius: 6px; cursor: pointer; color: #666;">${this.i18n.t('btn_cancel')}</button>
                    <button id="do-export-btn" style="padding: 10px 20px; background: #0284c7; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 500;">${this.i18n.t('btn_export')}</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);

        modal.querySelector('#do-export-btn').onclick = () => {
            const shouldPack = document.getElementById('pack-media-check').checked;
            this.exportHTML({ pack: shouldPack });
            modal.remove();
        };
    }

    /**
     * Internal helper to generate the HTML template for export.
     * Centralizes the code to avoid duplication between exportHTML and packAndExport.
     */
    _generateExportHTML(exportData, viewerCode, fontCSS = '') {
        const transitionMode = exportData.meta.transitionMode || 'free';

        return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${exportData.meta.title || 'Apresentação'}</title>
    <style>
        ${fontCSS}
        /* [Reused Styles from Index - Minimized for Export] */
        body { margin: 0; padding: 0; height: 100vh; background: #1a1a2e; overflow: hidden; font-family: sans-serif; }
        #app { width: 100%; height: 100%; position: relative; background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%); }
        #nav-ui { position: fixed; bottom: 20px; left: 50%; transform: translateX(-50%); display: flex; align-items: center; gap: 15px; background: rgba(255,255,255,0.1); backdrop-filter: blur(10px); padding: 10px 20px; border-radius: 30px; border: 1px solid rgba(255,255,255,0.2); transition: opacity 0.3s; z-index: 1000; }
        .nav-btn { background: rgba(0,0,0,0.4); border: none; border-radius: 50%; width: 36px; height: 36px; cursor: pointer; color: white; display: flex; align-items: center; justify-content: center; transition: all 0.2s; }
        .nav-btn:hover { background: rgba(0,0,0,0.6); }
        .nav-btn svg { width: 20px; height: 20px; fill: currentColor; }
        .nav-dots { display: flex; gap: 8px; }
        .nav-dot { width: 10px; height: 10px; border-radius: 50%; background: rgba(255,255,255,0.4); cursor: pointer; transition: all 0.2s; }
        .nav-dot:hover { background: rgba(255,255,255,0.8); }
        .nav-dot.active { background: white; transform: scale(1.2); }
        .mode-carousel .sv-slide { transform-style: preserve-3d; }
        .mode-cube .sv-slide { transform-style: preserve-3d; perspective: 1000px; }
        .mode-coverflow .sv-slide { transform-style: preserve-3d; perspective: 1500px; }
    </style>
</head>
<body>
    <div id="app"></div>
    <div id="nav-ui">
        <button class="nav-btn" id="btn-prev"><svg viewBox="0 0 24 24"><path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/></svg></button>
        <div class="nav-dots" id="dots-container"></div>
        <button class="nav-btn" id="btn-next"><svg viewBox="0 0 24 24"><path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/></svg></button>
        <button class="nav-btn" id="btn-fullscreen" title="Tela Cheia (Ctrl+F)">
            <svg id="fs-icon-enter" viewBox="0 0 24 24"><path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/></svg>
            <svg id="fs-icon-exit" viewBox="0 0 24 24" style="display:none;"><path d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z"/></svg>
        </button>
    </div>
    <script>
        ${viewerCode}
        const presentationData = ${JSON.stringify(exportData)};
        const transitionMode = '${transitionMode}';
        const app = document.getElementById('app');
        const slides = presentationData.slides;
        let currentIndex = 0;
        let viewer = null;
        let navTimeout = null;
        let isTransitioning = false;
        app.classList.add('mode-' + transitionMode);

        function getTransitionForSlide(index, direction) {
            if (transitionMode === 'free') {
                const slide = slides[index];
                if (slide.transition) return direction === 'enter' ? slide.transition.enter : slide.transition.exit;
                return 'slide-fade';
            }
            const transitions = {
                'carousel': { enter: 'slide-cube-left', exit: 'slide-cube-right' },
                'flipcards': { enter: 'slide-flip-horizontal', exit: 'slide-flip-horizontal' },
                'carddeck': { enter: 'slide-scale-up', exit: 'slide-scale-down' },
                'cube': { enter: 'slide-rotate-cw', exit: 'slide-rotate-ccw' },
                'coverflow': { enter: 'slide-flip-horizontal', exit: 'slide-flip-horizontal' }
            };
            const trans = transitions[transitionMode] || transitions['free'];
            return direction === 'enter' ? trans.enter : trans.exit;
        }

        function init() { renderSlide(0); setupNavigation(); setupAutoHide(); setupFullscreen(); }
        function renderSlide(index) {
            if (index < 0 || index >= slides.length) return;
            viewer = new SlideViewer(app, slides[index]);
            viewer.render();
            viewer.prepareForEntry();
            viewer.show();
            currentIndex = index;
            updateDots();
        }
        async function goTo(index) {
            if (index < 0 || index >= slides.length) return;
            if (index === currentIndex || isTransitioning) return;
            isTransitioning = true;
            const direction = index > currentIndex ? 'next' : 'prev';
            const exitTrans = getTransitionForSlide(currentIndex, 'exit');
            const currentSlide = slides[currentIndex];
            const transitionDelay = (currentSlide.transition?.delay || 0) * 1000;
            if (viewer) await viewer.applyTransition(exitTrans, direction, transitionDelay);
            currentIndex = index;
            const enterTrans = getTransitionForSlide(currentIndex, 'enter');
            viewer = new SlideViewer(app, slides[currentIndex]);
            viewer.render();
            viewer.resetTransition();
            viewer.prepareEntrance(enterTrans);
            viewer.prepareForEntry();
            setTimeout(() => { viewer.playEntrance(enterTrans); viewer.show(); isTransitioning = false; }, 100);
            updateDots();
        }
        window.addEventListener('slide-link-click', (e) => {
            const link = e.detail.link;
            if (!link) return;
            if (link.startsWith('#')) {
                const targetId = link.substring(1);
                const targetIndex = slides.findIndex(s => s.id === targetId);
                if (targetIndex !== -1) goTo(targetIndex);
            } else { window.open(link, '_blank'); }
        });
        function setupNavigation() {
            document.getElementById('btn-prev').onclick = () => goTo(currentIndex - 1);
            document.getElementById('btn-next').onclick = () => goTo(currentIndex + 1);
            const dotsContainer = document.getElementById('dots-container');
            slides.forEach((_, i) => {
                const dot = document.createElement('div');
                dot.className = 'nav-dot';
                dot.onclick = () => goTo(i);
                dotsContainer.appendChild(dot);
            });
            window.addEventListener('keydown', (e) => {
                if (e.key === 'ArrowRight' || e.key === 'ArrowDown') goTo(currentIndex + 1);
                if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') goTo(currentIndex - 1);
                if (e.ctrlKey && e.key.toLowerCase() === 'f') { e.preventDefault(); toggleFullscreen(); }
            });
        }
        function updateDots() {
            const dots = document.querySelectorAll('.nav-dot');
            dots.forEach((d, i) => { d.className = 'nav-dot ' + (i === currentIndex ? 'active' : ''); });
        }
        function setupAutoHide() {
            const nav = document.getElementById('nav-ui');
            const showNav = () => { nav.style.opacity = '1'; clearTimeout(navTimeout); navTimeout = setTimeout(() => { nav.style.opacity = '0'; }, 5000); };
            window.addEventListener('mousemove', showNav);
            window.addEventListener('click', showNav);
            showNav();
        }
        function setupFullscreen() {
            const btn = document.getElementById('btn-fullscreen');
            const iconEnter = document.getElementById('fs-icon-enter');
            const iconExit = document.getElementById('fs-icon-exit');
            btn.onclick = toggleFullscreen;
            document.addEventListener('fullscreenchange', () => {
                const isFS = !!document.fullscreenElement;
                iconEnter.style.display = isFS ? 'none' : 'block';
                iconExit.style.display = isFS ? 'block' : 'none';
            });
        }
        function toggleFullscreen() {
            if (!document.fullscreenElement) {
                document.documentElement.requestFullscreen().catch(err => console.error(err));
            } else {
                if (document.exitFullscreen) document.exitFullscreen();
            }
        }
        init();
    </script>
</body>
</html>`;
    }

    async exportHTML(options = { pack: false }) {
        // Save state before export
        this.saveCurrentState();
        this.meta.updated_at = new Date().toISOString();

        // Close dialog if consistent
        const existing = document.querySelector('.confirm-modal');
        if (existing) existing.remove();

        if (options.pack) {
            await this.packAndExport();
            return;
        }

        const viewerCode = await this.fetchViewerCode();
        if (!viewerCode) {
            this.toast.error('Erro ao carregar código do visualizador.', 4000);
            return;
        }

        const exportData = {
            meta: this.meta,
            slides: this.slides
        };

        const html = this._generateExportHTML(exportData, viewerCode);

        // Download simples do HTML
        const blob = new Blob([html], { type: "text/html" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = (this.meta.name || 'presentation').replace(/[^a-z0-9]/gi, '_').toLowerCase() + '.html';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        this.toast.success('Apresentação exportada com sucesso!', 4000, 'HTML Exportado');
    }



    async packAndExport() {
        if (typeof JSZip === 'undefined') {
            this.toast.error('Biblioteca JSZip não carregada. Recarregue a página.', 4000);
            return;
        }

        const zip = new JSZip();
        // Creates /img folder in zip
        const imgFolder = zip.folder("img");
        // Creates /fonts folder in zip (will be populated only if needed)
        const fontsFolder = zip.folder("fonts");

        // Deep copy slides to modify paths locally
        let processedSlides = JSON.parse(JSON.stringify(this.slides));
        const downloadedImages = new Map(); // Url -> Filename
        const usedFonts = new Set(); // To track font families used

        this.toast.info('Empacotando mídias...', 2000);

        // Helper to process specific image URL
        const processImage = async (url) => {
            if (!url) return null;
            // Removed data: skip to allow processing

            // Deduplication: Checks if this specific URL (including Base64 data) has already been processed
            if (downloadedImages.has(url)) {
                return './img/' + downloadedImages.get(url);
            }

            try {
                let filename = '';
                let blob = null;

                if (url.startsWith('data:')) {
                    // Handle Data URIs (Base64)
                    const response = await fetch(url);
                    blob = await response.blob();

                    // Infer extension from MIME type
                    const mime = blob.type;
                    let ext = 'png';
                    if (mime === 'image/jpeg') ext = 'jpg';
                    if (mime === 'image/gif') ext = 'gif';
                    if (mime === 'image/svg+xml') ext = 'svg';
                    if (mime === 'image/webp') ext = 'webp';

                    // Simple naming
                    filename = `image_${Date.now()}_${Math.floor(Math.random() * 1000)}.${ext}`;

                } else if (url.startsWith('blob:')) {
                    // Handle Blob URLs (Legacy/Session)
                    const response = await fetch(url);
                    if (!response.ok) throw new Error('Fetch failed for blob');
                    blob = await response.blob();

                    const mime = blob.type;
                    let ext = 'png';
                    if (mime === 'image/jpeg') ext = 'jpg';
                    if (mime === 'image/gif') ext = 'gif';
                    if (mime === 'image/svg+xml') ext = 'svg';
                    if (mime === 'image/webp') ext = 'webp';

                    filename = `local_image_${Date.now()}_${Math.floor(Math.random() * 1000)}.${ext}`;

                } else {
                    // Handle Remote URLs
                    let basename = url.split('/').pop().split('?')[0] || 'image.jpg';
                    basename = basename.replace(/[^a-zA-Z0-9._-]/g, '_');

                    const nameParts = basename.split('.');
                    const ext = nameParts.length > 1 ? nameParts.pop() : '';
                    const name = nameParts.join('.');

                    filename = basename;

                    // Ensure unique filename if different content has same name (not full collision check but safe enough)
                    let counter = 1;
                    let originalName = name;
                    const usedNames = Array.from(downloadedImages.values());

                    while (usedNames.includes(filename)) {
                        filename = `${originalName}_${counter}.${ext}`;
                        counter++;
                    }

                    const response = await fetch(url);
                    if (!response.ok) throw new Error('Fetch failed');
                    blob = await response.blob();
                }

                imgFolder.file(filename, blob);
                downloadedImages.set(url, filename); // Store mapping: Base64 -> Filename
                return './img/' + filename;

            } catch (e) {
                console.warn('Falha ao baixar imagem:', url, e);
                return url;
            }
        };

        // 1. Scan and Process Slides
        for (const slide of processedSlides) {
            // Track Fonts in Slide Background? (Not usual, but checks just in case)
            // Process Background Image
            if (slide.background.type === 'image' && slide.background.value) {
                const newPath = await processImage(slide.background.value);
                if (newPath) slide.background.value = newPath;
            }

            // Process Items
            // Process Items
            for (const item of slide.items) {
                // Track Fonts
                // NEW SCHEMA: item.content.fontFamily
                const fontFamily = item.content?.fontFamily || item.style?.fontFamily;
                if (fontFamily) {
                    usedFonts.add(fontFamily);
                }

                // Process Images
                // NEW SCHEMA: item.content.value for images
                if (item.type === 'image' && item.content?.value) {
                    const newPath = await processImage(item.content.value);
                    if (newPath) item.content.value = newPath;
                }
            }
        }

        // 2. Process Fonts
        let packedFonts = [];
        let fontCSS = '';

        try {
            // Always include default fonts if you rely on them? 
            // System fonts don't need packing.

            const response = await fetch('fonts/manifest.json');
            if (response.ok) {
                const manifest = await response.json();
                if (manifest.fonts) {
                    for (const font of manifest.fonts) {
                        // Check if this font is used
                        if (usedFonts.has(font.name) || font.name === 'Roboto') { // Always pack Roboto or default if needed
                            try {
                                const fontRes = await fetch(`fonts/${font.file}`);
                                if (fontRes.ok) {
                                    const fontBlob = await fontRes.blob();
                                    fontsFolder.file(font.file, fontBlob);

                                    packedFonts.push(font);

                                    // Generate CSS for this used font
                                    const format = font.format || 'truetype';
                                    fontCSS += `
                                        @font-face {
                                            font-family: "${font.name}";
                                            src: url("./fonts/${font.file}") format("${format}");
                                            font-weight: ${font.weight || 'normal'};
                                            font-style: ${font.style || 'normal'};
                                            font-display: swap;
                                        }
                                    `;
                                }
                            } catch (e) { console.warn('Falha fonte:', font.name); }
                        }
                    }
                }
            }

            // Create reduced manifest
            if (packedFonts.length > 0) {
                const reducedManifest = { fonts: packedFonts };
                fontsFolder.file("manifest.json", JSON.stringify(reducedManifest, null, 2));
            }

        } catch (e) { console.warn('Erro ao processar fontes', e); }

        // 3. Generate HTML with updated paths
        const viewerCode = await this.fetchViewerCode();
        if (!viewerCode) {
            this.toast.error('Erro ao obter código do viewer', 3000);
            return;
        }

        const exportData = { meta: this.meta, slides: processedSlides };
        const html = this._generateExportHTML(exportData, viewerCode, fontCSS);

        zip.file("index.html", html);

        const content = await zip.generateAsync({ type: "blob" });
        const blobUrl = URL.createObjectURL(content);
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = (this.meta.name || 'presentation').replace(/[^a-z0-9]/gi, '_').toLowerCase() + '_packed.zip';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(blobUrl);

        this.toast.success('Pacote ZIP gerado com sucesso!', 5000, 'Exportação Concluída');
    }

    loadJSON(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                let loadedSlides = [];

                if (Array.isArray(data)) {
                    loadedSlides = data;
                    this.meta = {
                        name: 'Apresentação Carregada',
                        title: 'Sem Título',
                        updated_at: new Date().toISOString(),
                        transitionMode: 'free'
                    };
                } else if (data.slides && Array.isArray(data.slides)) {
                    loadedSlides = data.slides;
                    this.meta = {
                        name: data.name || 'Nova Apresentação',
                        title: data.title || 'Sem Título',
                        updated_at: data.updated_at || new Date().toISOString(),
                        transitionMode: data.transitionMode || 'free'
                    };
                } else {
                    this.toast.error('Arquivo JSON inválido. Esperado um objeto de apresentação ou array de slides.', 5000, 'Erro');
                    return;
                }

                // Ensure transitions exist
                loadedSlides.forEach(slide => {
                    if (!slide.transition) {
                        slide.transition = {
                            enter: 'slide-fade',
                            exit: 'slide-fade',
                            duration: 0.8,
                            delay: 0,
                            easing: 'ease-in-out'
                        };
                    }
                    // Garante que o delay existe (para slides de JSON antigo)
                    if (slide.transition.delay === undefined) {
                        slide.transition.delay = 0;
                    }
                });

                // MIGRATION: Ensure all loaded slides are in new schema
                if (loadedSlides.length > 0) {
                    loadedSlides = loadedSlides.map(slide => this.migrateSlideData(slide));
                    this.slides = loadedSlides;

                    if (loadedSlides.length > 0) {
                        this.slides = loadedSlides;
                        this.currentIndex = 0;
                        this.editor.setConfig(this.slides[0]);
                        this.editor.testShow();
                        this.updateUI();
                        this.toast.success(`${loadedSlides.length} slides carregados com sucesso!`, 4000, 'JSON Carregado');
                    } else {
                        this.toast.warning('Nenhum slide encontrado no arquivo.', 4000, 'Aviso');
                    }
                } // End if loadedSlides.length > 0
            } catch (err) {
                console.error(err);
                this.toast.error('Erro ao processar arquivo JSON', 5000, 'Erro');
            }
        };
        reader.readAsText(file);
        event.target.value = '';
    }

    async fetchModels() {
        try {
            const response = await fetch('models/models.json');
            if (!response.ok) throw new Error('Falha ao carregar lista de modelos');
            const data = await response.json();
            this.showModelSelectionModal(data);
        } catch (e) {
            console.error(e);
            this.toast.error('Erro ao buscar modelos disponíveis.', 4000, 'Erro de Rede');
        }
    }

    showModelSelectionModal(data) {
        const modal = document.createElement('div');
        modal.className = 'confirm-modal'; // Reuse modal wrapper style

        let listHtml = '';
        if (data.models && data.models.length > 0) {
            listHtml = data.models.map(m => `
                <li class="model-item" onclick="presentation.confirmLoadModel('${m.name}', '${m.modelname}')">
                    <div class="model-item-title">${m.name}</div>
                    <div class="model-item-desc">${m.description}</div>
                </li>
            `).join('');
        } else {
            listHtml = '<div style="padding:20px;text-align:center;color:#666">Nenhum modelo encontrado.</div>';
        }

        modal.innerHTML = `
            <div class="model-modal-content">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:15px">
                    <h3 style="margin:0;color:#333">${data.title || 'Modelos'}</h3>
                    <button onclick="this.closest('.confirm-modal').remove()" style="background:none;border:none;font-size:20px;cursor:pointer;color:#666">&times;</button>
                </div>
                <ul class="model-list">
                    ${listHtml}
                </ul>
            </div>
        `;
        document.body.appendChild(modal);

        // Close on outside click
        modal.onclick = (e) => {
            if (e.target === modal) modal.remove();
        };
    }

    async confirmLoadModel(name, filename) {
        // Close selection modal
        const existingModal = document.querySelector('.confirm-modal');
        if (existingModal) existingModal.remove();

        const confirmed = await this.showConfirmModal(
            'Carregar Modelo selecionado?',
            `Tem certeza que deseja carregar o modelo "<strong>${name}</strong>"?<br>Isso substituirá sua apresentação atual. Salve antes se necessário.`
        );

        if (confirmed) {
            this.loadModel(filename);
        }
    }

    async loadModel(filename) {
        try {
            const response = await fetch(`models/${filename}`);
            if (!response.ok) throw new Error('Falha ao baixar arquivo do modelo');
            const data = await response.json();

            // Validate basic structure
            if (!data.slides && !Array.isArray(data)) {
                throw new Error('Formato de arquivo inválido');
            }

            // Normalizing data
            if (Array.isArray(data)) {
                this.meta = {
                    name: 'Nova Apresentação',
                    title: 'Baseado em Modelo',
                    updated_at: new Date().toISOString(),
                    transitionMode: 'free'
                };
                this.slides = data;
            } else {
                this.meta = {
                    name: data.name || 'Nova Apresentação',
                    title: data.title || 'Baseado em Modelo',
                    updated_at: data.updated_at || new Date().toISOString(),
                    transitionMode: data.transitionMode || 'free'
                };
                this.slides = data.slides || [];
            }

            // MIGRATION: Ensure all loaded slides are in new schema
            this.slides = this.slides.map(slide => this.migrateSlideData(slide));

            // Re-initialize editor with new slides
            this.currentIndex = 0;
            // Assuming editor has a setConfig method based on loadJSON usage, ensuring it updates everything.
            // If SlideEditor creation is needed again, we might need to handle it. 
            // Based on loadJSON: this.editor.setConfig(this.slides[0]);

            if (this.editor) {
                this.editor.setConfig(this.slides[0]);
            }

            this.renderSlideList();

            // Update UI
            const modeSelect = document.getElementById('sp-transition-mode');
            if (modeSelect) modeSelect.value = this.meta.transitionMode;

            this.toast.success('Modelo carregado com sucesso!', 3000, 'Sucesso');

            // Force a test show to refresh visuals
            setTimeout(() => {
                if (this.editor) this.editor.testShow();
            }, 500);

        } catch (e) {
            console.error(e);
            this.toast.error('Não foi possível carregar o modelo selecionado.', 4000, 'Erro');
        }
    }

    // Helper: Migrate Single Slide Data (Old -> New Schema)
    migrateSlideData(slide) {
        if (!slide.items) return slide;

        slide.items.forEach(item => {
            // Check if it's already migrated (has item.box)
            if (item.box) return;

            // If it has item.data, it's the old schema
            if (item.data) {
                // Initialize new structure
                item.box = item.data.box || { x: 0, y: 0, w: 100, h: 100, z: 1, rot: 0 };
                item.content = {};
                item.style = {};
                item.animation = {
                    enter: { type: 'none', duration: 1.0, delay: 0, easing: 'ease-in-out' },
                    exit: { type: 'none', duration: 1.0, delay: 0 },
                    loop: { geo: { type: 'none' }, vis: { type: 'none' } },
                    hover: { geo: { type: 'none' }, vis: { type: 'none' } }
                };
                item.link = {};

                // Move Link
                if (item.data.link) item.link.url = item.data.link;

                // Move Animations
                if (item.data.anim) {
                    item.animation.enter.type = item.data.anim;
                    item.animation.enter.duration = item.data.animDuration || 1.0;
                    item.animation.enter.delay = item.data.animDelay || 0;
                    item.animation.enter.easing = item.data.animTimingFunction || 'linear';
                }
                if (item.data.animExit) {
                    item.animation.exit.type = item.data.animExit;
                    item.animation.exit.duration = item.data.exitDuration || 1.0;
                    item.animation.exit.delay = item.data.exitDelay || 0;
                }

                // Move Loop Animations
                if (item.data.loopGeo) {
                    item.animation.loop.geo.type = item.data.loopGeo;
                    item.animation.loop.geo.duration = item.data.loopGeoDuration || 2.0;
                    item.animation.loop.geo.timing = item.data.loopGeoTiming || 'linear';
                }
                if (item.data.loopVis) {
                    item.animation.loop.vis.type = item.data.loopVis;
                    item.animation.loop.vis.duration = item.data.loopVisDuration || 2.0;
                    item.animation.loop.vis.timing = item.data.loopVisTiming || 'linear';
                }

                // Move Hover Animations
                if (item.data.hoverGeo) {
                    item.animation.hover.geo.type = item.data.hoverGeo;
                    item.animation.hover.geo.duration = item.data.hoverGeoDuration || 2.0;
                }
                if (item.data.hoverVis) {
                    item.animation.hover.vis.type = item.data.hoverVis;
                }

                // Move Style & Content
                if (item.type === 'text') {
                    item.content.value = item.data.value;
                    item.content.fontFamily = item.data.fontFamily;
                    item.content.fontSize = item.data.fontSize;
                    item.content.textAlign = item.data.textAlign;
                    item.content.fontWeight = item.data.fontWeight;
                    item.content.fontStyle = item.data.fontStyle;
                    item.content.textDecoration = item.data.textDecoration;
                    item.style.color = item.data.color;
                } else if (item.type === 'image') {
                    item.content.value = item.data.value;
                    item.content.clipShape = item.data.clipShape; // If it existed
                    item.style.backgroundColor = item.data.backgroundColor;
                } else if (item.type === 'shape') {
                    item.style.color = item.data.color;
                    item.content.shapeType = item.data.shapeType || 'rect';
                }

                // Common Styles
                item.style.opacity = item.data.opacity !== undefined ? item.data.opacity : 1;
                item.style.borderWidth = item.data.borderWidth;
                item.style.borderColor = item.data.borderColor;
                item.style.effect = item.data.staticEffect;

                // Cleanup
                delete item.data;
            }
        });
        return slide;
    }
}
