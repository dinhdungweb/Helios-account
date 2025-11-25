import { getBookedSlots, getAvailableSlots, saveBooking, getBookingsByEmail } from './firebase-operations.js';

document.addEventListener('DOMContentLoaded', async function () {
  const bookButtons = document.querySelectorAll('.book-btn');
  const appointmentOptions = document.querySelector('.appointment-options');
  const scheduleSection = document.querySelector('.schedule-section');
  const infoSection = document.querySelector('.info-section');
  const appointmentTitle = document.querySelector('#appointment-title');
  const scheduleGrid = document.querySelector('.schedule-grid');
  const nextButton = document.querySelector('#next-to-info');
  const bookingForm = document.querySelector('#booking-form');
  const modal = document.getElementById('booking-modal');
  const modalTitle = document.getElementById('modal-title');
  const modalMessage = document.getElementById('modal-message');
  const modalButton = document.getElementById('modal-button');
  const modalSuccessIcon = document.getElementById('modal-success-icon');
  const modalErrorIcon = document.getElementById('modal-error-icon');
  const closeModalBtn = document.querySelector('.close-modal');
  let selectedTimeSlot = null;

  // Hàm hiển thị modal thông báo
  function showModal(isSuccess, title, message) {
    if (!modal || !modalTitle || !modalMessage) {
      console.error('Modal elements not found');
      alert(`${title}: ${message}`); // Fallback
      return;
    }

    modalTitle.textContent = title;
    modalMessage.textContent = message;
    
    // Hiển thị icon phù hợp
    if (modalSuccessIcon && modalErrorIcon) {
      if (isSuccess) {
        modalSuccessIcon.style.display = 'block';
        modalErrorIcon.style.display = 'none';
      } else {
        modalSuccessIcon.style.display = 'none';
        modalErrorIcon.style.display = 'block';
      }
    }
    
    // Hiển thị modal
    modal.style.display = 'block';
  }
  
  // Event listeners cho modal
  if (closeModalBtn) {
    closeModalBtn.addEventListener('click', function() {
      modal.style.display = 'none';
    });
  }
  
  if (modalButton) {
    modalButton.addEventListener('click', function() {
      modal.style.display = 'none';
    });
  }
  
  // Đóng modal khi nhấn bên ngoài modal
  window.addEventListener('click', function(event) {
    if (event.target === modal) {
      modal.style.display = 'none';
    }
  });

  let allSlots = {};
  let bookedSlots = {};
  let availableSlots = {};

  // Load dữ liệu slots với error handling
  try {
    console.log('Loading slots data...');
    allSlots = await getAvailableSlots();
    bookedSlots = await getBookedSlots();
    availableSlots = { ...allSlots };

    Object.keys(availableSlots).forEach(date => {
      if (bookedSlots[date]) {
        availableSlots[date] = availableSlots[date].filter(time => !bookedSlots[date].includes(time));
      }
    });
    console.log('Slots data loaded successfully');
  } catch (error) {
    console.error('Error loading slots:', error);
    showModal(false, 'Đã xảy ra lỗi', 'Không thể tải danh sách lịch hẹn. Vui lòng tải lại trang.');
    return;
  }

  // Hàm kiểm tra thời gian đã qua chưa - yêu cầu đặt lịch trước ít nhất 12 giờ
function isTimeExpired(dateString, timeString) {
  try {
    const now = new Date();
    const dateParts = dateString.split(' ');
    const timeParts = timeString.split(':');

    const day = parseInt(dateParts[3]);
    const monthMap = {
      Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
      Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11
    };
    const month = monthMap[dateParts[2]];

    if (month === undefined) return true; // Nếu không parse được thì coi như đã qua

    const bookingDate = new Date(now.getFullYear(), month, day, parseInt(timeParts[0]), parseInt(timeParts[1]));
    
    // Thêm 12 giờ vào thời điểm hiện tại để tạo thời gian tối thiểu có thể đặt lịch
    const minimumBookingTime = new Date(now.getTime() + (12 * 60 * 60 * 1000)); // 12 giờ = 12 * 60 * 60 * 1000 milliseconds
    
    // Trả về true nếu thời gian đặt lịch nhỏ hơn hoặc bằng thời gian tối thiểu (tức là không được phép đặt)
    return bookingDate <= minimumBookingTime;
  } catch (error) {
    console.error('Error parsing date:', error);
    return true; // Nếu có lỗi thì coi như đã qua để an toàn
  }
}

  // Hàm chuyển đổi ngày sang tiếng Việt
  function formatDateToVietnamese(dateString) {
    try {
      const parts = dateString.split(' ');
      const dayOfWeek = `${parts[0]} ${parts[1]}`;
      const month = parts[2];
      const day = parts[3];
      const monthMap = {
        Jan: 'Tháng 1', Feb: 'Tháng 2', Mar: 'Tháng 3', Apr: 'Tháng 4',
        May: 'Tháng 5', Jun: 'Tháng 6', Jul: 'Tháng 7', Aug: 'Tháng 8',
        Sep: 'Tháng 9', Oct: 'Tháng 10', Nov: 'Tháng 11', Dec: 'Tháng 12'
      };
      return `${dayOfWeek} ${day} ${monthMap[month] || month}`;
    } catch (error) {
      console.error('Error formatting date:', error);
      return dateString; // Fallback
    }
  }

  // Hàm phân tích ngày thành Date object
  function parseDateKey(dateString) {
    try {
      const parts = dateString.split(' ');
      const day = parseInt(parts[3]);
      const monthMap = {
        Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
        Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11
      };
      const month = monthMap[parts[2]];
      const year = new Date().getFullYear();
      return new Date(year, month, day);
    } catch (error) {
      console.error('Error parsing date key:', error);
      return new Date(); // Fallback to current date
    }
  }

  // Hàm lấy ngày bắt đầu tuần
  function getStartOfWeek(date) {
    const dayOfWeek = date.getDay();
    const diff = (dayOfWeek === 0 ? -6 : 1 - dayOfWeek);
    const startOfWeek = new Date(date);
    startOfWeek.setDate(date.getDate() + diff);
    startOfWeek.setHours(0, 0, 0, 0);
    return startOfWeek;
  }

  // Hàm tính nhãn tuần
  function getWeekLabel(dateString) {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const slotDate = parseDateKey(dateString);
      const startOfCurrentWeek = getStartOfWeek(today);
      const startOfSlotWeek = getStartOfWeek(slotDate);
      const diffWeeks = Math.floor((startOfSlotWeek - startOfCurrentWeek) / (1000 * 60 * 60 * 24 * 7));
      if (diffWeeks === 0) return 'Tuần Này';
      else if (diffWeeks === 1) return 'Tuần Sau';
      else return `Trong ${diffWeeks} Tuần`;
    } catch (error) {
      console.error('Error getting week label:', error);
      return 'Tuần Này'; // Fallback
    }
  }

  // Event listener cho nút đặt lịch
  bookButtons.forEach(button => {
    button.addEventListener('click', function () {
      const type = this.getAttribute('data-type');
      if (appointmentTitle) {
        appointmentTitle.textContent = type === 'showroom' ? 'Đặt Lịch Showroom' : 'Đặt Lịch Hẹn Trực Tuyến';
      }
      
      if (appointmentOptions) appointmentOptions.style.display = 'none';
      if (scheduleSection) scheduleSection.style.display = 'block';
      
      scheduleGrid.innerHTML = '';

      // Render calendar
      Object.keys(availableSlots)
        .sort((a, b) => parseDateKey(a) - parseDateKey(b))
        .forEach(date => {
          if (!availableSlots[date] || availableSlots[date].length === 0) return;
          
          const formattedDate = formatDateToVietnamese(date);
          const weekLabel = getWeekLabel(date);

          const parts = formattedDate.split(' ');
          const weekday = parts.slice(0, 2).join(' ');
          const dayMonth = parts.slice(2).join(' ');

          const column = document.createElement('div');
          column.classList.add('schedule-column');
          column.innerHTML = `
            <div class="schelude-col-header">
              <h4>${weekLabel}</h4>
              <div class="date-box">
                <div class="weekday">${weekday}</div>
                <div class="day-month">Ngày ${dayMonth}</div>
              </div>
            </div>
          `;

          let hasAvailableTime = false;
          availableSlots[date].forEach(time => {
            const timeSlot = document.createElement('button');
            timeSlot.classList.add('time-slot');
            timeSlot.textContent = time;

            // Kiểm tra xem thời gian đã qua chưa và ẩn nếu đã qua
            if (isTimeExpired(date, time)) {
              timeSlot.style.display = 'none';
            } else {
              hasAvailableTime = true;
              timeSlot.addEventListener('click', function () {
                document.querySelectorAll('.time-slot').forEach(slot => slot.classList.remove('selected'));
                this.classList.add('selected');
                selectedTimeSlot = { date, time };
              });
            }

            column.appendChild(timeSlot);
          });

          // Chỉ thêm cột nếu có khung giờ khả dụng
          if (hasAvailableTime) {
            scheduleGrid.appendChild(column);
          }
        });
    });
  });

  // Event listener cho nút tiếp tục
  if (nextButton) {
    nextButton.addEventListener('click', function () {
      if (selectedTimeSlot) {
        if (scheduleSection) scheduleSection.style.display = 'none';
        if (infoSection) infoSection.style.display = 'block';
      } else {
        showModal(false, 'Chưa chọn khung giờ', 'Vui lòng chọn một khung giờ.');
      }
    });
  }

  // Event listener cho form booking
  bookingForm.addEventListener('submit', async function (e) {
    e.preventDefault();
    
    // Kiểm tra xem bookingForm có phải là HTMLFormElement không
    if (!(bookingForm instanceof HTMLFormElement)) {
      console.error('bookingForm is not a valid form element:', bookingForm);
      showModal(false, 'Lỗi hệ thống', 'Không thể xử lý form. Vui lòng tải lại trang.');
      return;
    }
    
    // Kiểm tra selectedTimeSlot
    if (!selectedTimeSlot) {
      showModal(false, 'Lỗi', 'Vui lòng chọn khung giờ trước khi gửi form.');
      return;
    }
    
    const formData = new FormData(bookingForm);
    
    // Lấy các checkbox đã chọn - sử dụng cách an toàn hơn
    const getCheckboxValues = (name) => {
      const checkboxes = bookingForm.querySelectorAll(`input[name="${name}"]:checked`);
      return Array.from(checkboxes).map(cb => cb.value);
    };
    
    // Xử lý các trường "Khác" - kiểm tra null/undefined
    const handleOtherField = (checkboxName, inputName) => {
      const checkboxValue = formData.get(checkboxName);
      const inputValue = formData.get(inputName);
      return (checkboxValue === 'Khác' && inputValue) ? inputValue.trim() : '';
    };
    
    // Xử lý dữ liệu sản phẩm
    const productTypes = getCheckboxValues('product_type[]');
    const otherProduct = handleOtherField('product_type_other_check', 'product_type_other');
    if (otherProduct) {
      productTypes.push(`Khác: ${otherProduct}`);
    }
    
    // Xử lý dữ liệu nhu cầu
    const needs = getCheckboxValues('needs[]');
    const otherNeeds = handleOtherField('needs_other_check', 'needs_other');
    if (otherNeeds) {
      needs.push(`Khác: ${otherNeeds}`);
    }
    
    // Xử lý dữ liệu phong cách
    const styles = getCheckboxValues('style[]');
    const collectionStyle = handleOtherField('style_collection_check', 'style_collection');
    if (collectionStyle) {
      styles.push(`Theo BST cụ thể: ${collectionStyle}`);
    }
    
    // Kiểm tra dữ liệu bắt buộc
    const firstName = formData.get('first_name');
    const lastName = formData.get('last_name');
    const phone = formData.get('phone');
    const email = formData.get('email');
    
    if (!firstName || !lastName || !phone || !email) {
      showModal(false, 'Thiếu thông tin', 'Vui lòng điền đầy đủ các trường bắt buộc (*).');
      return;
    }
    
    const data = {
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      phone: (formData.get('country_code') || '+84') + phone.trim(),
      email: email.trim(),
      notes: formData.get('notes') || '',
      date: selectedTimeSlot.date,
      time: selectedTimeSlot.time,
      // Thêm các trường mới
      specific_product: formData.get('specific_product') || '',
      product_types: productTypes,
      needs: needs,
      styles: styles,
      budget: formData.get('budget') || ''
    };

    try {
      console.log('Saving booking...', data);
      const result = await saveBooking(data);
      
      if (result.success) {
        showModal(true, 'BẠN ĐÃ ĐẶT LỊCH THÀNH CÔNG', 'Helios đã nhận được thông tin đăng ký từ bạn – Đừng quên kiểm tra email để xem lại chi tiết cuộc hẹn!');
        
        // Gửi email xác nhận
        try {
          if (typeof emailjs !== 'undefined') {
            await emailjs.send('service_w0wqg3o', 'booking_confirmation', {
              first_name: data.first_name,
              last_name: data.last_name,
              phone: data.phone,
              email: data.email,
              notes: data.notes,
              date: formatDateToVietnamese(data.date),
              time: data.time,
              specific_product: data.specific_product,
              product_types: data.product_types.join(', '),
              needs: data.needs.join(', '),
              styles: data.styles.join(', '),
              budget: data.budget
            });
            console.log('Email sent successfully');
          }
        } catch (emailError) {
          console.warn('Email sending failed:', emailError);
          // Không hiển thị lỗi email cho user vì booking đã thành công
        }
        
        // Reset form và UI
        bookingForm.reset();
        if (infoSection) infoSection.style.display = 'none';
        if (appointmentOptions) appointmentOptions.style.display = 'flex';
        selectedTimeSlot = null;

        // Cập nhật lại danh sách slots
        try {
          bookedSlots = await getBookedSlots();
          availableSlots = { ...allSlots };
          Object.keys(availableSlots).forEach(date => {
            if (bookedSlots[date]) {
              availableSlots[date] = allSlots[date].filter(time => !bookedSlots[date].includes(time));
            }
          });
        } catch (updateError) {
          console.warn('Error updating slots:', updateError);
        }
      } else if (result.reason === 'duplicate') {
        showModal(false, 'Khung giờ không khả dụng', 'Khung giờ này vừa được đặt. Vui lòng chọn một khung giờ khác.');
      } else {
        showModal(false, 'Đã xảy ra lỗi', result.message || 'Lỗi khi đặt lịch hẹn. Vui lòng thử lại.');
      }
    } catch (error) {
      console.error('Error saving booking:', error);
      showModal(false, 'Đã xảy ra lỗi', 'Lỗi khi đặt lịch hẹn. Vui lòng thử lại.');
    }
  });

  // Xử lý tra cứu lịch hẹn
  const lookupForm = document.querySelector('#lookup-form');
  const bookingResults = document.querySelector('#booking-results');

  if (lookupForm && bookingResults) {
    lookupForm.addEventListener('submit', async function (e) {
      e.preventDefault();
      const emailInput = lookupForm.querySelector('input[name="lookup_email"]');
      if (!emailInput) return;
      
      const email = emailInput.value.trim();
      if (!email) {
        bookingResults.innerHTML = '<p>Vui lòng nhập email.</p>';
        return;
      }

      bookingResults.innerHTML = '<p>Đang tìm lịch hẹn...</p>';
      
      try {
        const bookings = await getBookingsByEmail(email);
        
        if (bookings.length === 0) {
          bookingResults.innerHTML = '<p>Không tìm thấy lịch hẹn nào với email này.</p>';
          return;
        }

        const html = bookings.map(booking => `
          <div style="background: #1a1a1a; margin-bottom: 15px; padding: 15px 20px; border: 1px solid #333; text-align: left">
            <p><strong>Ngày:</strong> ${formatDateToVietnamese(booking.date)}</p>
            <p><strong>Giờ:</strong> ${booking.time}</p>
            ${booking.specific_product ? `<p><strong>Sản phẩm muốn xem:</strong> ${booking.specific_product}</p>` : ''}
            ${booking.product_types && booking.product_types.length ? `<p><strong>Loại sản phẩm:</strong> ${booking.product_types.join(', ')}</p>` : ''}
            ${booking.needs ? `<p><strong>Nhu cầu:</strong> ${booking.needs}</p>` : ''}
            ${booking.styles ? `<p><strong>Phong cách:</strong> ${booking.styles}</p>` : ''}
            ${booking.budget ? `<p><strong>Ngân sách:</strong> ${booking.budget}</p>` : ''}
            ${booking.notes ? `<p><strong>Ghi chú:</strong> ${booking.notes}</p>` : ''}
          </div>
        `).join('');

        bookingResults.innerHTML = `<h3 style="margin-bottom: 20px;">Kết quả tra cứu:</h3>${html}`;

      } catch (err) {
        console.error('Error fetching bookings:', err);
        bookingResults.innerHTML = '<p>Đã xảy ra lỗi khi tìm kiếm lịch hẹn. Vui lòng thử lại.</p>';
      }
    });
  }
});