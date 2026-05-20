(function () {
  const supportsHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  if (!supportsHover) {
    return;
  }

  const roots = Array.from(document.querySelectorAll('[data-target-cursor-root]'));

  roots.forEach((root) => {
    const cursor = root.querySelector('.target-cursor');
    const hasTargets = root.querySelector('.cursor-target');

    if (!cursor || !hasTargets) {
      return;
    }

    root.classList.add('target-cursor-enabled');

    const state = {
      visible: false,
      targeting: false,
      pointerX: 0,
      pointerY: 0,
      pointerClientX: 0,
      pointerClientY: 0,
      frame: null,
      syncFrame: null,
      activeTarget: null,
    };

    const writeCursor = (centerX, centerY, width, height, targeting) => {
      cursor.style.setProperty('--cursor-x', `${centerX}px`);
      cursor.style.setProperty('--cursor-y', `${centerY}px`);
      cursor.style.setProperty('--cursor-w', `${width}px`);
      cursor.style.setProperty('--cursor-h', `${height}px`);
      cursor.classList.toggle('is-visible', state.visible);
      cursor.classList.toggle('is-targeting', targeting);
    };

    const updatePointerFromClient = () => {
      const rect = root.getBoundingClientRect();
      state.pointerX = state.pointerClientX - rect.left;
      state.pointerY = state.pointerClientY - rect.top;
    };

    const syncTarget = () => {
      if (!state.activeTarget) {
        return false;
      }

      const rect = state.activeTarget.getBoundingClientRect();
      const isInside =
        state.pointerClientX >= rect.left &&
        state.pointerClientX <= rect.right &&
        state.pointerClientY >= rect.top &&
        state.pointerClientY <= rect.bottom;

      if (!isInside) {
        state.targeting = false;
        state.activeTarget = null;
        updatePointerFromClient();
        writeCursor(state.pointerX, state.pointerY, 28, 28, false);
        return true;
      }

      const rootRect = root.getBoundingClientRect();
      const centerX = rect.left - rootRect.left + rect.width / 2;
      const centerY = rect.top - rootRect.top + rect.height / 2;
      writeCursor(centerX, centerY, rect.width + 18, rect.height + 18, true);
      return true;
    };

    const scheduleSync = () => {
      if (state.syncFrame !== null) {
        return;
      }

      state.syncFrame = requestAnimationFrame(() => {
        state.syncFrame = null;
        if (!state.visible) {
          return;
        }
        if (state.targeting && syncTarget()) {
          return;
        }
        updatePointerFromClient();
        writeCursor(state.pointerX, state.pointerY, 28, 28, false);
      });
    };

    const queueIdle = () => {
      if (state.frame !== null || !state.visible || state.targeting) {
        return;
      }

      state.frame = requestAnimationFrame(() => {
        state.frame = null;
        updatePointerFromClient();
        writeCursor(state.pointerX, state.pointerY, 28, 28, false);
      });
    };

    const enterRoot = (event) => {
      const rect = root.getBoundingClientRect();
      state.visible = true;
      state.pointerClientX = event.clientX;
      state.pointerClientY = event.clientY;
      state.pointerX = event.clientX - rect.left;
      state.pointerY = event.clientY - rect.top;
      writeCursor(state.pointerX, state.pointerY, 28, 28, false);
    };

    const moveRoot = (event) => {
      if (!state.visible || state.targeting) {
        return;
      }

      const rect = root.getBoundingClientRect();
      state.pointerClientX = event.clientX;
      state.pointerClientY = event.clientY;
      state.pointerX = event.clientX - rect.left;
      state.pointerY = event.clientY - rect.top;
      queueIdle();
    };

    const leaveRoot = () => {
      state.visible = false;
      state.targeting = false;
      state.activeTarget = null;
      cursor.classList.remove('is-visible', 'is-targeting');
    };

    const targetEnter = (target, event) => {
      const rootRect = root.getBoundingClientRect();
      const rect = target.getBoundingClientRect();
      const centerX = rect.left - rootRect.left + rect.width / 2;
      const centerY = rect.top - rootRect.top + rect.height / 2;
      state.visible = true;
      state.targeting = true;
      state.activeTarget = target;
      if (event) {
        state.pointerClientX = event.clientX;
        state.pointerClientY = event.clientY;
      }
      writeCursor(centerX, centerY, rect.width + 18, rect.height + 18, true);
    };

    const targetLeave = () => {
      state.targeting = false;
      state.activeTarget = null;
      updatePointerFromClient();
      queueIdle();
    };

    root.addEventListener('pointerenter', enterRoot);
    root.addEventListener('pointermove', moveRoot);
    root.addEventListener('pointerleave', leaveRoot);

    root.addEventListener('pointerover', (event) => {
      const target = event.target.closest('.cursor-target');
      if (!target || !root.contains(target)) {
        return;
      }
      if (state.activeTarget === target) {
        return;
      }
      targetEnter(target, event);
    });

    root.addEventListener('pointerout', (event) => {
      const target = event.target.closest('.cursor-target');
      if (!target || !root.contains(target)) {
        return;
      }
      if (target.contains(event.relatedTarget)) {
        return;
      }
      if (state.activeTarget !== target) {
        return;
      }
      targetLeave();
    });

    window.addEventListener('scroll', scheduleSync, { passive: true });
    window.addEventListener('resize', scheduleSync);
  });
})();