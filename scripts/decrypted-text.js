(function () {
  const DEFAULT_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+-=[]{}|;:,.<>?/';
  const controllers = new WeakMap();
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  function parseBoolean(value, fallback) {
    if (value == null) return fallback;
    return value === 'true';
  }

  function parseNumber(value, fallback) {
    const parsed = Number.parseInt(value || '', 10);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  function isInViewport(element) {
    const rect = element.getBoundingClientRect();
    return rect.top < window.innerHeight * 0.9 && rect.bottom > 0;
  }

  function buildRevealOrder(text, direction) {
    const indices = [];
    for (let index = 0; index < text.length; index += 1) {
      if (!/\s/.test(text[index])) {
        indices.push(index);
      }
    }

    if (direction === 'end') {
      return indices.reverse();
    }

    if (direction === 'center') {
      const midpoint = (text.length - 1) / 2;
      return indices.sort((left, right) => {
        const leftDistance = Math.abs(left - midpoint);
        const rightDistance = Math.abs(right - midpoint);
        return leftDistance - rightDistance || left - right;
      });
    }

    return indices;
  }

  function getCharacterSource(text, useOriginalCharsOnly) {
    if (!useOriginalCharsOnly) {
      return DEFAULT_CHARS;
    }

    const uniqueChars = Array.from(new Set(text.replace(/\s+/g, ''))).join('');
    return uniqueChars || DEFAULT_CHARS;
  }

  function randomCharacter(source) {
    const index = Math.floor(Math.random() * source.length);
    return source[index] || DEFAULT_CHARS[0];
  }

  class DecryptedTextController {
    constructor(element) {
      this.element = element;
      this.timer = null;
      this.observer = null;
      this.originalText = '';
      this.hasPlayed = false;
      this.isAnimating = false;
      this.ghostLayer = null;
      this.liveLayer = null;
    }

    get options() {
      return {
        speed: parseNumber(this.element.dataset.decryptSpeed, 50),
        maxIterations: parseNumber(this.element.dataset.decryptIterations, 10),
        sequential: parseBoolean(this.element.dataset.decryptSequential, false),
        revealDirection: this.element.dataset.decryptDirection || 'start',
        useOriginalCharsOnly: parseBoolean(this.element.dataset.decryptOriginalCharsOnly, false),
        animateOn: this.element.dataset.decryptAnimateOn || 'view',
      };
    }

    clearTimer() {
      if (this.timer) {
        window.clearTimeout(this.timer);
        this.timer = null;
      }
    }

    disconnectObserver() {
      if (this.observer) {
        this.observer.disconnect();
        this.observer = null;
      }
    }

    ensureLayers() {
      this.element.classList.add('decrypt-text');
      this.element.textContent = '';

      this.ghostLayer = document.createElement('span');
      this.ghostLayer.className = 'decrypt-text__ghost';
      this.ghostLayer.setAttribute('aria-hidden', 'true');

      this.liveLayer = document.createElement('span');
      this.liveLayer.className = 'decrypt-text__live';
      this.liveLayer.setAttribute('aria-hidden', 'true');

      this.element.append(this.ghostLayer, this.liveLayer);
    }

    syncLayers(text) {
      if (!this.ghostLayer || !this.liveLayer) {
        this.ensureLayers();
      }

      this.ghostLayer.textContent = text;
      this.liveLayer.textContent = text;
    }

    renderFrame(revealOrder, revealedCount, characterSource) {
      const revealed = new Set(revealOrder.slice(0, revealedCount));
      const nextText = Array.from(this.originalText, (character, index) => {
        if (/\s/.test(character) || revealed.has(index)) {
          return character;
        }
        return randomCharacter(characterSource);
      }).join('');

      this.liveLayer.textContent = nextText;
    }

    finish() {
      this.clearTimer();
      this.syncLayers(this.originalText);
      this.isAnimating = false;
      this.hasPlayed = true;
      this.disconnectObserver();
    }

    animate() {
      if (!this.originalText || this.isAnimating) {
        return;
      }

      if (reducedMotion.matches) {
        this.finish();
        return;
      }

      this.clearTimer();
      this.isAnimating = true;

      const { sequential, speed, maxIterations, revealDirection, useOriginalCharsOnly } = this.options;
      const revealOrder = buildRevealOrder(this.originalText, revealDirection);
      const characterSource = getCharacterSource(this.originalText, useOriginalCharsOnly);
      const totalSteps = sequential ? revealOrder.length + 1 : Math.max(2, maxIterations + 1);
      let step = 0;

      const tick = () => {
        if (step >= totalSteps) {
          this.finish();
          return;
        }

        const revealedCount = sequential
          ? step
          : Math.floor((step / Math.max(1, totalSteps - 1)) * revealOrder.length);

        this.renderFrame(revealOrder, revealedCount, characterSource);
        step += 1;
        this.timer = window.setTimeout(tick, speed);
      };

      tick();
    }

    ensureObserver() {
      if (this.observer || this.options.animateOn !== 'view') {
        return;
      }

      this.observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting || this.hasPlayed) {
            return;
          }

          this.animate();
        });
      }, {
        threshold: 0.35,
      });

      this.observer.observe(this.element);
    }

    refresh() {
      const wasAnimating = this.isAnimating;
      const liveText = this.element.dataset.decryptSource || this.element.textContent || '';
      const storedSource = this.element.dataset.decryptSource || '';

      if (!wasAnimating && liveText && liveText !== storedSource) {
        this.element.dataset.decryptSource = liveText;
      }

      this.originalText = this.element.dataset.decryptSource || liveText;
      this.element.setAttribute('aria-label', this.originalText);
      this.hasPlayed = false;
      this.isAnimating = false;
      this.clearTimer();
      this.syncLayers(this.originalText);

      if (!this.originalText) {
        this.disconnectObserver();
        return;
      }

      if (this.options.animateOn === 'view') {
        this.ensureObserver();
        if (isInViewport(this.element)) {
          this.animate();
        }
        return;
      }

      this.animate();
    }
  }

  function refreshDecryptedText() {
    const elements = document.querySelectorAll('[data-decrypt]');
    elements.forEach((element) => {
      let controller = controllers.get(element);
      if (!controller) {
        controller = new DecryptedTextController(element);
        controllers.set(element, controller);
      }

      controller.refresh();
    });
  }

  window.refreshDecryptedText = refreshDecryptedText;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', refreshDecryptedText, { once: true });
  } else {
    refreshDecryptedText();
  }
}());