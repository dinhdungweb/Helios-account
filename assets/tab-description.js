 document.addEventListener('DOMContentLoaded', function() {
    const tabs = document.querySelectorAll('.tab-item');
    const panes = document.querySelectorAll('.tab-pane');
    
    tabs.forEach(tab => {
      tab.addEventListener('click', function() {
        // Xóa lớp 'active' khỏi tất cả các tab và tab-pane
        tabs.forEach(t => t.classList.remove('active'));
        panes.forEach(p => p.classList.remove('active'));
        
        // Thêm lớp 'active' vào tab và tab-pane được chọn
        this.classList.add('active');
        const pane = document.querySelector(`#${this.getAttribute('data-tab')}`);
        pane.classList.add('active');
      });
    });
  });

 document.addEventListener('DOMContentLoaded', function () {
    const descriptionContent = document.querySelector('.description-content');
    const toggleButton = document.getElementById('toggle-description');

    if (descriptionContent && toggleButton) {
        // Kiểm tra chiều cao thực tế so với giới hạn
        const maxHeight = 650; // Chiều cao tối đa
        if (descriptionContent.scrollHeight <= maxHeight) {
            toggleButton.style.display = 'none'; // Ẩn nút nếu nội dung ngắn hơn giới hạn
        } else {
            // Lắng nghe sự kiện click để ẩn/hiện nội dung
            toggleButton.addEventListener('click', function () {
                const isExpanded = descriptionContent.classList.contains('expanded');

                if (isExpanded) {
                    descriptionContent.classList.remove('expanded');
                    toggleButton.innerHTML = `<div class="a-bar">Xem thêm <svg class="icon-chevron-down" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16"><path d="M12 15.6L5.1 8.7 6.5 7.3 12 12.8 17.5 7.3 18.9 8.7z"/></svg></div>`;
                } else {
                    descriptionContent.classList.add('expanded');
                    toggleButton.innerHTML = `<div class="a-bar-up">Thu gọn <svg class="icon-chevron-up" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16"><path d="M12 8.4l6.9 6.9-1.4 1.4L12 11.2 6.5 16.7 5.1 15.3z"/></svg></div>`;
                }
            });
        }
    }
});