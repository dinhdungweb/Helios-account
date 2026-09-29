if (!customElements.get('product-description-tabs')) {
  class ProductDescriptionTabs extends HTMLElement {
    connectedCallback() {
      if (this.isInitialized) return;

      this.isInitialized = true;
      this.tabs = Array.from(this.querySelectorAll('[role="tab"]'));
      this.panels = Array.from(this.querySelectorAll('[role="tabpanel"]'));
      this.description = this.querySelector('[data-description-content]');
      this.descriptionInner = this.querySelector('[data-description-inner]');
      this.toggle = this.querySelector('[data-description-toggle]');
      this.expandLabel = this.querySelector('[data-expand-label]');
      this.collapseLabel = this.querySelector('[data-collapse-label]');
      this.collapsedHeight = Number.parseInt(this.dataset.collapsedHeight, 10) || 350;

      this.tabs.forEach((tab, index) => {
        tab.addEventListener('click', () => this.selectTab(tab));
        tab.addEventListener('keydown', (event) => this.handleTabKeydown(event, index));
      });

      if (!this.description || !this.descriptionInner || !this.toggle) return;

      this.toggle.addEventListener('click', () => this.toggleDescription());
      this.updateOverflow = this.updateOverflow.bind(this);

      if ('ResizeObserver' in window) {
        this.resizeObserver = new ResizeObserver(this.updateOverflow);
        this.resizeObserver.observe(this.descriptionInner);
      } else {
        window.addEventListener('resize', this.updateOverflow);
      }

      this.descriptionInner.querySelectorAll('img').forEach((image) => {
        if (!image.complete) image.addEventListener('load', this.updateOverflow, { once: true });
      });

      if (document.fonts && document.fonts.ready) {
        document.fonts.ready.then(this.updateOverflow);
      }

      requestAnimationFrame(this.updateOverflow);
    }

    disconnectedCallback() {
      if (this.resizeObserver) this.resizeObserver.disconnect();
      if (this.updateOverflow) window.removeEventListener('resize', this.updateOverflow);
    }

    selectTab(selectedTab) {
      const selectedName = selectedTab.dataset.tab;

      this.tabs.forEach((tab) => {
        const isSelected = tab === selectedTab;
        tab.classList.toggle('is-active', isSelected);
        tab.setAttribute('aria-selected', String(isSelected));
        tab.tabIndex = isSelected ? 0 : -1;
      });

      this.panels.forEach((panel) => {
        panel.hidden = panel.dataset.panel !== selectedName;
      });
    }

    handleTabKeydown(event, currentIndex) {
      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;

      event.preventDefault();
      let nextIndex = currentIndex;

      if (event.key === 'ArrowRight') nextIndex = (currentIndex + 1) % this.tabs.length;
      if (event.key === 'ArrowLeft') nextIndex = (currentIndex - 1 + this.tabs.length) % this.tabs.length;
      if (event.key === 'Home') nextIndex = 0;
      if (event.key === 'End') nextIndex = this.tabs.length - 1;

      this.selectTab(this.tabs[nextIndex]);
      this.tabs[nextIndex].focus();
    }

    updateOverflow() {
      const naturalHeight = this.description.scrollHeight;
      const isOverflowing = Math.ceil(naturalHeight) > this.collapsedHeight + 1;

      this.classList.toggle('is-collapsible', isOverflowing);
      this.toggle.hidden = !isOverflowing;

      if (!isOverflowing) {
        this.setExpanded(false);
      }
    }

    toggleDescription() {
      this.setExpanded(!this.classList.contains('is-expanded'));
    }

    setExpanded(isExpanded) {
      this.classList.toggle('is-expanded', isExpanded);
      this.toggle.setAttribute('aria-expanded', String(isExpanded));
      this.expandLabel.hidden = isExpanded;
      this.collapseLabel.hidden = !isExpanded;
    }
  }

  customElements.define('product-description-tabs', ProductDescriptionTabs);
}
