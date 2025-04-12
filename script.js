let currentUser = null;

document.getElementById('loginForm').addEventListener('submit', function(e) {
  e.preventDefault();
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;
  google.script.run.withSuccessHandler(user => {
    if (user) {
      currentUser = user;
      document.getElementById('login').style.display = 'none';
      document.getElementById('dashboard').style.display = 'block';
      loadDashboard();
      checkPermissions();
    } else {
      alert('ล็อกอินไม่สำเร็จ!');
    }
  }).login(email, password);
});

function logout() {
  google.script.run.logout();
  currentUser = null;
  document.getElementById('login').style.display = 'block';
  document.getElementById('dashboard').style.display = 'none';
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
      // พนักงานทั่วไปเห็นเฉพาะข้อมูลตัวเอง
      document.querySelectorAll('.nav-link').forEach(link => {
        if (!link.textContent.includes('แดชบอร์ด') && !link.textContent.includes('จัดเก็บไฟล์') && !link.textContent.includes('ออกระบบ')) {
          link.style.display = 'none';
        }
      });
    }
  }
}

function loadDashboard() {
  google.script.run.withSuccessHandler(data => {
    document.getElementById('summaryData').innerHTML = `
      <p>ยอดรวมพนักงาน: ${data.total}</p>
      <p>มาทำงาน: ${data.present}</p>
      <p>ขาด: ${data.absent}</p>
      <p>ป่วย: ${data.sick}</p>
      <p>ลา: ${data.leave}</p>
      <p>นอกสถานที่: ${data.offsite}</p>
    `;
  }).getSummary();
}

function showAddEmployeeForm() {
  document.getElementById('addEmployeeForm').style.display = 'block';
}

function hideAddEmployeeForm() {
  document.getElementById('addEmployeeForm').style.display = 'none';
}

document.getElementById('employeeForm').addEventListener('submit', function(e) {
  e.preventDefault();
  const formData = new FormData(this);
  google.script.run.withSuccessHandler(() => {
    alert('บันทึกข้อมูลพนักงานสำเร็จ!');
    hideAddEmployeeForm();
    loadEmployees();
  }).saveEmployee(Object.fromEntries(formData));
});

function previewImage(event) {
  const file = event.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = function(e) {
      google.script.run.saveFile(file).withSuccessHandler(url => {
        document.getElementsByName('photo')[0].value = url;
      });
    };
    reader.readAsDataURL(file);
  }
}

// ฟังก์ชันอื่นๆ เช่น loadEmployees, loadDepartments, recordAttendance, uploadFile, exportReport สามารถขยายได้ตามความต้องการ
