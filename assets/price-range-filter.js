// Khởi tạo event listeners cho các radio button của khoảng giá
function initPriceRangeFilters() {
  var priceRangeRadios = document.querySelectorAll('.custom-price-range-filter input[type="radio"]');
  
  priceRangeRadios.forEach(function(radio) {
    radio.addEventListener('change', handlePriceRangeChange);
  });
}

// Xử lý sự kiện khi radio button thay đổi
function handlePriceRangeChange() {
  // Lấy các input của thanh lọc giá
  var minInput = document.getElementById('CCPriceRangeMin');
  var maxInput = document.getElementById('CCPriceRangeMax');
  
  if (!minInput || !maxInput) return;
  
  if (this.hasAttribute('data-min-value') && this.hasAttribute('data-max-value')) {
    // Đặt giá trị cho input min và max khi có cả hai
    minInput.value = this.getAttribute('data-min-value');
    maxInput.value = this.getAttribute('data-max-value');
  } 
  else if (this.hasAttribute('data-min-value') && this.hasAttribute('data-max-clear')) {
    // Trường hợp đặc biệt: "Trên X" - đặt min và xóa max
    minInput.value = this.getAttribute('data-min-value');
    maxInput.value = '';
  }
  else if (this.name.includes('min')) {
    // Nếu là giá trị tối thiểu
    minInput.value = this.value;
    
    // Nếu là kiểu "Trên X", reset giá trị max
    if (this.hasAttribute('data-max-clear')) {
      maxInput.value = '';
    }
  } 
  else if (this.name.includes('max')) {
    // Nếu là giá trị tối đa
    maxInput.value = this.value;
  }
  
  // Kích hoạt sự kiện change cho cả hai input để form được submit
  minInput.dispatchEvent(new Event('change', { bubbles: true }));
  maxInput.dispatchEvent(new Event('change', { bubbles: true }));
}

// Sử dụng event delegation để lắng nghe sự kiện từ bất kỳ radio button nào được thêm vào DOM
document.addEventListener('click', function(e) {
  // Kiểm tra xem phần tử được click có phải là radio button trong custom-price-range-filter không
  if (e.target && e.target.matches('.custom-price-range-filter input[type="radio"]')) {
    handlePriceRangeChange.call(e.target);
  }
});

// Khởi tạo khi DOM đã sẵn sàng
document.addEventListener('DOMContentLoaded', initPriceRangeFilters);

// Theo dõi thay đổi AJAX và khởi tạo lại bộ lọc khi cần
// Đây là cách theo dõi chung, có thể cần điều chỉnh tùy thuộc vào cách theme của bạn xử lý AJAX
document.addEventListener('shopify:section:load', initPriceRangeFilters);

// Theo dõi sự kiện tùy chỉnh của theme
if (typeof theme !== 'undefined') {
  // Cho theme Shopify - cần điều chỉnh tùy theo theme cụ thể
  document.addEventListener('theme:loading:end', initPriceRangeFilters);
}

// Dùng MutationObserver để phát hiện thay đổi DOM
(function() {
  var priceRangeObserver = new MutationObserver(function(mutations) {
    mutations.forEach(function(mutation) {
      if (mutation.addedNodes && mutation.addedNodes.length > 0) {
        // Kiểm tra nếu có custom-price-range-filter được thêm vào DOM
        for (var i = 0; i < mutation.addedNodes.length; i++) {
          var node = mutation.addedNodes[i];
          if (node.nodeType === 1) { // ELEMENT_NODE
            if (node.classList && node.classList.contains('custom-price-range-filter') || 
                node.querySelector && node.querySelector('.custom-price-range-filter')) {
              initPriceRangeFilters();
              break;
            }
          }
        }
      }
    });
  });

  // Bắt đầu theo dõi thay đổi DOM
  priceRangeObserver.observe(document.body, {
    childList: true,
    subtree: true
  });
})(); 