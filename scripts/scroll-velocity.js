(function () {
  const separators = Array.from(document.querySelectorAll('[data-scroll-velocity]'));
  if (!separators.length) {
    return;
  }

  const copyCount = 6;
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const states = [];
  let rafId = 0;
  let lastTime = performance.now();
  let lastScrollY = window.scrollY;
  let lastRawVelocity = 0;

  const wrap = (min, max, value) => {
    const range = max - min;
    return (((value - min) % range) + range) % range + min;
  };

  const measureState = (state) => {
    state.copyWidth = state.copyRef ? state.copyRef.offsetWidth : 0;
  };

  const buildCopies = (state) => {
    const template = state.template;
    state.scroller.replaceChildren();

    for (let index = 0; index < copyCount; index += 1) {
      const copy = template.cloneNode(true);
      if (index === 0) {
        state.copyRef = copy;
      }
      state.scroller.appendChild(copy);
    }

    requestAnimationFrame(() => measureState(state));
  };

  separators.forEach((separator, index) => {
    const scroller = separator.querySelector('.scroller');
    const template = scroller ? scroller.querySelector('.scroll-velocity-copy') : null;
    if (!scroller || !template) {
      return;
    }

    const state = {
      root: separator,
      scroller,
      template,
      copyRef: null,
      copyWidth: 0,
      baseX: 0,
      directionFactor: 1,
      baseVelocity: (index % 2 !== 0 ? -1 : 1) * (Number(separator.dataset.velocity) || 60),
      smoothVelocity: 0,
      velocityFactor: 0,
    };

    buildCopies(state);
    states.push(state);
  });

  const renderStatic = () => {
    states.forEach((state) => {
      state.scroller.style.transform = 'translate3d(0, 0, 0)';
    });
  };

  const animate = (now) => {
    const deltaTime = Math.min(0.05, (now - lastTime) / 1000 || 0.016);
    lastTime = now;

    const currentScrollY = window.scrollY;
    const rawScrollVelocity = (currentScrollY - lastScrollY) / deltaTime;
    lastScrollY = currentScrollY;
    lastRawVelocity = rawScrollVelocity;

    states.forEach((state) => {
      if (!state.copyWidth) {
        return;
      }

      state.smoothVelocity += (lastRawVelocity - state.smoothVelocity) * Math.min(1, deltaTime * 8);
      state.velocityFactor += (((state.smoothVelocity / 1000) * 5) - state.velocityFactor) * Math.min(1, deltaTime * 10);

      let moveBy = state.directionFactor * state.baseVelocity * deltaTime;

      if (state.velocityFactor < 0) {
        state.directionFactor = -1;
      } else if (state.velocityFactor > 0) {
        state.directionFactor = 1;
      }

      moveBy += state.directionFactor * moveBy * state.velocityFactor;
      state.baseX += moveBy;

      const position = wrap(-state.copyWidth, 0, state.baseX);
      state.scroller.style.transform = `translate3d(${position}px, 0, 0)`;
    });

    rafId = window.requestAnimationFrame(animate);
  };

  const refresh = () => {
    states.forEach((state) => {
      buildCopies(state);
    });

    if (prefersReducedMotion.matches) {
      renderStatic();
    }
  };

  window.refreshScrollVelocity = refresh;

  const handleMotionChange = () => {
    if (prefersReducedMotion.matches) {
      if (rafId) {
        window.cancelAnimationFrame(rafId);
        rafId = 0;
      }
      renderStatic();
      return;
    }

    if (!rafId) {
      lastTime = performance.now();
      lastScrollY = window.scrollY;
      rafId = window.requestAnimationFrame(animate);
    }
  };

  window.addEventListener('resize', refresh);
  prefersReducedMotion.addEventListener('change', handleMotionChange);
  handleMotionChange();
})();