/**
 * ToastSystem
 * Sistema de notificações toast para o Slide Editor
 */
export class ToastSystem {
    constructor() {
        this.container = null;
        this.toasts = [];
        this.init();
    }

    init() {
        // Cria o container de toasts se não existir
        if (!document.getElementById('toast-container')) {
            this.container = document.createElement('div');
            this.container.id = 'toast-container';
            this.container.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                z-index: 10000;
                display: flex;
                flex-direction: column;
                gap: 10px;
                pointer-events: none;
            `;
            document.body.appendChild(this.container);
        } else {
            this.container = document.getElementById('toast-container');
        }

        // Injeta os estilos
        if (!document.getElementById('toast-styles')) {
            const style = document.createElement('style');
            style.id = 'toast-styles';
            style.textContent = `
                .toast {
                    min-width: 280px;
                    max-width: 400px;
                    padding: 14px 18px;
                    border-radius: 8px;
                    color: white;
                    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                    font-size: 14px;
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
                    transform: translateX(120%);
                    opacity: 0;
                    transition: all 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55);
                    pointer-events: auto;
                    position: relative;
                    overflow: hidden;
                }
                
                .toast.show {
                    transform: translateX(0);
                    opacity: 1;
                }
                
                .toast.hide {
                    transform: translateX(120%);
                    opacity: 0;
                }
                
                .toast-success {
                    background: linear-gradient(135deg, #10b981 0%, #059669 100%);
                    border-left: 4px solid #34d399;
                }
                
                .toast-error {
                    background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
                    border-left: 4px solid #f87171;
                }
                
                .toast-warning {
                    background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
                    border-left: 4px solid #fbbf24;
                }
                
                .toast-info {
                    background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
                    border-left: 4px solid #60a5fa;
                }
                
                .toast-icon {
                    width: 22px;
                    height: 22px;
                    flex-shrink: 0;
                }
                
                .toast-content {
                    flex: 1;
                    line-height: 1.4;
                }
                
                .toast-title {
                    font-weight: 600;
                    margin-bottom: 2px;
                    font-size: 13px;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                    opacity: 0.9;
                }
                
                .toast-message {
                    font-size: 14px;
                }
                
                .toast-close {
                    background: none;
                    border: none;
                    color: white;
                    font-size: 18px;
                    cursor: pointer;
                    padding: 0;
                    width: 24px;
                    height: 24px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    border-radius: 4px;
                    transition: background 0.2s;
                    opacity: 0.7;
                }
                
                .toast-close:hover {
                    background: rgba(255, 255, 255, 0.2);
                    opacity: 1;
                }
                
                .toast-progress {
                    position: absolute;
                    bottom: 0;
                    left: 0;
                    height: 3px;
                    background: rgba(255, 255, 255, 0.5);
                    border-radius: 0 0 0 8px;
                    transition: width linear;
                }
            `;
            document.head.appendChild(style);
        }
    }

    /**
     * Mostra um toast
     * @param {string} message - Mensagem a ser exibida
     * @param {string} type - Tipo: 'success', 'error', 'warning', 'info'
     * @param {number} duration - Duração em ms (padrão: 4000)
     * @param {string} title - Título opcional
     */
    show(message, type = 'info', duration = 4000, title = '') {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        
        const icons = {
            success: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>`,
            error: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>`,
            warning: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/></svg>`,
            info: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/></svg>`
        };

        const titles = {
            success: 'Sucesso',
            error: 'Erro',
            warning: 'Aviso',
            info: 'Informação'
        };

        toast.innerHTML = `
            <div class="toast-icon">${icons[type]}</div>
            <div class="toast-content">
                ${title || titles[type] ? `<div class="toast-title">${title || titles[type]}</div>` : ''}
                <div class="toast-message">${message}</div>
            </div>
            <button class="toast-close">&times;</button>
            <div class="toast-progress"></div>
        `;

        this.container.appendChild(toast);

        // Animação de entrada
        requestAnimationFrame(() => {
            toast.classList.add('show');
        });

        // Barra de progresso
        const progress = toast.querySelector('.toast-progress');
        progress.style.width = '100%';
        setTimeout(() => {
            progress.style.transition = `width ${duration}ms linear`;
            progress.style.width = '0%';
        }, 50);

        // Botão de fechar
        const closeBtn = toast.querySelector('.toast-close');
        closeBtn.onclick = () => this.dismiss(toast);

        // Auto-dismiss
        const timeoutId = setTimeout(() => {
            this.dismiss(toast);
        }, duration);

        // Guarda referência
        this.toasts.push({ element: toast, timeoutId });

        return toast;
    }

    /**
     * Remove um toast específico
     */
    dismiss(toast) {
        const index = this.toasts.findIndex(t => t.element === toast);
        if (index !== -1) {
            clearTimeout(this.toasts[index].timeoutId);
            this.toasts.splice(index, 1);
        }

        toast.classList.remove('show');
        toast.classList.add('hide');
        
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 300);
    }

    /**
     * Remove todos os toasts
     */
    clearAll() {
        this.toasts.forEach(t => {
            clearTimeout(t.timeoutId);
            this.dismiss(t.element);
        });
        this.toasts = [];
    }

    // Métodos de conveniência
    success(message, duration, title) {
        return this.show(message, 'success', duration, title);
    }

    error(message, duration, title) {
        return this.show(message, 'error', duration, title);
    }

    warning(message, duration, title) {
        return this.show(message, 'warning', duration, title);
    }

    info(message, duration, title) {
        return this.show(message, 'info', duration, title);
    }
}

// Instância global
let toastInstance = null;

export function getToast() {
    if (!toastInstance) {
        toastInstance = new ToastSystem();
    }
    return toastInstance;
}

// Função helper para uso global
export function toast(message, type = 'info', duration = 4000, title = '') {
    return getToast().show(message, type, duration, title);
}
