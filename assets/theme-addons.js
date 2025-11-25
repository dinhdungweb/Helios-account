// Xử lý chức năng filter drawer
document.addEventListener('DOMContentLoaded', function() {
  // Các phần tử filter
  const filterButtons = document.querySelectorAll('[data-show-filter]');
  const closeButtons = document.querySelectorAll('[data-close-filter]');
  const filterContainers = document.querySelectorAll('.cc-product-filter');
  const footerButtons = document.querySelectorAll('.footer-button-xs, .footer-button-drawer');
  const body = document.querySelector('body');
  
  // Xử lý nút mở filter (cho cả desktop và mobile)
  filterButtons.forEach(btn => {
    btn.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation();
      
      // Tìm filter container gần nhất
      const filterContainer = this.closest('.cc-product-filter-container').querySelector('.cc-product-filter');
      if (filterContainer) {
        // Thêm class vào body để chặn scroll
        body.classList.add('filter-open');
        
        // Thêm class nav-fade-out vào site-control (giống theme gốc)
        const siteControl = document.querySelector('#site-control');
        if (siteControl) {
          siteControl.classList.add('nav-fade-out');
        }
        
        // Hiển thị filter
        filterContainer.classList.add('-in');
        
        // Ẩn nút mở filter
        const footerBtn = this.closest('.footer-button-xs, .footer-button-drawer');
        if (footerBtn) {
          footerBtn.style.display = 'none';
        }
      }
    });
  });
  
  // Xử lý nút đóng filter (cho cả desktop và mobile)
  closeButtons.forEach(btn => {
    btn.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation();
      
      // Tìm filter container gần nhất
      const filterContainer = this.closest('.cc-product-filter');
      if (filterContainer) {
        // Bỏ class khỏi body để cho phép scroll
        body.classList.remove('filter-open');
        
        // Xóa class nav-fade-out khỏi site-control (giống theme gốc)
        const siteControl = document.querySelector('#site-control');
        if (siteControl) {
          siteControl.classList.remove('nav-fade-out');
        }
        
        // Ẩn filter
        filterContainer.classList.remove('-in');
        
        // Hiển thị lại nút mở filter
        const footerBtn = filterContainer.closest('.cc-product-filter-container').querySelector('.footer-button-xs, .footer-button-drawer');
        if (footerBtn) {
          footerBtn.style.display = 'flex';
        }
      }
    });
  });
  
  // Xử lý sự kiện click bên ngoài filter để đóng
  document.addEventListener('click', function(e) {
    filterContainers.forEach(container => {
      // Nếu filter đang mở và click bên ngoài filter
      if (container.classList.contains('-in') && 
          !container.contains(e.target) && 
          !Array.from(filterButtons).some(btn => btn.contains(e.target))) {
        
        // Bỏ class khỏi body để cho phép scroll
        body.classList.remove('filter-open');
        
        // Xóa class nav-fade-out khỏi site-control (giống theme gốc)
        const siteControl = document.querySelector('#site-control');
        if (siteControl) {
          siteControl.classList.remove('nav-fade-out');
        }
        
        // Ẩn filter
        container.classList.remove('-in');
        
        // Hiển thị lại nút mở filter
        const footerBtn = container.closest('.cc-product-filter-container').querySelector('.footer-button-xs, .footer-button-drawer');
        if (footerBtn) {
          footerBtn.style.display = 'flex';
        }
      }
    });
  });
  
  // Xử lý phím Escape để đóng filter
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
      filterContainers.forEach(container => {
        if (container.classList.contains('-in')) {
          // Bỏ class khỏi body để cho phép scroll
          body.classList.remove('filter-open');
          
          // Xóa class nav-fade-out khỏi site-control (giống theme gốc)
          const siteControl = document.querySelector('#site-control');
          if (siteControl) {
            siteControl.classList.remove('nav-fade-out');
          }
          
          // Ẩn filter
          container.classList.remove('-in');
          
          // Hiển thị lại nút mở filter
          const footerBtn = container.closest('.cc-product-filter-container').querySelector('.footer-button-xs, .footer-button-drawer');
          if (footerBtn) {
            footerBtn.style.display = 'flex';
          }
        }
      });
    }
  });
}); 