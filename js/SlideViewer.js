/**
 * SlideViewer
 * Responsible for rendering the slide and handling animations (Enter/Exit).
 * Enhanced with 25+ visual effects, 25+ geometric effects, 25+ static effects,
 * and 20 slide transitions.
 */
export class SlideViewer {
    constructor(container, config) {
        this.container = container;
        this.config = config;
        this.slideEl = null;
        this.scale = 1;
        this.timeouts = [];
        this.transitionOverlay = null;
    }

    render() {
        this.container.innerHTML = '';
        this.container.style.overflow = 'hidden';
        this.container.style.position = 'relative';

        this.renderNormalMode();

        // Styles
        if (!document.getElementById('sv-styles')) {
            const style = document.createElement('style');
            style.id = 'sv-styles';
            style.textContent = this.getAnimationCSS();
            document.head.appendChild(style);
        }
    }

    renderNormalMode() {
        this.slideEl = document.createElement('div');
        this.slideEl.className = 'sv-slide';
        this.slideEl.style.width = this.config.width + 'px';
        this.slideEl.style.height = this.config.height + 'px';
        this.slideEl.style.position = 'absolute';
        this.slideEl.style.transformOrigin = 'top left';
        this.slideEl.style.boxShadow = '0 0 20px rgba(0,0,0,0.1)';
        this.slideEl.style.overflow = 'hidden';

        // Background
        this.applyBackground(this.slideEl);

        // Items
        this.config.items.forEach(item => {
            const el = this.createItemDOM(item);
            this.slideEl.appendChild(el);
        });

        this.container.appendChild(this.slideEl);
        this.fitToContainer();

        if (!this.resizeListener) {
            this.resizeListener = () => this.fitToContainer();
            window.addEventListener('resize', this.resizeListener);
        }
    }

    applyBackground(element) {
        if (this.config.background.type === 'color') {
            const opacity = (this.config.background.opacity !== undefined) ? this.config.background.opacity : 1;
            element.style.backgroundColor = this.hexToRgba(this.config.background.value, opacity);
        } else if (this.config.background.type === 'image') {
            element.style.backgroundImage = `url(${this.config.background.value})`;
            element.style.backgroundSize = 'cover';
            element.style.backgroundPosition = 'center';
        }
    }

    hexToRgba(hex, alpha) {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }

    fitToContainer() {
        if (!this.slideEl || !this.container) return;

        const cw = this.container.clientWidth;
        const ch = this.container.clientHeight;
        const sw = this.config.width;
        const sh = this.config.height;

        if (cw === 0 || ch === 0) return;

        const scale = Math.min(cw / sw, ch / sh);
        this.scale = scale;

        // Sempre centraliza o slide no container
        const x = (cw - sw * scale) / 2;
        const y = (ch - sh * scale) / 2;

        this.slideEl.style.left = x + 'px';
        this.slideEl.style.top = y + 'px';
        this.slideEl.style.transform = `scale(${scale})`;
    }

    createItemDOM(item) {
        const el = document.createElement('div');
        el.id = 'sv_' + item.id;
        el.className = 'sv-item';
        // NEW SCHEMA: properties moved to item.box
        el.style.left = item.box.x + 'px';
        el.style.top = item.box.y + 'px';
        el.style.width = item.box.w + 'px';
        el.style.height = item.box.h + 'px';
        el.style.zIndex = item.box.z || 1;
        el.style.position = 'absolute';

        if (item.box.rot) {
            el.style.transform = `rotate(${item.box.rot}deg)`;
        }

        // Animation Wrapper
        const animWrapper = document.createElement('div');
        animWrapper.className = 'sv-anim-wrapper';
        animWrapper.style.width = '100%';
        animWrapper.style.height = '100%';
        animWrapper.style.opacity = '1';

        // Loop Wrappers
        const loopGeo = document.createElement('div');
        loopGeo.className = 'sv-loop-geo';
        loopGeo.style.width = '100%';
        loopGeo.style.height = '100%';

        const loopVis = document.createElement('div');
        loopVis.className = 'sv-loop-vis';
        loopVis.style.width = '100%';
        loopVis.style.height = '100%';

        // Content Wrapper
        const content = document.createElement('div');
        content.className = 'sv-item-content';
        content.style.width = '100%';
        content.style.height = '100%';

        // NEW SCHEMA: Static Effect in item.style.effect
        this.applyStaticEffects(content, item.style?.effect);

        // NEW SCHEMA: Opacity in item.style.opacity
        if (item.style?.opacity !== undefined) {
            content.style.opacity = item.style.opacity;
        }

        // NEW SCHEMA: Border in item.style
        if (item.style?.borderWidth) {
            content.style.borderWidth = item.style.borderWidth + 'px';
            content.style.borderStyle = 'solid';
            content.style.borderColor = item.style.borderColor || 'transparent';
        }

        // Item Type Specific
        if (item.type === 'text') {
            // NEW SCHEMA: content properties
            content.innerHTML = item.content.value;
            content.style.fontSize = (item.content.fontSize || 24) + 'px';
            // NEW SCHEMA: color in item.style based on migration
            content.style.color = item.style?.color || '#000';
            content.style.fontFamily = item.content.fontFamily || 'Arial';
            content.style.textAlign = item.content.textAlign || 'left';
            content.style.fontWeight = item.content.fontWeight || 'normal';
            content.style.fontStyle = item.content.fontStyle || 'normal';
            content.style.textDecoration = item.content.textDecoration || 'none';
        } else if (item.type === 'image') {
            const clipShape = item.content.clipShape || 'none';
            const bgColor = item.style?.backgroundColor || '#cccccc';

            const clipPaths = {
                'none': 'none',
                'circle': 'circle(50% at 50% 50%)',
                'ellipse': 'ellipse(50% 40% at 50% 50%)',
                'triangle': 'polygon(50% 0%, 0% 100%, 100% 100%)',
                'triangle-inv': 'polygon(50% 100%, 0% 0%, 100% 0%)',
                'rhombus': 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)',
                'star': 'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)',
                'pentagon': 'polygon(50% 0%, 100% 38%, 82% 100%, 18% 100%, 0% 38%)',
                'hexagon': 'polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)',
                'octagon': 'polygon(30% 0%, 70% 0%, 100% 30%, 100% 70%, 70% 100%, 30% 100%, 0% 70%, 0% 30%)',
                'heart': 'polygon(50% 80%, 100% 20%, 80% 0%, 50% 35%, 20% 0%, 0% 20%)',
                'arrow-right': 'polygon(0% 20%, 60% 20%, 60% 0%, 100% 50%, 60% 100%, 60% 80%, 0% 80%)',
                'arrow-left': 'polygon(40% 20%, 100% 20%, 100% 80%, 40% 80%, 40% 100%, 0% 50%, 40% 0%)',
                'cross': 'polygon(20% 0%, 0% 20%, 30% 50%, 0% 80%, 20% 100%, 50% 70%, 80% 100%, 100% 80%, 70% 50%, 100% 20%, 80% 0%, 50% 30%)',
                'message': 'polygon(0% 0%, 100% 0%, 100% 75%, 75% 75%, 75% 100%, 50% 75%, 0% 75%)',
                'diamond': 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)',
                'trapezoid': 'polygon(20% 0%, 80% 0%, 100% 100%, 0% 100%)',
                'parallelogram': 'polygon(25% 0%, 100% 0%, 75% 100%, 0% 100%)',
                'badge': 'polygon(50% 0%, 80% 10%, 100% 35%, 100% 70%, 80% 90%, 50% 100%, 20% 90%, 0% 70%, 0% 35%, 20% 10%)',
                'burst': 'polygon(50% 0%, 60% 30%, 90% 20%, 70% 50%, 100% 60%, 70% 70%, 80% 100%, 50% 80%, 20% 100%, 30% 70%, 0% 60%, 30% 50%, 10% 20%, 40% 30%)'
            };

            const selectedClip = clipPaths[clipShape] || 'none';

            if (item.content.value && item.content.value.trim() !== '') {
                const img = document.createElement('img');
                img.src = item.content.value;
                img.style.width = '100%';
                img.style.height = '100%';
                img.style.objectFit = 'cover';
                img.style.clipPath = selectedClip;
                img.style.webkitClipPath = selectedClip;
                content.appendChild(img);
            } else {
                const div = document.createElement('div');
                div.style.width = '100%';
                div.style.height = '100%';
                div.style.backgroundColor = bgColor;
                div.style.clipPath = selectedClip;
                div.style.webkitClipPath = selectedClip;
                content.appendChild(div);
                content.style.clipPath = selectedClip;
                content.style.webkitClipPath = selectedClip;
            }
        } else if (item.type === 'shape') {
            content.style.backgroundColor = item.style?.color || '#ccc';
            if (item.content.shapeType === 'circle') {
                content.style.borderRadius = '50%';
                loopVis.style.borderRadius = '50%';
                loopGeo.style.borderRadius = '50%';
                animWrapper.style.borderRadius = '50%';
            }
        }

        // Hierarchy Build
        loopVis.appendChild(content);
        loopGeo.appendChild(loopVis);
        animWrapper.appendChild(loopGeo);
        el.appendChild(animWrapper);

        // Loops
        this.updateLoopAnimations(el, item);

        // Link Handling
        // NEW SCHEMA: link in item.link.url
        if (item.link?.url) {
            el.style.cursor = 'pointer';
            el.onclick = (e) => {
                e.stopPropagation();
                // Custom event to be caught by SlidePresentation
                const event = new CustomEvent('slide-link-click', { detail: { link: item.link.url } });
                window.dispatchEvent(event);
            };
        }

        // Hover Events
        el.addEventListener('mouseenter', () => this.handleHover(el, item, true));
        el.addEventListener('mouseleave', () => this.handleHover(el, item, false));

        return el;
    }

    applyStaticEffects(element, effectName) {
        if (!effectName || effectName === 'none') return;

        const effects = {
            'stat-shadow-soft': 'filter: drop-shadow(0 4px 6px rgba(0,0,0,0.1));',
            'stat-shadow-hard': 'filter: drop-shadow(4px 4px 0px rgba(0,0,0,0.3));',
            'stat-shadow-long': 'filter: drop-shadow(0 15px 25px rgba(0,0,0,0.3));',
            'stat-shadow-inner': 'box-shadow: inset 0 4px 15px rgba(0,0,0,0.2);',
            'stat-shadow-neon': 'filter: drop-shadow(0 0 10px rgba(0,219,222,0.8)) drop-shadow(0 0 20px rgba(252,0,255,0.6));',
            'stat-glow-soft': 'filter: drop-shadow(0 0 15px rgba(255,255,255,0.5));',
            'stat-glow-intense': 'filter: drop-shadow(0 0 30px rgba(255,255,255,0.9));',
            'stat-glow-rainbow': 'filter: drop-shadow(0 0 10px #ff0080) drop-shadow(0 0 20px #00ff88) drop-shadow(0 0 30px #00c8ff);',
            'stat-border-glow': 'box-shadow: 0 0 10px currentColor, inset 0 0 10px currentColor;',
            'stat-border-dashed': 'border-style: dashed !important;',
            'stat-border-dotted': 'border-style: dotted !important;',
            'stat-border-double': 'border-style: double !important; border-width: 4px !important;',
            'stat-border-gradient': 'border-image: linear-gradient(45deg, #ff0080, #00ff88, #00c8ff) 1;',
            'stat-border-neon': 'box-shadow: 0 0 5px #00dbde, 0 0 10px #00dbde, inset 0 0 5px #00dbde;',
            'stat-reflection': '-webkit-box-reflect: below 0px linear-gradient(transparent, rgba(0,0,0,0.4));',
            'stat-3d-emboss': 'text-shadow: 1px 1px 0px rgba(255,255,255,0.5), -1px -1px 0px rgba(0,0,0,0.3);',
            'stat-3d-engrave': 'text-shadow: -1px -1px 0px rgba(255,255,255,0.5), 1px 1px 0px rgba(0,0,0,0.3);',
            'stat-vintage-sepia': 'filter: sepia(0.8) contrast(1.2);',
            'stat-vintage-bw': 'filter: grayscale(1) contrast(1.2);',
            'stat-blur-soft': 'filter: blur(2px);',
            'stat-blur-motion': 'filter: blur(1px) contrast(1.1);',
            'stat-chrome-metallic': 'background: linear-gradient(135deg, #e8e8e8 0%, #ffffff 50%, #a0a0a0 100%);',
            'stat-glass-morphism': 'background: rgba(255,255,255,0.1); backdrop-filter: blur(10px); border: 1px solid rgba(255,255,255,0.2);'
        };

        if (effects[effectName]) {
            const styles = effects[effectName].split(';').filter(s => s.trim());
            styles.forEach(style => {
                const [prop, val] = style.split(':');
                if (prop && val) {
                    element.style.setProperty(prop.trim(), val.trim());
                }
            });
        }
    }

    updateLoopAnimations(el, item) {
        const loopGeo = el.querySelector('.sv-loop-geo');
        const loopVis = el.querySelector('.sv-loop-vis');
        if (!loopGeo || !loopVis) return;

        const animation = item.animation || { loop: { geo: {}, vis: {} } };
        const loop = animation.loop || { geo: {}, vis: {} };

        const geoAnim = loop.geo?.type || 'none';
        const visAnim = loop.vis?.type || 'none';

        if (geoAnim !== 'none') {
            const dur = loop.geo.duration || 2.0;
            const time = loop.geo.timing || 'linear';
            loopGeo.style.animation = `${geoAnim} ${dur}s ${time} infinite`;
        } else {
            loopGeo.style.animation = 'none';
        }

        if (visAnim !== 'none') {
            const dur = loop.vis.duration || 2.0;
            const time = loop.vis.timing || 'linear';
            loopVis.style.animation = `${visAnim} ${dur}s ${time} infinite`;
        } else {
            loopVis.style.animation = 'none';
        }
    }

    handleHover(el, item, isHover) {
        const loopGeo = el.querySelector('.sv-loop-geo');
        const loopVis = el.querySelector('.sv-loop-vis');
        if (!loopGeo || !loopVis) return;

        if (isHover) {
            const animation = item.animation || { hover: { geo: {}, vis: {} } };
            const hover = animation.hover || { geo: {}, vis: {} };

            const hGeo = hover.geo?.type || 'none';
            const hVis = hover.vis?.type || 'none';

            if (hGeo !== 'none') {
                const dur = hover.geo.duration || 2.0;
                const time = hover.geo.timing || 'linear';
                loopGeo.style.animation = `${hGeo} ${dur}s ${time} infinite`;
            }
            if (hVis !== 'none') {
                const dur = hover.vis.duration || 2.0;
                const time = hover.vis.timing || 'linear';
                loopVis.style.animation = `${hVis} ${dur}s ${time} infinite`;
            }
        } else {
            this.updateLoopAnimations(el, item);
        }
    }

    // Prepara elementos para entrada - deve ser chamado ANTES de mostrar o slide
    prepareForEntry() {
        this.config.items.forEach(item => {
            const el = this.container.querySelector(`#sv_${item.id} .sv-anim-wrapper`);
            if (!el) return;

            const animName = item.animation?.enter?.type || 'none';

            if (animName !== 'none') {
                // Elementos com animação de entrada começam INVISÍVEIS
                el.style.opacity = '0';
                el.style.animation = 'none';
            } else {
                // Elementos sem animação começam VISÍVEIS
                el.style.opacity = '1';
                el.style.animation = 'none';
            }
        });
    }

    show() {
        this.clearTimeouts();
        this.config.items.forEach(item => {
            const el = this.container.querySelector(`#sv_${item.id} .sv-anim-wrapper`);
            if (!el) return;

            const animName = item.animation?.enter?.type || 'none';

            if (animName !== 'none') {
                const duration = item.animation.enter.duration || 1;
                const delay = item.animation.enter.delay || 0;

                // Força reflow para garantir que o estado inicial seja aplicado
                el.offsetHeight;

                // Aplica a animação de entrada
                el.style.animationName = animName;
                el.style.animationDuration = duration + 's';
                el.style.animationDelay = delay + 's';
                el.style.animationFillMode = 'forwards';
                el.style.animationTimingFunction = item.animation.enter.easing || 'ease';
            } else {
                el.style.opacity = '1';
                el.style.animation = 'none';
            }
        });
    }

    hide() {
        this.clearTimeouts();
        this.config.items.forEach(item => {
            const el = this.container.querySelector(`#sv_${item.id} .sv-anim-wrapper`);
            if (!el) return;

            const animName = item.animation?.exit?.type || 'none';

            if (animName !== 'none') {
                const duration = item.animation.exit.duration || 1;
                const delay = item.animation.exit.delay || 0;

                // Ensure element is visible before exit animation starts
                // (Fixes blink if base opacity was 0 from entrance preparation)
                el.style.opacity = '1';

                el.style.animationName = animName;
                el.style.animationDuration = duration + 's';
                el.style.animationDelay = delay + 's';
                el.style.animationFillMode = 'forwards';
                el.style.animationTimingFunction = 'ease';
            } else {
                // Fix: Do NOT hide elements if no exit animation is defined.
                // They should remain visible and exit with the slide container.
                el.style.opacity = '1';
                el.style.animation = 'none';
            }
        });
    }

    // Slide Transition Methods
    // delay: tempo em ms para esperar antes de iniciar a transição do slide
    //        permite que animações de saída dos elementos sejam executadas
    async applyTransition(transitionType, direction = 'next', delay = 0) {
        return new Promise((resolve) => {
            const slide = this.slideEl;
            if (!slide) {
                resolve();
                return;
            }

            // Primeiro, inicia as animações de saída dos elementos
            this.hide();

            // Aguarda o delay antes de iniciar a transição do slide
            // Isso permite que as animações de saída dos elementos sejam vistas
            setTimeout(() => {
                const duration = (this.config.transition?.duration || 0.8) * 1000;
                const easing = this.config.transition?.easing || 'ease-in-out';
                slide.style.transition = `all ${duration}ms ${easing}`;

                switch (transitionType) {
                    case 'slide-fade':
                        slide.style.opacity = '0';
                        break;
                    case 'slide-slide-left':
                        slide.style.transform = `scale(${this.scale}) translateX(-100%)`;
                        slide.style.opacity = '0';
                        break;
                    case 'slide-slide-right':
                        slide.style.transform = `scale(${this.scale}) translateX(100%)`;
                        slide.style.opacity = '0';
                        break;
                    case 'slide-slide-up':
                        slide.style.transform = `scale(${this.scale}) translateY(-100%)`;
                        slide.style.opacity = '0';
                        break;
                    case 'slide-slide-down':
                        slide.style.transform = `scale(${this.scale}) translateY(100%)`;
                        slide.style.opacity = '0';
                        break;
                    case 'slide-scale-up':
                        slide.style.transform = `scale(${this.scale * 1.5})`;
                        slide.style.opacity = '0';
                        break;
                    case 'slide-scale-down':
                        slide.style.transform = `scale(${this.scale * 0.5})`;
                        slide.style.opacity = '0';
                        break;
                    case 'slide-rotate-cw':
                        slide.style.transform = `scale(${this.scale}) rotate(180deg)`;
                        slide.style.opacity = '0';
                        break;
                    case 'slide-rotate-ccw':
                        slide.style.transform = `scale(${this.scale}) rotate(-180deg)`;
                        slide.style.opacity = '0';
                        break;
                    case 'slide-flip-horizontal':
                        slide.style.transform = `scale(${this.scale}) rotateY(90deg)`;
                        slide.style.opacity = '0';
                        break;
                    case 'slide-flip-vertical':
                        slide.style.transform = `scale(${this.scale}) rotateX(90deg)`;
                        slide.style.opacity = '0';
                        break;
                    case 'slide-cube-left':
                        slide.style.transform = `scale(${this.scale}) perspective(1000px) rotateY(-90deg)`;
                        slide.style.transformOrigin = 'left center';
                        break;
                    case 'slide-cube-right':
                        slide.style.transform = `scale(${this.scale}) perspective(1000px) rotateY(90deg)`;
                        slide.style.transformOrigin = 'right center';
                        break;
                    case 'slide-wipe-left':
                        slide.style.clipPath = 'inset(0 100% 0 0)';
                        break;
                    case 'slide-wipe-right':
                        slide.style.clipPath = 'inset(0 0 0 100%)';
                        break;
                    case 'slide-wipe-circle':
                        slide.style.clipPath = 'circle(0% at 50% 50%)';
                        break;
                    case 'slide-blur-in':
                        slide.style.filter = 'blur(20px)';
                        slide.style.opacity = '0';
                        break;
                    case 'slide-pixelate':
                        slide.style.filter = 'blur(0px) contrast(2000%)';
                        slide.style.opacity = '0';
                        break;
                    case 'slide-ken-burns':
                        slide.style.transform = `scale(${this.scale * 1.3})`;
                        slide.style.opacity = '0';
                        break;
                    case 'slide-morph':
                        slide.style.borderRadius = '50%';
                        slide.style.transform = `scale(${this.scale * 0.1}) rotate(360deg)`;
                        slide.style.opacity = '0';
                        break;
                    default:
                        slide.style.opacity = '0';
                }

                setTimeout(() => {
                    resolve();
                }, duration);
            }, delay);
        });
    }

    resetTransition() {
        const slide = this.slideEl;
        if (!slide) return;

        slide.style.transition = 'none';
        slide.style.opacity = '1';

        // Recalcula posição centralizada
        const cw = this.container.clientWidth;
        const ch = this.container.clientHeight;
        const sw = this.config.width;
        const sh = this.config.height;

        // Calculate Scale to fit
        const scaleX = cw / sw;
        const scaleY = ch / sh;

        // Use the same logic as fitToContainer (allow upscale)
        this.scale = Math.min(scaleX, scaleY);

        const x = (cw - sw * this.scale) / 2;
        const y = (ch - sh * this.scale) / 2;

        slide.style.left = x + 'px';
        slide.style.top = y + 'px';
        slide.style.transform = `scale(${this.scale})`;
        slide.style.clipPath = 'none';
        slide.style.filter = 'none';
        slide.style.borderRadius = '0';
        slide.style.transformOrigin = 'top left';
    }

    // Prepara o slide para a animação de entrada (Define estado inicial)
    prepareEntrance(transitionType) {
        const slide = this.slideEl;
        if (!slide) return;

        // Reset básico mas mantendo invisível ou deslocado
        slide.style.transition = 'none';
        slide.style.opacity = '1';
        slide.style.transform = `scale(${this.scale})`;
        slide.style.filter = 'none';
        slide.style.clipPath = 'none';

        switch (transitionType) {
            case 'slide-fade':
                slide.style.opacity = '0';
                break;
            case 'slide-slide-left': // Vem da direita
                slide.style.transform = `scale(${this.scale}) translateX(100%)`;
                break;
            case 'slide-slide-right': // Vem da esquerda
                slide.style.transform = `scale(${this.scale}) translateX(-100%)`;
                break;
            case 'slide-slide-up': // Vem de baixo
                slide.style.transform = `scale(${this.scale}) translateY(100%)`;
                break;
            case 'slide-slide-down': // Vem de cima
                slide.style.transform = `scale(${this.scale}) translateY(-100%)`;
                break;
            case 'slide-scale-up':
                slide.style.transform = `scale(${this.scale * 0.5})`;
                slide.style.opacity = '0';
                break;
            case 'slide-scale-down':
                slide.style.transform = `scale(${this.scale * 1.5})`;
                slide.style.opacity = '0';
                break;
            case 'slide-rotate-cw':
                slide.style.transform = `scale(${this.scale}) rotate(-180deg)`;
                slide.style.opacity = '0';
                break;
            case 'slide-rotate-ccw':
                slide.style.transform = `scale(${this.scale}) rotate(180deg)`;
                slide.style.opacity = '0';
                break;
            case 'slide-flip-horizontal':
                slide.style.transform = `scale(${this.scale}) rotateY(-90deg)`;
                slide.style.opacity = '0';
                break;
            case 'slide-flip-vertical':
                slide.style.transform = `scale(${this.scale}) rotateX(-90deg)`;
                slide.style.opacity = '0';
                break;
            case 'slide-cube-left':
                slide.style.transform = `scale(${this.scale}) perspective(1000px) rotateY(90deg)`;
                slide.style.transformOrigin = 'right center';
                break;
            case 'slide-cube-right':
                slide.style.transform = `scale(${this.scale}) perspective(1000px) rotateY(-90deg)`;
                slide.style.transformOrigin = 'left center';
                break;
            case 'slide-wipe-left':
                slide.style.clipPath = 'inset(0 0 0 100%)';
                break;
            case 'slide-wipe-right':
                slide.style.clipPath = 'inset(0 100% 0 0)';
                break;
            case 'slide-wipe-circle':
                slide.style.clipPath = 'circle(0% at 50% 50%)';
                break;
            case 'slide-blur-in':
                slide.style.filter = 'blur(20px)';
                slide.style.opacity = '0';
                break;
            case 'slide-pixelate':
                slide.style.filter = 'blur(0px) contrast(2000%)'; // Aproximação CSS
                slide.style.opacity = '0';
                break;
            case 'slide-ken-burns':
                slide.style.transform = `scale(${this.scale * 1.3})`;
                slide.style.opacity = '0';
                break;
            case 'slide-morph':
                slide.style.borderRadius = '50%';
                slide.style.transform = `scale(${this.scale * 0.1}) rotate(-360deg)`;
                slide.style.opacity = '0';
                break;
            default:
                slide.style.opacity = '0';
        }
    }

    // Executa a animação de entrada (vai para o estado neutro/final)
    playEntrance(transitionType) {
        const slide = this.slideEl;
        if (!slide) return;

        // Force reflow
        slide.offsetHeight;

        const duration = (this.config.transition?.duration || 0.8) * 1000;
        const easing = this.config.transition?.easing || 'ease-in-out';
        slide.style.transition = `all ${duration}ms ${easing}`;

        // Restaurar estado neutro
        slide.style.opacity = '1';
        slide.style.transform = `scale(${this.scale})`;
        slide.style.transformOrigin = 'top left'; // Reset origin
        slide.style.filter = 'none';
        slide.style.clipPath = 'none';
        slide.style.borderRadius = '0'; // For Morph
    }

    clearTimeouts() {
        this.timeouts.forEach(t => clearTimeout(t));
        this.timeouts = [];
    }

    getAnimationCSS() {
        return `
            /* ============================================
               ENTRANCE ANIMATIONS (20)
               ============================================ */
            @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
            @keyframes slideFromBottom { from { opacity: 0; transform: translateY(100px); } to { opacity: 1; transform: translateY(0); } }
            @keyframes slideFromTop { from { opacity: 0; transform: translateY(-100px); } to { opacity: 1; transform: translateY(0); } }
            @keyframes slideFromLeft { from { opacity: 0; transform: translateX(-100px); } to { opacity: 1; transform: translateX(0); } }
            @keyframes slideFromRight { from { opacity: 0; transform: translateX(100px); } to { opacity: 1; transform: translateX(0); } }
            @keyframes zoomIn { from { opacity: 0; transform: scale(0.5); } to { opacity: 1; transform: scale(1); } }
            @keyframes bounceIn { 0% { opacity: 0; transform: scale(0.3); } 50% { opacity: 0.7; transform: scale(1.05); } 70% { transform: scale(0.95); } 100% { opacity: 1; transform: scale(1); } }
            @keyframes flipIn { from { opacity: 0; transform: rotateY(90deg); } to { opacity: 1; transform: rotateY(0); } }
            @keyframes rotateIn { from { opacity: 0; transform: rotate(-180deg) scale(0.5); } to { opacity: 1; transform: rotate(0) scale(1); } }
            @keyframes swingIn { 0% { opacity: 0; transform: rotateX(-90deg); } 60% { transform: rotateX(20deg); } 100% { opacity: 1; transform: rotateX(0); } }
            @keyframes fadeInUp { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }
            @keyframes fadeInDown { from { opacity: 0; transform: translateY(-30px); } to { opacity: 1; transform: translateY(0); } }
            @keyframes fadeInLeft { from { opacity: 0; transform: translateX(-30px); } to { opacity: 1; transform: translateX(0); } }
            @keyframes fadeInRight { from { opacity: 0; transform: translateX(30px); } to { opacity: 1; transform: translateX(0); } }
            @keyframes zoomInRotate { from { opacity: 0; transform: scale(0.3) rotate(-180deg); } to { opacity: 1; transform: scale(1) rotate(0); } }
            @keyframes elasticIn { 0% { opacity: 0; transform: scale(0.1) rotate(30deg); } 50% { transform: scale(1.2) rotate(-10deg); } 70% { transform: scale(0.9) rotate(5deg); } 100% { opacity: 1; transform: scale(1) rotate(0); } }
            @keyframes rollIn { from { opacity: 0; transform: translateX(-100%) rotate(-120deg); } to { opacity: 1; transform: translateX(0) rotate(0); } }
            @keyframes lightSpeedIn { from { opacity: 0; transform: translateX(100%) skewX(-30deg); } 60% { opacity: 1; transform: skewX(20deg); } 80% { transform: skewX(-5deg); } to { opacity: 1; transform: translateX(0) skewX(0); } }
            @keyframes jackInTheBox { from { opacity: 0; transform: scale(0.1) rotate(30deg); } 50% { transform: rotate(-10deg); } 70% { transform: rotate(3deg); } to { opacity: 1; transform: scale(1) rotate(0); } }
            @keyframes pulseIn { 0% { opacity: 0; transform: scale(0.1); } 50% { opacity: 1; transform: scale(1.05); } 100% { opacity: 1; transform: scale(1); } }

            /* ============================================
               EXIT ANIMATIONS (20)
               ============================================ */
            @keyframes fadeOut { from { opacity: 1; } to { opacity: 0; } }
            @keyframes slideToBottom { from { opacity: 1; transform: translateY(0); } to { opacity: 0; transform: translateY(100px); } }
            @keyframes slideToTop { from { opacity: 1; transform: translateY(0); } to { opacity: 0; transform: translateY(-100px); } }
            @keyframes slideToLeft { from { opacity: 1; transform: translateX(0); } to { opacity: 0; transform: translateX(-100px); } }
            @keyframes slideToRight { from { opacity: 1; transform: translateX(0); } to { opacity: 0; transform: translateX(100px); } }
            @keyframes zoomOut { from { opacity: 1; transform: scale(1); } to { opacity: 0; transform: scale(0.5); } }
            @keyframes bounceOut { 0% { opacity: 1; transform: scale(1); } 30% { transform: scale(1.05); } 50% { opacity: 0.7; transform: scale(0.95); } 100% { opacity: 0; transform: scale(0.3); } }
            @keyframes flipOut { from { opacity: 1; transform: rotateY(0); } to { opacity: 0; transform: rotateY(90deg); } }
            @keyframes rotateOut { from { opacity: 1; transform: rotate(0) scale(1); } to { opacity: 0; transform: rotate(180deg) scale(0.5); } }
            @keyframes swingOut { 0% { opacity: 1; transform: rotateX(0); } 40% { transform: rotateX(20deg); } 100% { opacity: 0; transform: rotateX(-90deg); } }
            @keyframes fadeOutUp { from { opacity: 1; transform: translateY(0); } to { opacity: 0; transform: translateY(-30px); } }
            @keyframes fadeOutDown { from { opacity: 1; transform: translateY(0); } to { opacity: 0; transform: translateY(30px); } }
            @keyframes fadeOutLeft { from { opacity: 1; transform: translateX(0); } to { opacity: 0; transform: translateX(-30px); } }
            @keyframes fadeOutRight { from { opacity: 1; transform: translateX(0); } to { opacity: 0; transform: translateX(30px); } }
            @keyframes zoomOutRotate { from { opacity: 1; transform: scale(1) rotate(0); } to { opacity: 0; transform: scale(0.3) rotate(180deg); } }
            @keyframes elasticOut { 0% { opacity: 1; transform: scale(1) rotate(0); } 30% { transform: scale(0.9) rotate(5deg); } 50% { transform: scale(1.2) rotate(-10deg); } 100% { opacity: 0; transform: scale(0.1) rotate(30deg); } }
            @keyframes rollOut { from { opacity: 1; transform: translateX(0) rotate(0); } to { opacity: 0; transform: translateX(100%) rotate(120deg); } }
            @keyframes lightSpeedOut { from { opacity: 1; transform: translateX(0) skewX(0); } 60% { opacity: 1; transform: skewX(-5deg); } 80% { transform: skewX(20deg); } to { opacity: 0; transform: translateX(100%) skewX(-30deg); } }
            @keyframes jackOutTheBox { from { opacity: 1; transform: scale(1) rotate(0); } 30% { transform: rotate(3deg); } 50% { transform: rotate(-10deg); } to { opacity: 0; transform: scale(0.1) rotate(30deg); } }
            @keyframes pulseOut { 0% { opacity: 1; transform: scale(1); } 50% { opacity: 0.5; transform: scale(1.05); } 100% { opacity: 0; transform: scale(0.1); } }

            /* ============================================
               GEOMETRIC LOOP ANIMATIONS (50)
               ============================================ */
            /* Original 25 */
            @keyframes geo-rotate-360 { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
            @keyframes geo-pulse-scale { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.2); } }
            @keyframes geo-shake-h { 0%, 100% { transform: translateX(0); } 25% { transform: translateX(5px); } 75% { transform: translateX(-5px); } }
            @keyframes geo-shake-v { 0%, 100% { transform: translateY(0); } 25% { transform: translateY(5px); } 75% { transform: translateY(-5px); } }
            @keyframes geo-skew-alt { 0%, 100% { transform: skewX(0deg); } 50% { transform: skewX(20deg); } }
            @keyframes geo-rotate-3d-x { 0% { transform: perspective(500px) rotateX(0deg); } 100% { transform: perspective(500px) rotateX(360deg); } }
            @keyframes geo-rotate-3d-y { 0% { transform: perspective(500px) rotateY(0deg); } 100% { transform: perspective(500px) rotateY(360deg); } }
            @keyframes geo-scale-rotate { 0% { transform: scale(1) rotate(0deg); } 50% { transform: scale(1.3) rotate(180deg); } 100% { transform: scale(1) rotate(360deg); } }
            @keyframes geo-pulse-diag { 0%, 100% { transform: translate(0, 0); } 50% { transform: translate(20px, 20px); } }
            @keyframes geo-rotate-pulse { 0% { transform: rotate(0deg) scale(1); } 50% { transform: rotate(180deg) scale(1.1); } 100% { transform: rotate(360deg) scale(1); } }
            @keyframes geo-elastic-scale { 0%, 100% { transform: scale(1, 1); } 50% { transform: scale(1.2, 0.9); } }
            @keyframes geo-rotate-inf-rev { 0% { transform: rotate(0deg); } 100% { transform: rotate(-360deg); } }
            @keyframes geo-swing-pendulum { 0%, 100% { transform: rotate(-15deg); } 50% { transform: rotate(15deg); } }
            @keyframes geo-float-smooth { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-20px); } }
            @keyframes geo-spiral-grow { 0% { transform: rotate(0deg) scale(1); } 50% { transform: rotate(180deg) scale(1.3); } 100% { transform: rotate(360deg) scale(1); } }
            @keyframes geo-twist-dyn { 0%, 100% { transform: rotate(0deg) skewX(0deg); } 50% { transform: rotate(10deg) skewX(10deg); } }
            @keyframes geo-pulse-3d { 0%, 100% { transform: scale3d(1, 1, 1); } 50% { transform: scale3d(1.1, 1.1, 1.1); } }
            @keyframes geo-rotate-z { 0% { transform: rotateZ(0deg); } 100% { transform: rotateZ(360deg); } }
            @keyframes geo-orbit { 0% { transform: rotate(0deg) translateX(30px) rotate(0deg); } 100% { transform: rotate(360deg) translateX(30px) rotate(-360deg); } }
            @keyframes geo-scale-prog { 0%, 100% { transform: scale(0.9); } 50% { transform: scale(1.1); } }
            @keyframes geo-skew-double { 0%, 100% { transform: skew(0deg, 0deg); } 50% { transform: skew(10deg, 10deg); } }
            @keyframes geo-rotate-trans { 0% { transform: rotate(0deg) translateY(0); } 50% { transform: rotate(180deg) translateY(25px); } 100% { transform: rotate(360deg) translateY(0); } }
            @keyframes geo-pulse-asym { 0%, 100% { transform: scaleX(1) scaleY(1); } 50% { transform: scaleX(1.2) scaleY(1.1); } }
            @keyframes geo-spiral-double { 0% { transform: rotate(0deg) scale(1); } 50% { transform: rotate(360deg) scale(1.4); } 100% { transform: rotate(720deg) scale(1); } }
            @keyframes geo-wobble { 0%, 100% { transform: rotate(0deg); } 15% { transform: rotate(10deg); } 30% { transform: rotate(-8deg); } 45% { transform: rotate(6deg); } 60% { transform: rotate(-4deg); } 75% { transform: rotate(2deg); } 85% { transform: rotate(-1deg); } }

            /* New 25 Geometric Effects */
            @keyframes geo-flip-3d { 0% { transform: perspective(500px) rotateY(0deg); } 100% { transform: perspective(500px) rotateY(360deg); } }
            @keyframes geo-cube-rotate { 0% { transform: perspective(800px) rotateX(0deg) rotateY(0deg); } 25% { transform: perspective(800px) rotateX(90deg) rotateY(0deg); } 50% { transform: perspective(800px) rotateX(90deg) rotateY(90deg); } 75% { transform: perspective(800px) rotateX(0deg) rotateY(90deg); } 100% { transform: perspective(800px) rotateX(0deg) rotateY(0deg); } }
            @keyframes geo-wave-motion { 0%, 100% { transform: translateY(0) rotate(0deg); } 25% { transform: translateY(-10px) rotate(2deg); } 50% { transform: translateY(0) rotate(0deg); } 75% { transform: translateY(10px) rotate(-2deg); } }
            @keyframes geo-bounce-physics { 0%, 100% { transform: translateY(0); animation-timing-function: ease-out; } 50% { transform: translateY(-30px); animation-timing-function: ease-in; } }
            @keyframes geo-swing-chain { 0%, 100% { transform: rotate(-20deg); } 50% { transform: rotate(20deg); } }
            @keyframes geo-vibrate-intense { 0%, 100% { transform: translate(0); } 20% { transform: translate(-2px, 2px); } 40% { transform: translate(2px, -2px); } 60% { transform: translate(-2px, -2px); } 80% { transform: translate(2px, 2px); } }
            @keyframes geo-morph-shape { 0%, 100% { border-radius: 0%; } 25% { border-radius: 25%; } 50% { border-radius: 50%; } 75% { border-radius: 25%; } }
            @keyframes geo-path-follow { 0% { transform: translate(0, 0); } 25% { transform: translate(50px, -30px); } 50% { transform: translate(100px, 0); } 75% { transform: translate(50px, 30px); } 100% { transform: translate(0, 0); } }
            @keyframes geo-elastic-bounce { 0% { transform: translateY(0) scaleY(1); } 30% { transform: translateY(-50px) scaleY(1.1); } 50% { transform: translateY(0) scaleY(0.9); } 70% { transform: translateY(-20px) scaleY(1.05); } 100% { transform: translateY(0) scaleY(1); } }
            @keyframes geo-levitate { 0%, 100% { transform: translateY(0) rotate(0deg); } 33% { transform: translateY(-15px) rotate(2deg); } 66% { transform: translateY(-10px) rotate(-1deg); } }
            @keyframes geo-spin-accel { 0% { transform: rotate(0deg); animation-timing-function: linear; } 100% { transform: rotate(360deg); animation-timing-function: ease-in; } }
            @keyframes geo-tilt-shift { 0%, 100% { transform: perspective(500px) rotateX(0deg) rotateY(0deg); } 25% { transform: perspective(500px) rotateX(10deg) rotateY(5deg); } 50% { transform: perspective(500px) rotateX(0deg) rotateY(0deg); } 75% { transform: perspective(500px) rotateX(-10deg) rotateY(-5deg); } }
            @keyframes geo-heartbeat { 0%, 100% { transform: scale(1); } 10% { transform: scale(1.1); } 20% { transform: scale(1); } 30% { transform: scale(1.15); } 40% { transform: scale(1); } }
            @keyframes geo-figure8 { 0% { transform: translate(0, 0); } 25% { transform: translate(30px, -20px); } 50% { transform: translate(0, -40px); } 75% { transform: translate(-30px, -20px); } 100% { transform: translate(0, 0); } }
            @keyframes geo-arc-swing { 0%, 100% { transform: translateX(-50px) rotate(-15deg); } 50% { transform: translateX(50px) rotate(15deg); } }
            @keyframes geo-jelly-wobble { 0%, 100% { transform: scale(1, 1); } 25% { transform: scale(1.1, 0.9); } 50% { transform: scale(0.9, 1.1); } 75% { transform: scale(1.05, 0.95); } }
            @keyframes geo-snap-rotate { 0% { transform: rotate(0deg); } 25% { transform: rotate(100deg); } 25.01% { transform: rotate(90deg); } 50% { transform: rotate(190deg); } 50.01% { transform: rotate(180deg); } 75% { transform: rotate(280deg); } 75.01% { transform: rotate(270deg); } 100% { transform: rotate(360deg); } }
            @keyframes geo-float-random { 0%, 100% { transform: translate(0, 0); } 20% { transform: translate(10px, -15px); } 40% { transform: translate(-15px, -5px); } 60% { transform: translate(5px, 10px); } 80% { transform: translate(-10px, 5px); } }
            @keyframes geo-compress-stretch { 0%, 100% { transform: scaleX(1) scaleY(1); } 25% { transform: scaleX(1.2) scaleY(0.8); } 50% { transform: scaleX(0.8) scaleY(1.2); } 75% { transform: scaleX(1.1) scaleY(0.9); } }
            @keyframes geo-ripple-center { 0% { transform: scale(0.8); opacity: 1; } 100% { transform: scale(1.5); opacity: 0; } }
            @keyframes geo-spiral-in { 0% { transform: rotate(0deg) scale(1.5); } 100% { transform: rotate(720deg) scale(0.5); } }
            @keyframes geo-spiral-out { 0% { transform: rotate(0deg) scale(0.5); } 100% { transform: rotate(720deg) scale(1.5); } }
            @keyframes geo-tornado-spin { 0% { transform: rotate(0deg) translateX(0) scale(1); } 50% { transform: rotate(180deg) translateX(30px) scale(0.8); } 100% { transform: rotate(360deg) translateX(0) scale(1); } }
            @keyframes geo-pendulum-arc { 0%, 100% { transform: rotate(-45deg); transform-origin: top center; } 50% { transform: rotate(45deg); transform-origin: top center; } }
            @keyframes geo-step-bounce { 0% { transform: translateY(0); } 20% { transform: translateY(-40px); } 40% { transform: translateY(0); } 60% { transform: translateY(-20px); } 80% { transform: translateY(0); } 90% { transform: translateY(-5px); } 100% { transform: translateY(0); } }

            /* ============================================
               VISUAL LOOP ANIMATIONS (46)
               ============================================ */
            /* Original 21 */
            @keyframes vis-shadow-pulse { 0%, 100% { filter: drop-shadow(0 0 5px rgba(0,0,0,0.5)); } 50% { filter: drop-shadow(0 0 15px rgba(0,219,222,0.8)); } }
            @keyframes vis-neon-pulse { 0%, 100% { filter: drop-shadow(0 0 2px #00dbde) drop-shadow(0 0 5px #00dbde); } 50% { filter: drop-shadow(0 0 5px #ff8a00) drop-shadow(0 0 15px #da1b60); } }
            @keyframes vis-color-cycle { 0% { filter: hue-rotate(0deg); } 100% { filter: hue-rotate(360deg); } }
            @keyframes vis-bright-float { 0%, 100% { filter: brightness(1); } 50% { filter: brightness(1.5); } }
            @keyframes vis-shadow-move { 0%, 100% { filter: drop-shadow(0 0 5px rgba(0,0,0,0.5)); } 50% { filter: drop-shadow(10px 10px 10px rgba(0,0,0,0.7)); } }
            @keyframes vis-border-pulse { 0%, 100% { border-color: #00dbde; } 50% { border-color: #fc00ff; } }
            @keyframes vis-fog-effect { 0%, 100% { filter: drop-shadow(0 0 2px rgba(255,255,255,0.3)); } 50% { filter: drop-shadow(0 0 20px rgba(255,255,255,0.8)); } }
            @keyframes vis-opacity-tog { 0%, 100% { opacity: 1; } 50% { opacity: 0.6; } }
            @keyframes vis-sat-osc { 0%, 100% { filter: saturate(1); } 50% { filter: saturate(2); } }
            @keyframes vis-neon-outline { 0%, 100% { filter: drop-shadow(0 0 2px #00e676) drop-shadow(0 0 5px #00e676); } 50% { filter: drop-shadow(0 0 5px #00e676) drop-shadow(0 0 15px #00e676); } }
            @keyframes vis-glow-int { 0%, 100% { filter: drop-shadow(0 0 2px rgba(255,255,255,0.5)); } 50% { filter: drop-shadow(0 0 10px rgba(255,255,255,0.9)); } }
            @keyframes vis-blur-pulse { 0%, 100% { filter: blur(0px); } 50% { filter: blur(2px); } }
            @keyframes vis-shadow-col { 0% { filter: drop-shadow(0 0 10px #ff0080); } 33% { filter: drop-shadow(0 0 10px #00ff88); } 66% { filter: drop-shadow(0 0 10px #00c8ff); } 100% { filter: drop-shadow(0 0 10px #ff0080); } }
            @keyframes vis-contrast-pl { 0%, 100% { filter: contrast(1); } 50% { filter: contrast(1.5); } }
            @keyframes vis-shadow-exp { 0%, 100% { filter: drop-shadow(0 5px 5px rgba(0,0,0,0.3)); } 50% { filter: drop-shadow(0 15px 20px rgba(0,0,0,0.6)); } }
            @keyframes vis-neon-dbl { 0%, 100% { filter: drop-shadow(0 0 3px #00dbde) drop-shadow(0 0 6px #00dbde); } 50% { filter: drop-shadow(0 0 10px #fc00ff) drop-shadow(0 0 20px #fc00ff); } }
            @keyframes vis-bright-pl { 0%, 100% { filter: brightness(1) drop-shadow(0 0 5px rgba(255,255,255,0.5)); } 50% { filter: brightness(1.3) drop-shadow(0 0 15px rgba(255,255,255,0.9)); } }
            @keyframes vis-glass-frost { 0%, 100% { backdrop-filter: blur(0px); } 50% { backdrop-filter: blur(5px); } }
            @keyframes vis-aurora { 0%, 100% { filter: drop-shadow(0 0 5px rgba(106,17,203,0.7)); } 50% { filter: drop-shadow(0 0 20px rgba(37,117,252,0.9)); } }
            @keyframes vis-hue-rot { 0% { filter: hue-rotate(0deg); } 100% { filter: hue-rotate(360deg); } }

            /* New 25 Visual Effects */
            @keyframes vis-rainbow-glow { 0% { filter: drop-shadow(0 0 10px #ff0000); } 16% { filter: drop-shadow(0 0 10px #ff8800); } 33% { filter: drop-shadow(0 0 10px #ffff00); } 50% { filter: drop-shadow(0 0 10px #00ff00); } 66% { filter: drop-shadow(0 0 10px #0088ff); } 83% { filter: drop-shadow(0 0 10px #8800ff); } 100% { filter: drop-shadow(0 0 10px #ff0000); } }
            @keyframes vis-fire-flicker { 0%, 100% { filter: brightness(1) contrast(1) drop-shadow(0 0 5px #ff6600); } 25% { filter: brightness(1.2) contrast(1.1) drop-shadow(0 0 10px #ff8800); } 50% { filter: brightness(0.9) contrast(1.2) drop-shadow(0 0 15px #ff4400); } 75% { filter: brightness(1.1) contrast(1) drop-shadow(0 0 8px #ffaa00); } }
            @keyframes vis-electric-spark { 0%, 100% { filter: brightness(1); } 10% { filter: brightness(2) drop-shadow(0 0 10px #00ffff); } 20% { filter: brightness(1); } 30% { filter: brightness(2) drop-shadow(0 0 15px #ffffff); } 40% { filter: brightness(1); } }
            @keyframes vis-magnetic-pulse { 0%, 100% { filter: drop-shadow(0 0 0px transparent); } 50% { filter: drop-shadow(0 0 30px rgba(0,100,255,0.8)); } }
            @keyframes vis-liquid-morph { 0%, 100% { filter: url(#liquid); } 50% { filter: url(#liquid) hue-rotate(30deg); } }
            @keyframes vis-prism-shift { 0% { filter: hue-rotate(0deg) saturate(1); } 50% { filter: hue-rotate(60deg) saturate(1.5); } 100% { filter: hue-rotate(0deg) saturate(1); } }
            @keyframes vis-heat-wave { 0%, 100% { filter: url(#heatwave); } }
            @keyframes vis-crystal-shine { 0%, 100% { filter: brightness(1) contrast(1); } 50% { filter: brightness(1.5) contrast(1.3) drop-shadow(0 0 20px rgba(255,255,255,0.8)); } }
            @keyframes vis-plasma-flow { 0% { filter: hue-rotate(0deg) saturate(2) brightness(1.2); } 100% { filter: hue-rotate(360deg) saturate(2) brightness(1.2); } }
            @keyframes vis-hologram-flicker { 0%, 100% { opacity: 1; filter: drop-shadow(0 0 5px #00ffff); } 50% { opacity: 0.8; filter: drop-shadow(0 0 15px #00ffff) brightness(1.2); } }
            @keyframes vis-strobe-light { 0%, 100% { filter: brightness(1); } 50% { filter: brightness(3); } }
            @keyframes vis-radar-sweep { 0% { background: linear-gradient(90deg, transparent 0%, rgba(0,255,0,0.3) 50%, transparent 100%); background-position: -100% 0; } 100% { background: linear-gradient(90deg, transparent 0%, rgba(0,255,0,0.3) 50%, transparent 100%); background-position: 200% 0; } }
            @keyframes vis-pulse-ring { 0% { box-shadow: 0 0 0 0 rgba(255,255,255,0.7); } 70% { box-shadow: 0 0 0 20px rgba(255,255,255,0); } 100% { box-shadow: 0 0 0 0 rgba(255,255,255,0); } }
            @keyframes vis-energy-aura { 0%, 100% { filter: drop-shadow(0 0 10px #ff00ff) drop-shadow(0 0 20px #00ffff); } 50% { filter: drop-shadow(0 0 20px #ff00ff) drop-shadow(0 0 40px #00ffff); } }
            @keyframes vis-glitch-digital { 0%, 100% { transform: translate(0); } 20% { transform: translate(-2px, 2px); filter: hue-rotate(90deg); } 40% { transform: translate(2px, -2px); filter: hue-rotate(-90deg); } 60% { transform: translate(-2px, -2px); } 80% { transform: translate(2px, 2px); } }
            @keyframes vis-scan-line { 0% { background-position: 0 -100%; } 100% { background-position: 0 200%; } }
            @keyframes vis-wave-distort { 0%, 100% { filter: url(#wave); } 50% { filter: url(#wave) hue-rotate(30deg); } }
            @keyframes vis-glow-breathe { 0%, 100% { filter: drop-shadow(0 0 5px currentColor); } 50% { filter: drop-shadow(0 0 20px currentColor) brightness(1.2); } }
            @keyframes vis-star-twinkle { 0%, 100% { opacity: 1; filter: brightness(1); } 50% { opacity: 0.7; filter: brightness(1.5) drop-shadow(0 0 10px white); } }
            @keyframes vis-neon-flicker { 0%, 100% { filter: drop-shadow(0 0 5px #ff00de) drop-shadow(0 0 10px #ff00de); } 10% { filter: drop-shadow(0 0 2px #ff00de); } 20% { filter: drop-shadow(0 0 8px #ff00de) drop-shadow(0 0 15px #ff00de); } 30% { filter: drop-shadow(0 0 3px #ff00de); } 40% { filter: drop-shadow(0 0 10px #ff00de) drop-shadow(0 0 20px #ff00de); } }
            @keyframes vis-ink-spread { 0% { filter: url(#ink) opacity(0); } 50% { filter: url(#ink) opacity(1); } 100% { filter: url(#ink) opacity(0.9); } }
            @keyframes vis-smoke-rise { 0% { transform: translateY(0) scale(1); opacity: 0.8; filter: blur(0px); } 100% { transform: translateY(-50px) scale(1.2); opacity: 0; filter: blur(10px); } }
            @keyframes vis-bubble-float { 0%, 100% { transform: translateY(0) scale(1); } 50% { transform: translateY(-20px) scale(1.05); } }
            @keyframes vis-sunray-beams { 0% { background: radial-gradient(circle, rgba(255,255,0,0.3) 0%, transparent 70%); opacity: 0.5; } 50% { background: radial-gradient(circle, rgba(255,255,0,0.5) 0%, transparent 70%); opacity: 1; } 100% { background: radial-gradient(circle, rgba(255,255,0,0.3) 0%, transparent 70%); opacity: 0.5; } }
            @keyframes vis-matrix-rain { 0% { background-position: 0 0; } 100% { background-position: 0 100%; } }

            /* ============================================
               STATIC EFFECTS (Applied via CSS classes)
               ============================================ */
            .stat-shadow-soft { filter: drop-shadow(0 4px 6px rgba(0,0,0,0.1)) !important; }
            .stat-shadow-hard { filter: drop-shadow(4px 4px 0px rgba(0,0,0,0.3)) !important; }
            .stat-shadow-long { filter: drop-shadow(0 15px 25px rgba(0,0,0,0.3)) !important; }
            .stat-shadow-inner { box-shadow: inset 0 4px 15px rgba(0,0,0,0.2) !important; }
            .stat-shadow-neon { filter: drop-shadow(0 0 10px rgba(0,219,222,0.8)) drop-shadow(0 0 20px rgba(252,0,255,0.6)) !important; }
            .stat-glow-soft { filter: drop-shadow(0 0 15px rgba(255,255,255,0.5)) !important; }
            .stat-glow-intense { filter: drop-shadow(0 0 30px rgba(255,255,255,0.9)) !important; }
            .stat-glow-rainbow { filter: drop-shadow(0 0 10px #ff0080) drop-shadow(0 0 20px #00ff88) drop-shadow(0 0 30px #00c8ff) !important; }
            .stat-border-glow { box-shadow: 0 0 10px currentColor, inset 0 0 10px currentColor !important; }
            .stat-border-dashed { border-style: dashed !important; }
            .stat-border-dotted { border-style: dotted !important; }
            .stat-border-double { border-style: double !important; border-width: 4px !important; }
            .stat-border-gradient { border-image: linear-gradient(45deg, #ff0080, #00ff88, #00c8ff) 1 !important; }
            .stat-border-neon { box-shadow: 0 0 5px #00dbde, 0 0 10px #00dbde, inset 0 0 5px #00dbde !important; }
            .stat-reflection { -webkit-box-reflect: below 0px linear-gradient(transparent, rgba(0,0,0,0.4)) !important; }
            .stat-3d-emboss { text-shadow: 1px 1px 0px rgba(255,255,255,0.5), -1px -1px 0px rgba(0,0,0,0.3) !important; }
            .stat-3d-engrave { text-shadow: -1px -1px 0px rgba(255,255,255,0.5), 1px 1px 0px rgba(0,0,0,0.3) !important; }
            .stat-vintage-sepia { filter: sepia(0.8) contrast(1.2) !important; }
            .stat-vintage-bw { filter: grayscale(1) contrast(1.2) !important; }
            .stat-blur-soft { filter: blur(2px) !important; }
            .stat-blur-motion { filter: blur(1px) contrast(1.1) !important; }
            .stat-chrome-metallic { background: linear-gradient(135deg, #e8e8e8 0%, #ffffff 50%, #a0a0a0 100%) !important; }
            .stat-glass-morphism { background: rgba(255,255,255,0.1) !important; backdrop-filter: blur(10px) !important; border: 1px solid rgba(255,255,255,0.2) !important; }
        `;
    }
}
