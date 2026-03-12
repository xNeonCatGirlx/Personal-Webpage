(function () {
  const supportsHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  if (!supportsHover) {
    return;
  }

  const roots = Array.from(document.querySelectorAll('[data-target-cursor-root]'));

  roots.forEach((root) => {
    const cursor = root.querySelector('.target-cursor');
    const targets = Array.from(root.querySelectorAll('.cursor-target'));

    if (!cursor || !targets.length) {
      return;
    }

    const state = {
      visible: false,
      targeting: false,
      pointerX: 0,
      pointerY: 0,
      frame: null,
    };

    const writeCursor = (centerX, centerY, width, height, targeting) => {
      cursor.style.setProperty('--cursor-x', `${centerX}px`);
      cursor.style.setProperty('--cursor-y', `${centerY}px`);
      cursor.style.setProperty('--cursor-w', `${width}px`);
      cursor.style.setProperty('--cursor-h', `${height}px`);
      cursor.classList.toggle('is-visible', state.visible);
      cursor.classList.toggle('is-targeting', targeting);
    };

    const queueIdle = () => {
      if (state.frame !== null || !state.visible || state.targeting) {
        return;
      }

      state.frame = requestAnimationFrame(() => {
        state.frame = null;
        writeCursor(state.pointerX, state.pointerY, 28, 28, false);
      });
    };

    const enterRoot = (event) => {
      const rect = root.getBoundingClientRect();
      state.visible = true;
      state.pointerX = event.clientX - rect.left;
      state.pointerY = event.clientY - rect.top;
      writeCursor(state.pointerX, state.pointerY, 28, 28, false);
    };

    const moveRoot = (event) => {
      if (!state.visible || state.targeting) {
        return;
      }

      const rect = root.getBoundingClientRect();
      state.pointerX = event.clientX - rect.left;
      state.pointerY = event.clientY - rect.top;
      queueIdle();
    };

    const leaveRoot = () => {
      state.visible = false;
      state.targeting = false;
      cursor.classList.remove('is-visible', 'is-targeting');
    };

    const targetEnter = (event) => {
      const rootRect = root.getBoundingClientRect();
      const rect = event.currentTarget.getBoundingClientRect();
      const centerX = rect.left - rootRect.left + rect.width / 2;
      const centerY = rect.top - rootRect.top + rect.height / 2;
      state.visible = true;
      state.targeting = true;
      writeCursor(centerX, centerY, rect.width + 18, rect.height + 18, true);
    };

    const targetLeave = () => {
      state.targeting = false;
      queueIdle();
    };

    root.addEventListener('pointerenter', enterRoot);
    root.addEventListener('pointermove', moveRoot);
    root.addEventListener('pointerleave', leaveRoot);

    targets.forEach((target) => {
      target.addEventListener('pointerenter', targetEnter);
      target.addEventListener('pointerleave', targetLeave);
    });
  });
})();