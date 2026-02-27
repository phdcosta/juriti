
import { SlideViewer } from './SlideViewer.js';
import { getToast } from './ToastSystem.js';
import { getFontManager } from './FontManager.js';
import {
    ICONS,
    TRANSITIONS,
    EASINGS,
    CLIP_SHAPES,
    STATIC_EFFECTS,
    ANIMATIONS_ENTER,
    ANIMATIONS_EXIT,
    GEO_OPTIONS,
    VIS_OPTIONS,
    TIMING_OPTIONS
} from './SlideEditorConstants.js';

/**
 * SlideEditor
 * Provides WYSIWYG editing capabilities on top of SlideViewer.
 * Enhanced with transition controls and new effect options.
 */
export class SlideEditor {
    constructor(container, initialData = null, i18n = null) {
        this.container = container;
        this.config = initialData || this.getDefaultConfig();

        // State
        this.viewer = null;
        this.selectedItemId = null;
        this.activeTab = 'pos'; // pos, style, anim, tools
        this.onChange = null;
        this.clipboard = null;

        // I18n Fallback
        this.i18n = i18n || { t: (k) => k };
        this.fontManager = getFontManager();

        // Interaction State
        this.interaction = {
            isDragging: false,
            isResizing: false,
            isRotating: false,
            activeHandle: null,
            startX: 0, startY: 0,
            initialProps: {}
        };

        // Inicializa o gerenciador de fontes
        this.initFonts();

        // Expose globally for HTML event handlers
        window.editor = this;

        this.init();
    }

    getDefaultConfig() {
        return {
            id: 'slide_' + Date.now(),
            width: 800,
            height: 600,
            background: { type: 'color', value: '#ffffff', opacity: 1 },
            transition: {
                enter: 'slide-fade',
                exit: 'slide-fade',
                duration: 0.8,
                easing: 'ease-in-out'
            },
            items: []
        };
    }

    async initFonts() {
        await this.fontManager.init();
    }

    init() {
        this.injectEditorStyles();
        this.renderLayout();
        // initViewer and attachGlobalEvents are called inside renderLayout, removing duplicates here.
    }

    setConfig(newData) {
        this.config = JSON.parse(JSON.stringify(newData));
        this.selectItem(null);
        if (this.viewer) {
            this.viewer.config = this.config;
            this.viewer.render();
        }
        this.render();
        this.notifyChange();
    }

    notifyChange() {
        if (this.onChange) this.onChange(this.config);
    }

    injectEditorStyles() {
        if (document.getElementById('se-styles')) return;
        const style = document.createElement('style');
        style.id = 'se-styles';
        style.textContent = `
            .se-wrapper { position: relative; width: 100%; height: 100%; display: flex; flex-direction: column; overflow: hidden; font-family: 'Segoe UI', sans-serif; }
            .se-workspace { flex: 1; background: #000000ff; position: relative; overflow: auto; display: flex; align-items: center; justify-content: center; user-select: none; }
            
            .se-overlay-item { position: absolute; box-sizing: border-box; cursor: grab; z-index: 10; border: 1px dashed transparent; }
            .se-overlay-item.selected { border: 2px solid #2563eb; z-index: 1000; }
            
            .se-handle { position: absolute; width: 10px; height: 10px; background: white; border: 1px solid #2563eb; border-radius: 50%; z-index: 1001; }
            .se-handle.nw { top: -6px; left: -6px; cursor: nw-resize; }
            .se-handle.ne { top: -6px; right: -6px; cursor: ne-resize; }
            .se-handle.sw { bottom: -6px; left: -6px; cursor: sw-resize; }
            .se-handle.se { bottom: -6px; right: -6px; cursor: se-resize; }
            
            .se-rot-line { position: absolute; top: -25px; left: 50%; width: 1px; height: 25px; background: #2563eb; transform: translateX(-50%); }
            .se-rot-handle { position: absolute; top: -32px; left: 50%; width: 12px; height: 12px; background: #2563eb; border-radius: 50%; transform: translateX(-50%); cursor: grab; z-index: 1002; }

            .se-toolbar { position: absolute; top: 20px; right: 20px; width: 340px; background: white; border-radius: 8px; box-shadow: 0 10px 25px rgba(0,0,0,0.15); display: none; flex-direction: column; z-index: 2000; border: 1px solid #ddd; max-height: 85vh; overflow-y: auto; }
            .se-toolbar.visible { display: flex; }
            .se-tb-header { background: #f8f9fa; padding: 10px; border-bottom: 1px solid #ddd; display: flex; justify-content: space-between; cursor: move; }
            .se-tabs { display: flex; background: #f1f3f5; border-bottom: 1px solid #ddd; }
            .se-tab { flex: 1; border: none; background: transparent; padding: 8px; font-size: 12px; cursor: pointer; border-bottom: 2px solid transparent; }
            .se-tab.active { background: white; color: #2563eb; border-bottom-color: #2563eb; }
            .se-tab.active { background: white; color: #2563eb; border-bottom-color: #2563eb; }
            .se-tb-body { padding: 15px; }
            .se-content { padding: 15px; overflow-y: auto; flex: 1; }
            
            .pc-form-group { margin-bottom: 12px; }
            .pc-form-group label { display: block; font-size: 11px; color: #666; margin-bottom: 4px; text-transform: uppercase; letter-spacing: 0.5px; }
            .pc-input { width: 100%; padding: 6px; border: 1px solid #ddd; border-radius: 4px; font-size: 13px; box-sizing: border-box; }
            .pc-row { display: flex; gap: 10px; }
            .pc-btn { width: 100%; padding: 8px; border: none; border-radius: 4px; cursor: pointer; font-weight: 600; font-size: 13px; margin-bottom: 5px; }
            .pc-btn-primary { background: #2563eb; color: white; }
            .pc-btn-secondary { background: #e5e7eb; color: #374151; }
            .pc-btn-danger { background: #dc2626; color: white; }
            
            .pc-icon-btn-group { display: flex; gap: 8px; margin-bottom: 12px; }
            .pc-icon-btn { flex: 1; height: 40px; display: flex; align-items: center; justify-content: center; background: #e5e7eb; border: none; border-radius: 4px; cursor: pointer; color: #374151; transition: background 0.2s; }
            .pc-icon-btn:hover { background: #d1d5db; }
            .pc-icon-btn.active { background: #bfdbfe; color: #1e3a8a; border: 1px solid #2563eb; }
            .pc-icon-btn svg { width: 20px; height: 20px; fill: currentColor; }

            .pc-subtab-item { padding: 5px 10px; cursor: pointer; border-bottom: 2px solid transparent; opacity: 0.6; font-size: 12px; }
            .pc-subtab-item.active { border-bottom-color: #2563eb; opacity: 1; }

            .se-modal { position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 3000; }
            .se-modal-content { background: white; padding: 20px; border-radius: 8px; width: 80%; height: 90%; min-height: 500px; display: flex; flex-direction: column; }
            .se-modal textarea { flex: 1; margin-bottom: 10px; padding: 10px; resize: none; font-family: monospace; font-size: 12px; }

            .effect-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 5px; margin-bottom: 10px; }
            .effect-btn { padding: 6px 8px; font-size: 11px; border: 1px solid #ddd; background: #f8f9fa; border-radius: 4px; cursor: pointer; text-align: left; }
            .effect-btn:hover { background: #e5e7eb; }
            .effect-btn.active { background: #bfdbfe; border-color: #2563eb; color: #1e3a8a; }

            .section-title { font-size: 12px; font-weight: 600; color: #374151; margin: 15px 0 8px 0; padding-bottom: 5px; border-bottom: 1px solid #e5e7eb; }
        `;
        document.head.appendChild(style);
    }

    renderLayout() {
        if (!this.wrapper) {
            this.container.innerHTML = '';
            this.wrapper = document.createElement('div');
            this.wrapper.className = 'se-wrapper';

            // Workspace
            this.workspace = document.createElement('div');
            this.workspace.className = 'se-workspace';
            this.wrapper.appendChild(this.workspace);

            // Viewer Container
            this.viewerContainer = document.createElement('div');
            this.viewerContainer.style.position = 'absolute';
            this.viewerContainer.style.top = '0';
            this.viewerContainer.style.left = '0';
            this.viewerContainer.style.width = '100%';
            this.viewerContainer.style.height = '100%';
            this.viewerContainer.style.pointerEvents = 'none';
            this.workspace.appendChild(this.viewerContainer);

            // Editor Overlay
            this.overlay = document.createElement('div');
            this.overlay.className = 'se-overlay';
            this.overlay.style.position = 'absolute';
            this.workspace.appendChild(this.overlay);

            // Toolbar - Editor Window
            this.toolbar = document.createElement('div');
            this.toolbar.className = 'se-toolbar visible'; // Always visible initially
            this.toolbar.style.display = 'flex';
            this.wrapper.appendChild(this.toolbar);

            this.container.appendChild(this.wrapper);

            this.initViewer();
            this.attachGlobalEvents();

            // Events
            this.workspace.onmousedown = (e) => {
                if (e.target === this.workspace || e.target === this.overlay) {
                    this.selectItem(null);
                }
            };
        }

        this.renderToolbarUI();
    }

    updateLanguage() {
        // Just refresh the toolbar UI without destroying layout
        this.renderToolbarUI();
        // Also refresh content props if an item is selected
        if (this.selectedItemId) {
            this.renderToolbarContent();
        }
    }

    renderToolbarUI() {
        // Icons are now imported from constants

        this.toolbar.innerHTML = `
            <div class="se-tb-header">
                <span style="font-weight:600">${this.i18n.t('editor_title')}</span>
                <button class="se-minimize-btn" style="border:none;background:none;cursor:pointer;">_</button>
            </div>
            
            <!-- Element Creation Toolbar -->
            <div class="se-tools-row" style="padding: 10px; border-bottom: 1px solid #ddd; display: flex; gap: 5px; flex-wrap: wrap;">
                <button class="pc-icon-btn" title="${this.i18n.t('add_text')}" onclick="editor.addItem('text')">${ICONS.TEXT}</button>
                <button class="pc-icon-btn" title="${this.i18n.t('add_image')}" onclick="editor.addItem('image')">${ICONS.IMAGE}</button>
                <button class="pc-icon-btn" title="${this.i18n.t('add_rect')}" onclick="editor.addItem('shape', {shapeType:'rect'})">${ICONS.SQUARE}</button>
                <button class="pc-icon-btn" title="${this.i18n.t('add_circle')}" onclick="editor.addItem('shape', {shapeType:'circle'})">${ICONS.CIRCLE}</button>
                <div style="width: 1px; background: #ddd; margin: 0 5px;"></div>
                <button class="pc-icon-btn pc-btn-danger" title="${this.i18n.t('del_item')}" onclick="editor.deleteItem()">${ICONS.DELETE}</button>
            </div>

            <div class="se-tabs">
                <button class="se-tab ${this.activeTab === 'pos' ? 'active' : ''}" data-tab="pos">${this.i18n.t('pos_tab')}</button>
                <button class="se-tab ${this.activeTab === 'style' ? 'active' : ''}" data-tab="style">${this.i18n.t('style_tab')}</button>
                <button class="se-tab ${this.activeTab === 'anim' ? 'active' : ''}" data-tab="anim">${this.i18n.t('anim_tab')}</button>
            </div>

            <div class="se-content" id="se-toolbar-content"></div>
        `;

        // Bind events
        const tabs = this.toolbar.querySelectorAll('.se-tab');
        tabs.forEach(tab => {
            tab.onclick = () => {
                tabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                this.activeTab = tab.dataset.tab;
                this.renderToolbarContent();
            };
        });

        const minBtn = this.toolbar.querySelector('.se-minimize-btn');
        if (minBtn) {
            minBtn.onclick = () => {
                const body = this.toolbar.querySelector('.se-content');
                const tools = this.toolbar.querySelector('.se-tools-row');
                const tabs = this.toolbar.querySelector('.se-tabs');

                const isHidden = body.style.display === 'none';
                body.style.display = isHidden ? 'block' : 'none';
                tools.style.display = isHidden ? 'flex' : 'none';
                tabs.style.display = isHidden ? 'flex' : 'none';
            };
        }

        this.makeElementDraggable(this.toolbar, this.toolbar.querySelector('.se-tb-header'));
        this.renderToolbarContent();
    }

    initViewer() {
        this.viewer = new SlideViewer(this.viewerContainer, this.config);
        this.render();
    }

    render() {
        this.viewer.render();

        const viewerSlide = this.viewer.slideEl;
        if (viewerSlide) {
            this.overlay.style.width = viewerSlide.style.width;
            this.overlay.style.height = viewerSlide.style.height;
            this.overlay.style.transform = viewerSlide.style.transform;
            this.overlay.style.left = viewerSlide.style.left;
            this.overlay.style.top = viewerSlide.style.top;
            this.overlay.style.transformOrigin = viewerSlide.style.transformOrigin;
        }

        this.renderOverlayItems();
    }

    renderOverlayItems() {
        this.overlay.innerHTML = '';
        this.config.items.forEach(item => {
            const el = document.createElement('div');
            el.className = 'se-overlay-item';
            el.id = 'ov_' + item.id;
            // NEW SCHEMA: properties in item.box
            el.style.left = item.box.x + 'px';
            el.style.top = item.box.y + 'px';
            el.style.width = item.box.w + 'px';
            el.style.height = item.box.h + 'px';
            el.style.transform = `rotate(${item.box.rot || 0}deg)`;
            el.style.zIndex = (item.box.z || 1) + 100;

            el.onmousedown = (e) => {
                e.stopPropagation();
                this.selectItem(item.id);
                this.startInteraction('drag', e);
            };

            el.onmouseenter = () => {
                if (this.viewer) {
                    const viewEl = this.viewer.slideEl.querySelector('#sv_' + item.id);
                    if (viewEl) this.viewer.handleHover(viewEl, item, true);
                }
            };
            el.onmouseleave = () => {
                if (this.viewer) {
                    const viewEl = this.viewer.slideEl.querySelector('#sv_' + item.id);
                    if (viewEl) this.viewer.handleHover(viewEl, item, false);
                }
            };

            if (this.selectedItemId === item.id) {
                el.classList.add('selected');
                this.createHandles(el);
            }

            this.overlay.appendChild(el);
        });
    }

    createHandles(el) {
        ['nw', 'ne', 'sw', 'se'].forEach(dir => {
            const h = document.createElement('div');
            h.className = `se-handle ${dir}`;
            h.onmousedown = (e) => {
                e.stopPropagation();
                this.interaction.activeHandle = dir;
                this.startInteraction('resize', e);
            };
            el.appendChild(h);
        });

        const line = document.createElement('div');
        line.className = 'se-rot-line';
        el.appendChild(line);

        const rot = document.createElement('div');
        rot.className = 'se-rot-handle';
        rot.onmousedown = (e) => {
            e.stopPropagation();
            this.startInteraction('rotate', e);
        };
        el.appendChild(rot);
    }

    selectItem(id) {
        this.selectedItemId = id;
        this.render();
        this.toolbar.classList.add('visible');
        this.renderToolbarContent();
    }

    renderToolbarContent() {
        const container = document.getElementById('se-toolbar-content');
        container.innerHTML = '';
        const item = this.selectedItemId ? this.getItemById(this.selectedItemId) : null;

        if (this.activeTab === 'pos') {
            if (item) {
                // Propriedades do Elemento
                container.innerHTML = `
                    <div class="section-title">${this.i18n.t('geo_elem')}</div>
                    <div class="pc-row">
                        <div class="pc-form-group"><label>X</label><input type="number" class="pc-input" value="${Math.round(item.box.x)}" data-prop="box.x"></div>
                        <div class="pc-form-group"><label>Y</label><input type="number" class="pc-input" value="${Math.round(item.box.y)}" data-prop="box.y"></div>
                    </div>
                    <div class="pc-row">
                        <div class="pc-form-group"><label>${this.i18n.t('width')}</label><input type="number" class="pc-input" value="${Math.round(item.box.w)}" data-prop="box.w"></div>
                        <div class="pc-form-group"><label>${this.i18n.t('height')}</label><input type="number" class="pc-input" value="${Math.round(item.box.h)}" data-prop="box.h"></div>
                    </div>
                    <div class="pc-row">
                        <div class="pc-form-group"><label>${this.i18n.t('rotation')}</label><input type="number" class="pc-input" value="${Math.round(item.box.rot || 0)}" data-prop="box.rot"></div>
                        <div class="pc-form-group"><label>${this.i18n.t('layer_z')}</label><input type="number" class="pc-input" value="${item.box.z || 1}" data-prop="box.z"></div>
                    </div>
                    
                    <div class="pc-form-group">
                        <label>${this.i18n.t('link_action')}</label>
                        <input type="text" class="pc-input" value="${item.link?.url || ''}" data-prop="link.url" placeholder="#slide_id ou https://...">
                        <div style="font-size:10px; color:#666; margin-top:2px;">${this.i18n.t('link_help')}</div>
                    </div>
                `;
            } else {
                // Propriedades do Slide
                container.innerHTML = `
                    <div class="section-title">${this.i18n.t('prop_slide')}</div>
                    <div class="pc-form-group">
                        <label>${this.i18n.t('slide_id')}</label>
                        <input type="text" class="pc-input" value="${this.config.id}" data-slide-prop="id" placeholder="${this.i18n.t('slide_id_help')}">
                    </div>
                    <div class="pc-row">
                        <div class="pc-form-group"><label>${this.i18n.t('width')}</label><input type="number" class="pc-input" value="${this.config.width}" data-slide-prop="width"></div>
                        <div class="pc-form-group"><label>${this.i18n.t('height')}</label><input type="number" class="pc-input" value="${this.config.height}" data-slide-prop="height"></div>
                    </div>
                    <div style="font-size:11px; color:#666; margin-top:5px; padding:8px; background:#f8f9fa; border-radius:4px;">
                        <strong>Nota:</strong> ${this.i18n.t('slide_note')}
                    </div>
                `;
            }
        } else if (this.activeTab === 'style') {
            if (item) {
                this.renderStyleTab(container, item);
            } else {
                // Estilo do Slide (Background)
                container.innerHTML = `
                    <div class="section-title">${this.i18n.t('slide_bg')}</div>
                    <div class="pc-form-group"><label>${this.i18n.t('bg_color')}</label><input type="color" class="pc-input" style="height:34px" value="${this.config.background.type === 'color' ? this.config.background.value : '#ffffff'}" data-slide-prop="bg-color"></div>
                    
                    <div class="pc-form-group"><label>${this.i18n.t('bg_opacity')}</label>
                        <div style="display:flex; align-items:center;">
                            <input type="range" min="0" max="1" step="0.1" style="flex:1" value="${this.config.background.opacity !== undefined ? this.config.background.opacity : 1}" data-slide-prop="bg-opacity">
                            <span style="width:30px; text-align:right; font-size:12px;">${this.config.background.opacity !== undefined ? this.config.background.opacity : 1}</span>
                        </div>
                    </div>

                    ${this.generateImageInputHelper(this.i18n.t('bg_image'), this.config.background.type === 'image' ? this.config.background.value : '', 'bg-image')}
                `;
            }
        } else if (this.activeTab === 'anim') {
            if (item) {
                this.renderAnimationTab(container, item);
            } else {
                // Transição do Slide
                const slideTrans = this.config.transition || { enter: 'slide-fade', exit: 'slide-fade', duration: 0.8, delay: 0, easing: 'ease-in-out' };

                const transOptions = TRANSITIONS.map(t =>
                    `<option value="${t.name}" ${slideTrans.enter === t.name ? 'selected' : ''}>${t.label}</option>`
                ).join('');

                const exitOptions = TRANSITIONS.map(t =>
                    `<option value="${t.name}" ${slideTrans.exit === t.name ? 'selected' : ''}>${t.label}</option>`
                ).join('');

                const easingOptions = EASINGS.map(e =>
                    `<option value="${e.val}" ${slideTrans.easing === e.val ? 'selected' : ''}>${e.label}</option>`
                ).join('');

                container.innerHTML = `
                    <div class="section-title">${this.i18n.t('trans_slide')}</div>
                    <div class="pc-form-group">
                        <label>${this.i18n.t('trans_enter')}</label>
                        <select class="pc-input" data-slide-prop="trans-enter">${transOptions}</select>
                    </div>
                    <div class="pc-form-group">
                        <label>${this.i18n.t('trans_exit')}</label>
                        <select class="pc-input" data-slide-prop="trans-exit">${exitOptions}</select>
                    </div>
                    
                    <div class="pc-row">
                        <div class="pc-form-group"><label>${this.i18n.t('duration')}</label><input type="number" step="0.1" min="0.1" class="pc-input" value="${slideTrans.duration || 0.8}" data-slide-prop="trans-duration"></div>
                        <div class="pc-form-group"><label>${this.i18n.t('delay')}</label><input type="number" step="0.1" min="0" class="pc-input" value="${slideTrans.delay || 0}" data-slide-prop="trans-delay"></div>
                    </div>
                     <div class="pc-form-group">
                        <label>${this.i18n.t('easing')}</label>
                        <select class="pc-input" data-slide-prop="trans-easing">${easingOptions}</select>
                    </div>
                    <div style="font-size:11px; color:#666; margin-top:5px; padding:8px; background:#f8f9fa; border-radius:4px;">
                        <strong>Nota:</strong> ${this.i18n.t('trans_note')}
                    </div>
                `;
            }
        }

        if (item) {
            this.bindItemInputs(container);
        } else {
            this.bindSlideInputs(container);
        }
    }

    renderStyleTab(container, item) {
        let specificContent = '';

        if (item.type === 'text') {
            specificContent = `
                <div class="pc-form-group"><label>${this.i18n.t('text_content')}</label><textarea class="pc-input" rows="3" data-prop="content.value">${item.content.value}</textarea></div>
                <div class="pc-form-group"><label>${this.i18n.t('style_tab')}</label></div>
                <div class="pc-icon-btn-group" style="margin-top:-8px">
                    <button class="pc-icon-btn ${item.content.fontWeight === 'bold' ? 'active' : ''}" title="Negrito" onclick="editor.updateItemData('${item.id}', 'content.fontWeight', '${item.content.fontWeight === 'bold' ? 'normal' : 'bold'}')">
                        ${ICONS.BOLD}
                    </button>
                    <button class="pc-icon-btn ${item.content.fontStyle === 'italic' ? 'active' : ''}" title="Itálico" onclick="editor.updateItemData('${item.id}', 'content.fontStyle', '${item.content.fontStyle === 'italic' ? 'normal' : 'italic'}')">
                        ${ICONS.ITALIC}
                    </button>
                    <button class="pc-icon-btn ${item.content.textDecoration && item.content.textDecoration.includes('underline') ? 'active' : ''}" title="Sublinhado" onclick="editor.toggleTextDecoration('${item.id}', 'underline')">
                        ${ICONS.UNDERLINE}
                    </button>
                     <button class="pc-icon-btn ${item.content.textDecoration && item.content.textDecoration.includes('line-through') ? 'active' : ''}" title="Tachado" onclick="editor.toggleTextDecoration('${item.id}', 'line-through')">
                        ${ICONS.STRIKETHROUGH}
                    </button>
                </div>
                <div class="pc-form-group"><label>${this.i18n.t('font_family')}</label>
                    <select class="pc-input" data-prop="content.fontFamily">
                        ${this.fontManager.generateSelectOptions(item.content.fontFamily)}
                    </select>
                </div>
                <div class="pc-form-group"><label>${this.i18n.t('text_align')}</label></div>
                <div class="pc-icon-btn-group" style="margin-top:-8px">
                     <button class="pc-icon-btn ${(!item.content.textAlign || item.content.textAlign === 'left') ? 'active' : ''}" title="Esquerda" onclick="editor.updateItemData('${item.id}', 'content.textAlign', 'left')">
                        ${ICONS.ALIGN_LEFT}
                    </button>
                    <button class="pc-icon-btn ${item.content.textAlign === 'center' ? 'active' : ''}" title="Centro" onclick="editor.updateItemData('${item.id}', 'content.textAlign', 'center')">
                        ${ICONS.ALIGN_CENTER}
                    </button>
                    <button class="pc-icon-btn ${item.content.textAlign === 'right' ? 'active' : ''}" title="Direita" onclick="editor.updateItemData('${item.id}', 'content.textAlign', 'right')">
                        ${ICONS.ALIGN_RIGHT}
                    </button>
                     <button class="pc-icon-btn ${item.content.textAlign === 'justify' ? 'active' : ''}" title="Justificado" onclick="editor.updateItemData('${item.id}', 'content.textAlign', 'justify')">
                        ${ICONS.ALIGN_JUSTIFY}
                    </button>
                </div>
                <div class="pc-row">
                    <div class="pc-form-group"><label>${this.i18n.t('font_size')}</label><input type="number" class="pc-input" value="${item.content.fontSize || 16}" data-prop="content.fontSize"></div>
                    <div class="pc-form-group"><label>${this.i18n.t('text_color')}</label><input type="color" class="pc-input" style="height:34px" value="${item.style?.color || '#000000'}" data-prop="style.color"></div>
                </div>
            `;
        } else if (item.type === 'image') {
            const clipShapeOpts = CLIP_SHAPES.map(s => `<option value="${s.val}" ${item.content.clipShape === s.val ? 'selected' : ''}>${s.label}</option>`).join('');

            specificContent = `
                ${this.generateImageInputHelper('URL da Imagem', item.content.value, 'content.value')}
                <div class="pc-form-group"><label>Forma de Recorte</label>
                    <select class="pc-input" data-prop="content.clipShape">${clipShapeOpts}</select>
                </div>
                <div class="pc-form-group"><label>Cor de Fundo (Placeholder)</label>
                    <input type="color" class="pc-input" style="height:34px" value="${item.style?.backgroundColor || '#cccccc'}" data-prop="style.backgroundColor">
                </div>
            `;
        } else if (item.type === 'shape') {
            specificContent = `<div class="pc-form-group"><label>Cor</label><input type="color" class="pc-input" style="height:34px" value="${item.style?.color || '#333333'}" data-prop="style.color"></div>`;
        }

        // Static Effects Section
        const staticOpts = STATIC_EFFECTS.map(s =>
            `<option value="${s.val}" ${item.style?.effect === s.val ? 'selected' : ''}>${s.label}</option>`
        ).join('');

        container.innerHTML = specificContent + `
            <div style="border-top:1px solid #ddd; margin: 10px 0;"></div>
            
            <div class="section-title">Efeito Estático</div>
            <div class="pc-form-group">
                <select class="pc-input" data-prop="style.effect">${staticOpts}</select>
            </div>
            
            <div class="pc-row">
                <div class="pc-form-group"><label>Borda (px)</label><input type="number" class="pc-input" value="${item.style?.borderWidth || 0}" data-prop="style.borderWidth"></div>
                <div class="pc-form-group"><label>Cor Borda</label><input type="color" class="pc-input" style="height:34px" value="${item.style?.borderColor || '#000000'}" data-prop="style.borderColor"></div>
            </div>
            <div class="pc-form-group"><label>Opacidade</label>
                <div style="display:flex; align-items:center;">
                    <input type="range" min="0" max="1" step="0.1" style="flex:1" value="${item.style?.opacity !== undefined ? item.style.opacity : 1}" data-prop="style.opacity">
                    <span style="width:30px; text-align:right; font-size:12px;">${item.style?.opacity !== undefined ? item.style.opacity : 1}</span>
                </div>
            </div>
        `;
    }

    renderAnimationTab(container, item) {
        if (!this.animSubTab) this.animSubTab = 'enter';

        const tabs = [
            { id: 'enter', label: 'Entrada' },
            { id: 'exit', label: 'Saída' },
            { id: 'loop', label: 'Loop' },
            { id: 'hover', label: 'Hover' }
        ];

        const tabNav = tabs.map(t =>
            `<span class="pc-subtab-item ${this.animSubTab === t.id ? 'active' : ''}" data-subtab="${t.id}">${t.label}</span>`
        ).join('');

        container.innerHTML = `
            <div style="display: flex; gap: 10px; border-bottom: 1px solid #ddd; margin-bottom: 15px; padding-bottom: 5px;">
                ${tabNav}
            </div>
        `;

        const getTimingOpts = (sel) => TIMING_OPTIONS.map(t => `<option value="${t.val}" ${sel === t.val ? 'selected' : ''}>${t.label}</option>`).join('');

        let subContent = '';

        if (this.animSubTab === 'enter') {
            const optionsEnter = ANIMATIONS_ENTER.map(a => `<option value="${a.name}" ${item.animation?.enter?.type === a.name ? 'selected' : ''}>${a.label}</option>`).join('');
            subContent = `
                <div class="pc-form-group"><label>Animação de Entrada</label>
                    <select class="pc-input" data-prop="animation.enter.type">${optionsEnter}</select>
                </div>
                <div class="pc-row">
                    <div class="pc-form-group"><label>Duração (s)</label><input type="number" step="0.1" min="0.1" class="pc-input" value="${item.animation?.enter?.duration || 1.0}" data-prop="animation.enter.duration"></div>
                    <div class="pc-form-group"><label>Delay (s)</label><input type="number" step="0.1" min="0" class="pc-input" value="${item.animation?.enter?.delay || 0}" data-prop="animation.enter.delay"></div>
                </div>
            `;
        } else if (this.animSubTab === 'exit') {
            const optionsExit = ANIMATIONS_EXIT.map(a => `<option value="${a.name}" ${item.animation?.exit?.type === a.name ? 'selected' : ''}>${a.label}</option>`).join('');
            subContent = `
                <div class="pc-form-group"><label>Animação de Saída</label>
                    <select class="pc-input" data-prop="animation.exit.type">${optionsExit}</select>
                </div>
                <div class="pc-row">
                    <div class="pc-form-group"><label>Duração (s)</label><input type="number" step="0.1" min="0.1" class="pc-input" value="${item.animation?.exit?.duration || 1.0}" data-prop="animation.exit.duration"></div>
                    <div class="pc-form-group"><label>Delay (s)</label><input type="number" step="0.1" min="0" class="pc-input" value="${item.animation?.exit?.delay || 0}" data-prop="animation.exit.delay"></div>
                </div>
            `;
        } else if (this.animSubTab === 'loop') {
            subContent = this.renderLoopOptions(item, 'loop');
        } else if (this.animSubTab === 'hover') {
            subContent = this.renderLoopOptions(item, 'hover');
        }

        container.innerHTML += subContent;

        container.querySelectorAll('.pc-subtab-item').forEach(tab => {
            tab.onclick = () => {
                this.animSubTab = tab.dataset.subtab;
                this.renderToolbarContent();
            };
        });
    }

    renderLoopOptions(item, type) {
        const prefix = type === 'hover' ? 'hover' : 'loop';
        const title = type === 'hover' ? 'Loop (Ao Passar Mouse)' : 'Loop (Sempre Ativo)';
        const color = type === 'hover' ? '#ea580c' : '#d946ef';

        const optsGeo = GEO_OPTIONS.map(a => `<option value="${a.name}" ${item.animation?.[type]?.geo?.type === a.name ? 'selected' : ''}>${a.label}</option>`).join('');
        const optsVis = VIS_OPTIONS.map(a => `<option value="${a.name}" ${item.animation?.[type]?.vis?.type === a.name ? 'selected' : ''}>${a.label}</option>`).join('');
        const timingOpts = (sel) => TIMING_OPTIONS.map(t => `<option value="${t.val}" ${sel === t.val ? 'selected' : ''}>${t.label}</option>`).join('');

        return `
            <div class="pc-form-group"><label style="font-weight:bold; color:${color};">${title}</label></div>
            
            <div class="pc-form-group"><label>Geométrica</label><select class="pc-input" data-prop="animation.${type}.geo.type">${optsGeo}</select></div>
            <div class="pc-row">
                <div class="pc-form-group"><label>Duração (s)</label><input type="number" step="0.1" min="0.1" class="pc-input" value="${item.animation?.[type]?.geo?.duration || 2.0}" data-prop="animation.${type}.geo.duration"></div>
                <div class="pc-form-group"><label>Curva</label><select class="pc-input" data-prop="animation.${type}.geo.timing">${timingOpts(item.animation?.[type]?.geo?.timing || 'linear')}</select></div>
            </div>

            <div class="pc-form-group"><label>Visual</label><select class="pc-input" data-prop="animation.${type}.vis.type">${optsVis}</select></div>
            <div class="pc-row">
                <div class="pc-form-group"><label>Duração (s)</label><input type="number" step="0.1" min="0.1" class="pc-input" value="${item.animation?.[type]?.vis?.duration || 2.0}" data-prop="animation.${type}.vis.duration"></div>
                <div class="pc-form-group"><label>Curva</label><select class="pc-input" data-prop="animation.${type}.vis.timing">${timingOpts(item.animation?.[type]?.vis?.timing || 'linear')}</select></div>
            </div>
        `;
    }

    bindSlideInputs(container) {
        container.querySelectorAll('input, select').forEach(input => {
            const update = (e) => { // Consolidated update function
                const prop = input.dataset.slideProp;
                const val = e.target.value;
                if (prop === 'width') this.config.width = parseInt(val) || 800;
                if (prop === 'height') this.config.height = parseInt(val) || 600;
                if (prop === 'id') this.config.id = val; // Add ID update
                if (prop === 'bg-color') {
                    if (this.config.background.type !== 'color') this.config.background = { type: 'color', value: val, opacity: 1 };
                    else this.config.background.value = val;
                }
                if (prop === 'bg-opacity') {
                    this.config.background.opacity = parseFloat(val);
                }
                if (prop === 'bg-image') {
                    if (val.length > 0) this.config.background = { type: 'image', value: val };
                    else this.config.background = { type: 'color', value: '#ffffff', opacity: 1 };
                }

                // Transition Updates
                if (['trans-enter', 'trans-exit', 'trans-duration', 'trans-delay', 'trans-easing'].includes(prop)) {
                    if (!this.config.transition) {
                        this.config.transition = { enter: 'slide-fade', exit: 'slide-fade', duration: 0.8, delay: 0, easing: 'ease-in-out' };
                    }
                    if (prop === 'trans-enter') this.config.transition.enter = val;
                    if (prop === 'trans-exit') this.config.transition.exit = val;
                    if (prop === 'trans-duration') this.config.transition.duration = parseFloat(val);
                    if (prop === 'trans-delay') this.config.transition.delay = parseFloat(val);
                    if (prop === 'trans-easing') this.config.transition.easing = val;
                }

                if (!['trans-enter', 'trans-exit', 'trans-duration', 'trans-delay', 'trans-easing'].includes(prop)) {
                    this.render(); // Only re-render for visual properties, not transition settings
                }
                this.notifyChange();
            };

            if (input.dataset.slideProp === 'id') {
                input.onchange = update; // Only trigger on blur/enter for ID (updates list)
            } else {
                input.oninput = update;
                input.onchange = update;
            }
        });
    }

    bindItemInputs(container) {
        container.querySelectorAll('input, select, textarea').forEach(input => {
            if (input.dataset.prop) {
                input.oninput = (e) => {
                    this.updateItemData(this.selectedItemId, input.dataset.prop, e.target.value);
                };
            }
        });
    }

    updateItemData(id, propPath, value) {
        const item = this.getItemById(id);
        if (!item) return;

        // Recursive set for deep properties (e.g., animation.enter.type, box.w)
        const setDeep = (obj, path, val) => {
            const keys = path.split('.');
            const last = keys.pop();
            let target = obj;
            keys.forEach(key => {
                if (!target[key]) target[key] = {};
                target = target[key];
            });
            target[last] = val;
        };

        const floats = ['fontSize', 'duration', 'delay', 'opacity', 'borderWidth', 'rot', 'x', 'y', 'w', 'h', 'z'];
        // Check if the property name (end of path) implies a float value
        const lastPart = propPath.split('.').pop();
        const finalValue = floats.includes(lastPart) || lastPart.toLowerCase().includes('duration') ? parseFloat(value) : value;

        setDeep(item, propPath, finalValue);
        this.render();
    }

    toggleTextDecoration(id, value) {
        const item = this.getItemById(id);
        if (!item) return;

        let current = item.content.textDecoration || '';
        let parts = current.split(' ').filter(p => p);

        if (parts.includes(value)) {
            parts = parts.filter(p => p !== value);
        } else {
            parts.push(value);
        }

        item.content.textDecoration = parts.join(' ');
        this.render();
    }

    generateImageInputHelper(label, value, dataProp) {
        return `
            <div class="pc-form-group">
                <label>${label}</label>
                <input type="text" class="pc-input" style="width:100%" value="${value}" data-prop="${dataProp}" placeholder="https://...">
            </div>
        `;
    }

    startInteraction(type, e) {
        this.interaction.isDragging = (type === 'drag');
        this.interaction.isResizing = (type === 'resize');
        this.interaction.isRotating = (type === 'rotate');
        this.interaction.startX = e.clientX;
        this.interaction.startY = e.clientY;
        const item = this.getItemById(this.selectedItemId);
        this.interaction.initialProps = JSON.parse(JSON.stringify(item.box));
    }

    attachGlobalEvents() {
        if (this.eventsAttached) return;
        this.eventsAttached = true;

        window.addEventListener('mousemove', (e) => {
            if (!this.selectedItemId) return;
            // Only proceed if dragging/resizing/rotating
            if (!this.interaction.isDragging &&
                !this.interaction.isResizing &&
                !this.interaction.isRotating) return;

            // Request Animation Frame for performance
            requestAnimationFrame(() => {
                const scale = (this.viewer && this.viewer.scale) ? this.viewer.scale : 1;
                const dx = (e.clientX - this.interaction.startX) / scale;
                const dy = (e.clientY - this.interaction.startY) / scale;
                const item = this.getItemById(this.selectedItemId);
                if (!item) return;

                const init = this.interaction.initialProps;

                // Update Data Model
                if (this.interaction.isDragging) {
                    item.box.x = init.x + dx;
                    item.box.y = init.y + dy;
                } else if (this.interaction.isResizing) {
                    const h = this.interaction.activeHandle;
                    if (h.includes('e')) item.box.w = Math.max(10, init.w + dx);
                    if (h.includes('s')) item.box.h = Math.max(10, init.h + dy);
                    if (h.includes('w')) {
                        item.box.w = Math.max(10, init.w - dx);
                        item.box.x = init.x + (init.w - item.box.w);
                    }
                    if (h.includes('n')) {
                        item.box.h = Math.max(10, init.h - dy);
                        item.box.y = init.y + (init.h - item.box.h);
                    }
                } else if (this.interaction.isRotating) {
                    const overlayItem = document.getElementById('ov_' + this.selectedItemId);
                    if (overlayItem) {
                        const rect = overlayItem.getBoundingClientRect();
                        const cx = rect.left + rect.width / 2;
                        const cy = rect.top + rect.height / 2;
                        const radians = Math.atan2(e.clientX - cx, -(e.clientY - cy));
                        item.box.rot = radians * (180 / Math.PI);
                    }
                }

                // DIRECT DOM UPDATE (No full re-render)
                const overlayEl = document.getElementById('ov_' + this.selectedItemId);
                const viewerEl = document.getElementById('sv_' + this.selectedItemId);
                if (overlayEl) {
                    overlayEl.style.left = item.box.x + 'px';
                    overlayEl.style.top = item.box.y + 'px';
                    overlayEl.style.width = item.box.w + 'px';
                    overlayEl.style.height = item.box.h + 'px';
                    overlayEl.style.transform = `rotate(${item.box.rot}deg)`;
                }
                if (viewerEl) {
                    viewerEl.style.left = item.box.x + 'px';
                    viewerEl.style.top = item.box.y + 'px';
                    viewerEl.style.width = item.box.w + 'px';
                    viewerEl.style.height = item.box.h + 'px';
                    if (item.box.rot) {
                        viewerEl.style.transform = `rotate(${item.box.rot}deg)`;
                    } else {
                        viewerEl.style.removeProperty('transform');
                    }
                }
            });
        });

        window.addEventListener('mouseup', () => {
            if (this.interaction.isDragging || this.interaction.isResizing || this.interaction.isRotating) {
                this.interaction.isDragging = false;
                this.interaction.isResizing = false;
                this.interaction.isRotating = false;

                // Finalize: re-render UI to ensure sync and update properties panel
                this.render();
                this.notifyChange();

                if (this.activeTab === 'pos') this.renderToolbarContent();
            }
        });

        window.addEventListener('resize', () => {
            // Debounce resize
            if (this.resizeTimeout) clearTimeout(this.resizeTimeout);
            this.resizeTimeout = setTimeout(() => {
                if (this.viewer) this.viewer.fitToContainer();
                this.render();
            }, 100);
        });
    }

    makeElementDraggable(el, handle) {
        let isDown = false, startX, startY, initLeft, initTop;
        handle.onmousedown = (e) => {
            isDown = true;
            startX = e.clientX;
            startY = e.clientY;
            const rect = el.getBoundingClientRect();
            initLeft = rect.left;
            initTop = rect.top;
        };
        window.addEventListener('mousemove', (e) => {
            if (!isDown) return;
            const dx = e.clientX - startX;
            const dy = e.clientY - startY;
            el.style.top = (initTop + dy) + 'px';
            el.style.right = 'auto';
            el.style.left = (initLeft + dx) + 'px';
        });
        window.addEventListener('mouseup', () => isDown = false);
    }

    addItem(type, extras = {}) {
        const newItem = {
            id: 'item_' + Date.now(),
            type: type,
            box: { x: 100, y: 100, w: 200, h: type === 'text' ? 50 : 200, z: 1, rot: 0 },
            content: {
                value: type === 'text' ? 'Novo Texto' : '',
                ...extras
            },
            style: {},
            animation: {
                enter: { type: 'none', duration: 1.0, delay: 0 },
                exit: { type: 'none', duration: 1.0, delay: 0 },
                loop: { geo: { type: 'none' }, vis: { type: 'none' } },
                hover: { geo: { type: 'none' }, vis: { type: 'none' } }
            },
            link: { url: '' }
        };
        this.config.items.push(newItem);
        this.selectItem(newItem.id);
    }

    deleteItem() {
        if (!this.selectedItemId) return;
        this.config.items = this.config.items.filter(i => i.id !== this.selectedItemId);
        this.selectItem(null);
    }

    showJSON() {
        this.showModal('JSON', JSON.stringify(this.config, null, 2));
    }

    showModal(title, content) {
        const modal = document.createElement('div');
        modal.className = 'se-modal';
        modal.innerHTML = `
            <div class="se-modal-content">
                <h3>${title}</h3>
                <textarea readonly>${content}</textarea>
                <div style="text-align:right">
                    <button class="pc-btn pc-btn-primary" onclick="this.closest('.se-modal').remove()">Fechar</button>
                </div>
            </div>
        `;
        this.wrapper.appendChild(modal);
    }

    getItemById(id) { return this.config.items.find(i => i.id === id); }

    testShow() {
        // Prepara elementos para entrada antes de mostrar
        this.viewer.prepareForEntry();
        this.viewer.show();
    }
    testHide() { this.viewer.hide(); }
}
