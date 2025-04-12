let currentUser = null;

document.getElementById('loginForm').addEventListener('submit', function(e) {
  e.preventDefault();
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;
  
  console.log('Attempting login with:', email, password);

  google.script.run.withSuccessHandler(function(user) {
    console.log('Login response:', user);

    if (user && user.id && user.role) {
      currentUser = user;
      document.getElementById('login').style.display = 'none';
      document.getElementById('dashboard').style.display = 'block';
      loadDashboard();
      checkPermissions();
      showNotification('ล็อกอินสำเร็จ!');
    } else {
      alert('ล็อกอินไม่สำเร็จ! กรุณาตรวจสอบอีเมลและรหัสผ่าน');
    }
  }).withFailureHandler(function(error) {
    console.error('Login error:', error);
    alert('เกิดข้อผิดพลาดในการล็อกอิน: ' + error.message);
  }).login(email, password);
});

function logout() {
  google.script.run.logout();
  currentUser = null;
  document.getElementById('login').style.display = 'block';
  document.getElementById('dashboard').style.display = 'none';
  showNotification('ออกจากระบบสำเร็จ!');
}

function showSection(sectionId) {
  document.querySelectorAll('.section').forEach(section => section.style.display = 'none');
  document.getElementById(sectionId).style.display = 'block';
  if (sectionId === 'summary') loadDashboard();
  else if (sectionId === 'employees') loadEmployees();
  else if (sectionId === 'departments') loadDepartments();
  else if (sectionId === 'attendance') loadAttendance();
  else if (sectionId === 'files') loadFiles();
}

function checkPermissions() {
  if (!currentUser || !currentUser.role) {
    alert('ไม่มีสิทธิ์การใช้งาน! โปรดล็อกอินใหม่');
    logout();
    return;
  }

  if (currentUser.role !== 'Admin') {
    if (currentUser.role === 'Executive') {
      document.querySelectorAll('.nav-link').forEach(link => {
        if (link.textContent.includes('จัดการพนักงาน') || link.textContent.includes('จัดการแผนก') || link.textContent.includes('ลงเวลา') || link.textContent.includes('จัดเก็บไฟล์') || link.textContent.includes('Export รายงาน')) {
          link.style.display = 'none';
        }
      });
    } else if (currentUser.role === 'HR') {
      // HR สามารถจัดการพนักงานและลงเวลาได้
    } else if (currentUser.role === 'Employee') {
      document.querySelectorAll('.nav-link').forEach(link => {
        if (!link.textContent.includes('แดชบอร์ด') && !link.textContent.includes('จัดเก็บไฟล์') && !link.textContent.includes('ออกระบบ')) {
          link.style.display = 'none';
        }
      });
    }
  }
}

function loadDashboard() {
  if (!currentUser) {
    alert('กรุณาล็อกอินก่อน!');
    return;
  }

  google.script.run.withSuccessHandler(data => {
    document.getElementById('summaryData').innerHTML = `
      <p>ยอดรวมพนักงาน: ${data.total}</p>
      <p>มาทำงาน: ${data.present}</p>
      <p>ขาด: ${data.absent}</p>
      <p>ป่วย: ${data.sick}</p>
      <p>ลา: ${data.leave}</p>
      <p>นอกสถานที่: ${data.offsite}</p>
    `;
  }).withFailureHandler(error => {
    console.error('Error loading dashboard:', error);
    alert('ไม่สามารถโหลดแดชบอร์ด: ' + error.message);
  }).getSummary();
}

function showNotification(message) {
  const notification = document.getElementById('notifications');
  notification.textContent = message;
  notification.style.display = 'block';
  setTimeout(() => notification.style.display = 'none', 3000);
}

// ฟังก์ชันอื่น ๆ (ยังไม่สมบูรณ์ในตัวอย่างนี้)
function showAddEmployeeForm() { document.getElementById('addEmployeeForm').style.display = 'block'; }
function hideAddEmployeeForm() { document.getElementById('addEmployeeForm').style.display = 'none'; }
