// assets/firebase-operations.js
import { db } from './firebase-init.js';
import { collection, getDocs, addDoc, query, where } from 'https://www.gstatic.com/firebasejs/10.11.0/firebase-firestore.js';

// Lấy danh sách các khung giờ đã được đặt
export async function getBookedSlots() {
  const bookingsSnapshot = await getDocs(collection(db, 'bookings'));
  const bookedSlots = {};
  bookingsSnapshot.forEach(doc => {
    const data = doc.data();
    if (!bookedSlots[data.date]) bookedSlots[data.date] = [];
    bookedSlots[data.date].push(data.time);
  });
  return bookedSlots;
}

// Lấy danh sách khung giờ khả dụng từ collection available_slots
export async function getAvailableSlots() {
  const slotsSnapshot = await getDocs(collection(db, 'available_slots'));
  const allSlots = {};
  slotsSnapshot.forEach(doc => {
    allSlots[doc.id] = doc.data().times;
  });
  return allSlots;
}

// Lưu thông tin đặt lịch
export async function saveBooking(data) {
  try {
    // Truy vấn xem slot này đã có ai đặt chưa
    const bookingsRef = collection(db, 'bookings');
    const q = query(bookingsRef,
      where('date', '==', data.date),
      where('time', '==', data.time)
    );
    const snapshot = await getDocs(q);

    if (!snapshot.empty) {
      // Nếu có ít nhất một bản ghi đã tồn tại slot này
      return { success: false, reason: 'duplicate' };
    }

    await addDoc(bookingsRef, data);
    return { success: true };
  } catch (error) {
    console.error('Error saving booking:', error);
    return { success: false, reason: 'error' };
  }
}

export async function getBookingsByEmail(email) {
  const bookingsRef = collection(db, 'bookings');
  const q = query(bookingsRef, where('email', '==', email));
  const snapshot = await getDocs(q);

  const results = [];
  snapshot.forEach(doc => {
    results.push(doc.data());
  });

  return results;
}
