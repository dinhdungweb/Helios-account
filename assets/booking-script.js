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
  
  window.addEventListener('click', function(event) {
    if (event.target === modal) {
      modal.style.display = 'none';
    }
  });

  let allSlots = {};
  let bookedSlots = {};
  let availableSlots = {};

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
    showModal(false, window.theme.t('an_error_occurred'), window.theme.t('unable_to_load_appointments_please_reload_the_page'));
    return;
  }

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

    if (month === undefined) return true; 

    const bookingDate = new Date(now.getFullYear(), month, day, parseInt(timeParts[0]), parseInt(timeParts[1]));
    
    // Thêm 12 giờ vào thời điểm hiện tại để tạo thời gian tối thiểu có thể đặt lịch
    const minimumBookingTime = new Date(now.getTime() + (12 * 60 * 60 * 1000)); // 12 giờ = 12 * 60 * 60 * 1000 milliseconds
    
    // Trả về true nếu thời gian đặt lịch nhỏ hơn hoặc bằng thời gian tối thiểu (tức là không được phép đặt)
    return bookingDate <= minimumBookingTime;
  } catch (error) {
    console.error('Error parsing date:', error);
    return true;
  }
}

  function formatBookingDate(dateString) {
    const parts = window.theme.bookingDateParts(dateString);
    return parts.weekday + ' ' + parts.dayMonth;
  }

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
      return new Date();
    }
  }

  function getStartOfWeek(date) {
    const dayOfWeek = date.getDay();
    const diff = (dayOfWeek === 0 ? -6 : 1 - dayOfWeek);
    const startOfWeek = new Date(date);
    startOfWeek.setDate(date.getDate() + diff);
    startOfWeek.setHours(0, 0, 0, 0);
    return startOfWeek;
  }

  function getWeekLabel(dateString) {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const slotDate = parseDateKey(dateString);
      const startOfCurrentWeek = getStartOfWeek(today);
      const startOfSlotWeek = getStartOfWeek(slotDate);
      const diffWeeks = Math.floor((startOfSlotWeek - startOfCurrentWeek) / (1000 * 60 * 60 * 24 * 7));
      if (diffWeeks === 0) return window.theme.t('this_week');
      else if (diffWeeks === 1) return window.theme.t('next_week');
      else return window.theme.t('in_weeks', { count: diffWeeks });
    } catch (error) {
      console.error('Error getting week label:', error);
      return window.theme.t('this_week'); // Fallback
    }
  }

  bookButtons.forEach(button => {
    button.addEventListener('click', function () {
      const type = this.getAttribute('data-type');
      if (appointmentTitle) {
        appointmentTitle.textContent = type === 'showroom' ? window.theme.t('book_a_showroom_visit') : window.theme.t('book_an_online_appointment');
      }
      
      if (appointmentOptions) appointmentOptions.style.display = 'none';
      if (scheduleSection) scheduleSection.style.display = 'block';
      
      scheduleGrid.innerHTML = '';

      // Render calendar
      Object.keys(availableSlots)
        .sort((a, b) => parseDateKey(a) - parseDateKey(b))
        .forEach(date => {
          if (!availableSlots[date] || availableSlots[date].length === 0) return;
          
          const weekLabel = getWeekLabel(date);
          const { weekday, dayMonth } = window.theme.bookingDateParts(date);

          const column = document.createElement('div');
          column.classList.add('schedule-column');
          column.innerHTML = `
            <div class="schelude-col-header">
              <h4>${weekLabel}</h4>
              <div class="date-box">
                <div class="weekday">${weekday}</div>
                <div class="day-month">${window.theme.t('date')} ${dayMonth}</div>
              </div>
            </div>
          `;

          let hasAvailableTime = false;
          availableSlots[date].forEach(time => {
            const timeSlot = document.createElement('button');
            timeSlot.classList.add('time-slot');
            timeSlot.textContent = time;

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

          if (hasAvailableTime) {
            scheduleGrid.appendChild(column);
          }
        });
    });
  });

  if (nextButton) {
    nextButton.addEventListener('click', function () {
      if (selectedTimeSlot) {
        if (scheduleSection) scheduleSection.style.display = 'none';
        if (infoSection) infoSection.style.display = 'block';
      } else {
        showModal(false, window.theme.t('no_time_slot_selected'), window.theme.t('please_select_a_time_slot'));
      }
    });
  }

  // Event listener cho form booking
  bookingForm.addEventListener('submit', async function (e) {
    e.preventDefault();
    
    if (!(bookingForm instanceof HTMLFormElement)) {
      console.error('bookingForm is not a valid form element:', bookingForm);
      showModal(false, window.theme.t('system_error_b3af2f'), window.theme.t('unable_to_process_the_form_please_reload_the_page'));
      return;
    }
    
    if (!selectedTimeSlot) {
      showModal(false, window.theme.t('error'), window.theme.t('please_select_a_time_slot_before_submitting_the_form'));
      return;
    }
    
    const formData = new FormData(bookingForm);
  
    const getCheckboxValues = (name) => {
      const checkboxes = bookingForm.querySelectorAll(`input[name="${name}"]:checked`);
      return Array.from(checkboxes).map(cb => cb.value);
    };
    
    const handleOtherField = (checkboxName, inputName) => {
      const checkboxValue = formData.get(checkboxName);
      const inputValue = formData.get(inputName);
      return (checkboxValue && inputValue) ? inputValue.trim() : '';
    };
    
    const productTypes = getCheckboxValues('product_type[]');
    const otherProduct = handleOtherField('product_type_other_check', 'product_type_other');
    if (otherProduct) {
      productTypes.push(`${window.theme.t('other')} ${otherProduct}`);
    }
    
    const needs = getCheckboxValues('needs[]');
    const otherNeeds = handleOtherField('needs_other_check', 'needs_other');
    if (otherNeeds) {
      needs.push(`${window.theme.t('other')} ${otherNeeds}`);
    }
    
    const styles = getCheckboxValues('style[]');
    const collectionStyle = handleOtherField('style_collection_check', 'style_collection');
    if (collectionStyle) {
      styles.push(`${window.theme.t('specific_collection')} ${collectionStyle}`);
    }
    
    const firstName = formData.get('first_name');
    const lastName = formData.get('last_name');
    const phone = formData.get('phone');
    const email = formData.get('email');
    
    if (!firstName || !lastName || !phone || !email) {
      showModal(false, window.theme.t('missing_information'), window.theme.t('please_fill_in_all_required_fields'));
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
        showModal(true, window.theme.t('appointment_booked_successfully'), window.theme.t('helios_has_received_your_booking_check_your_email_for_the_appoin'));
        
        try {
          if (typeof emailjs !== 'undefined') {
            await emailjs.send('service_w0wqg3o', 'booking_confirmation', {
              first_name: data.first_name,
              last_name: data.last_name,
              phone: data.phone,
              email: data.email,
              notes: data.notes,
              date: formatBookingDate(data.date),
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
        showModal(false, window.theme.t('time_slot_unavailable'), window.theme.t('this_time_slot_has_just_been_booked_please_choose_another_time'));
      } else {
        showModal(false, window.theme.t('an_error_occurred'), result.message || window.theme.t('unable_to_book_your_appointment_please_try_again'));
      }
    } catch (error) {
      console.error('Error saving booking:', error);
      showModal(false, window.theme.t('an_error_occurred'), window.theme.t('unable_to_book_your_appointment_please_try_again'));
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
        bookingResults.innerHTML = window.theme.t('please_enter_your_email_html');
        return;
      }

      bookingResults.innerHTML = window.theme.t('looking_for_appointments_html');
      
      try {
        const bookings = await getBookingsByEmail(email);
        
        if (bookings.length === 0) {
          bookingResults.innerHTML = window.theme.t('no_appointments_found_for_this_email_html');
          return;
        }

        const html = bookings.map(booking => `
          <div style="background: #1a1a1a; margin-bottom: 15px; padding: 15px 20px; border: 1px solid #333; text-align: left">
            <p><strong>${window.theme.t('date_312fb1')}</strong> ${formatBookingDate(booking.date)}</p>
            <p><strong>${window.theme.t('time_c28788')}</strong> ${booking.time}</p>
            ${booking.specific_product ? `<p><strong>${window.theme.t('requested_products')}</strong> ${booking.specific_product}</p>` : ''}
            ${booking.product_types && booking.product_types.length ? `<p><strong>${window.theme.t('product_types')}</strong> ${booking.product_types.join(', ')}</p>` : ''}
            ${booking.needs ? `<p><strong>${window.theme.t('needs')}</strong> ${booking.needs}</p>` : ''}
            ${booking.styles ? `<p><strong>${window.theme.t('style')}</strong> ${booking.styles}</p>` : ''}
            ${booking.budget ? `<p><strong>${window.theme.t('budget')}</strong> ${booking.budget}</p>` : ''}
            ${booking.notes ? `<p><strong>${window.theme.t('notes')}</strong> ${booking.notes}</p>` : ''}
          </div>
        `).join('');

        bookingResults.innerHTML = `<h3 style="margin-bottom: 20px;">${window.theme.t('search_results')}</h3>${html}`;

      } catch (err) {
        console.error('Error fetching bookings:', err);
        bookingResults.innerHTML = window.theme.t('unable_to_search_for_appointments_please_try_again_html');
      }
    });
  }
});
