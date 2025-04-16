new Vue({
  el: '#app',
  data: {
    isLoggedIn: false,
    email: '',
    password: '',
    userRole: '',
    currentPage: 'dashboard',
    isSidebarOpen: false,
    errorMessage: '',
    isAttendanceLoaded: false,
    dashboardData: { 
      totalEmployees: 0, 
      present: 0, 
      absent: 0, 
      leave: 0, 
      sick: 0, 
      out: 0, 
      absentEmployees: [], 
      status: {} 
    },
    employees: [],
    departments: [],
    attendanceRecords: [],
    newEmployee: { 
      name: '', 
      position: '', 
      department: '', 
      photo: '', 
      documents: '', 
      preview: '',
      nickname: '',
      birthdate: '',
      address: '',
      education: '',
      phone: '',
      lineId: ''
    },
    editingEmployee: null,
    employeeToDelete: null,
    newDepartment: {
      name: ''
    },
    editingDepartment: null,
    departmentToDelete: null,
    newAttendance: {
      employeeId: '',
      status: '',
      date: new Date().toISOString().split('T')[0]
    },
    editingAttendance: null,
    attendanceToDelete: null,
    employeeSearchQuery: '',
    searchQuery: '',
    attendanceSearchQuery: '',
    newUser: { 
      email: '', 
      password: '', 
      role: 'employee' 
    },
    chart: null,
    fileToUpload: { 
      photo: null, 
      document: null, 
      editPhoto: null, 
      editDocument: null 
    }
  },
  computed: {
    filteredEmployees() {
      const query = this.currentPage === 'manage' ? this.employeeSearchQuery : this.searchQuery;
      return this.employees.filter(emp =>
        emp.name.toLowerCase().includes(query.toLowerCase()) ||
        emp.position.toLowerCase().includes(query.toLowerCase()) ||
        emp.department.toLowerCase().includes(query.toLowerCase()) ||
        (emp.nickname || '').toLowerCase().includes(query.toLowerCase()) ||
        (emp.address || '').toLowerCase().includes(query.toLowerCase()) ||
        (emp.education || '').toLowerCase().includes(query.toLowerCase()) ||
        (emp.phone || '').toLowerCase().includes(query.toLowerCase()) ||
        (emp.lineId || '').toLowerCase().includes(query.toLowerCase())
      );
    },
    filteredAttendance() {
      if (!Array.isArray(this.attendanceRecords)) {
        return [];
      }
      return this.attendanceRecords.filter(record => {
        const employeeName = this.getEmployeeName(record.employeeId) || '';
        const status = this.translateStatus(record.status) || '';
        const date = this.formatDate(record.date) || '';
        const query = (this.attendanceSearchQuery || '').toLowerCase();
        return (
          employeeName.toLowerCase().includes(query) ||
          status.toLowerCase().includes(query) ||
          date.toLowerCase().includes(query)
        );
      });
    }
  },
  methods: {
    toggleSidebar() {
      this.isSidebarOpen = !this.isSidebarOpen;
    },
    changePage(page) {
      if (this.chart && this.currentPage === 'dashboard' && page !== 'dashboard') {
        this.chart.destroy();
        this.chart = null;
      }
      this.currentPage = page;
      this.isSidebarOpen = false;
      if (page === 'dashboard') {
        this.loadDashboard();
      } else if (page === 'departments') {
        this.loadDepartments();
      } else if (page === 'attendance') {
        this.isAttendanceLoaded = false;
        this.loadAttendance();
      }
    },
    login() {
      google.script.run
        .withSuccessHandler(result => {
          if (result.success) {
            this.isLoggedIn = true;
            this.userRole = result.role;
            this.errorMessage = '';
            this.loadEmployees();
            this.loadDepartments();
            this.loadAttendance();
            if (this.currentPage === 'dashboard') {
              this.loadDashboard();
            }
          } else {
            this.errorMessage = result.message + ' กรุณาตรวจสอบอีเมลและรหัสผ่าน';
          }
        })
        .withFailureHandler(err => {
          this.errorMessage = 'เกิดข้อผิดพลาดในการเชื่อมต่อ: ' + err.message;
        })
        .login(this.email, this.password);
    },
    logout() {
      if (this.chart) {
        this.chart.destroy();
        this.chart = null;
      }
      this.isLoggedIn = false;
      this.email = '';
      this.password = '';
      this.userRole = '';
      this.currentPage = 'dashboard';
      this.errorMessage = '';
      this.isAttendanceLoaded = false;
    },
    loadDashboard() {
      google.script.run
        .withSuccessHandler(data => {
          this.dashboardData = data;
          if (this.currentPage === 'dashboard') {
            this.$nextTick(() => {
              this.renderChart();
            });
          }
        })
        .withFailureHandler(err => {
          this.errorMessage = 'เกิดข้อผิดพลาดในการโหลดข้อมูลแดชบอร์ด: ' + err.message;
        })
        .getDashboardData();
    },
    loadEmployees() {
      google.script.run
        .withSuccessHandler(data => {
          this.employees = data;
        })
        .getEmployees();
    },
    loadDepartments() {
      google.script.run
        .withSuccessHandler(data => {
          this.departments = data;
        })
        .getDepartments();
    },
    loadAttendance() {
      if (this.employees.length === 0) {
        google.script.run
          .withSuccessHandler(data => {
            this.employees = data;
            this.fetchAttendanceRecords();
          })
          .withFailureHandler(err => {
            this.errorMessage = 'เกิดข้อผิดพลาดในการโหลดข้อมูลพนักงาน: ' + err.message;
            this.isAttendanceLoaded = true;
          })
          .getEmployees();
      } else {
        this.fetchAttendanceRecords();
      }
    },
    fetchAttendanceRecords() {
      google.script.run
        .withSuccessHandler(data => {
          this.attendanceRecords = Array.isArray(data) ? data : [];
          this.isAttendanceLoaded = true;
        })
        .withFailureHandler(err => {
          this.errorMessage = 'เกิดข้อผิดพลาดในการโหลดข้อมูลการลงเวลา: ' + err.message;
          this.attendanceRecords = [];
          this.isAttendanceLoaded = true;
        })
        .getAttendance();
    },
    handleFileUpload(event, type) {
      const file = event.target.files[0];
      if (!file) return;
      this.fileToUpload[type] = file;
      if (type === 'photo' || type === 'editPhoto') {
        const reader = new FileReader();
        reader.onload = e => {
          if (type === 'photo') {
            this.newEmployee.preview = e.target.result;
          } else {
            this.editingEmployee.preview = e.target.result;
          }
        };
        reader.readAsDataURL(file);
      }
    },
    handleImageError(employee) {
      console.log('Image load error for employee:', employee.id, 'URL:', employee.photo);
      employee.photo = '';
    },
    uploadFile(file, callback) {
      if (!file) return callback(null);
      const reader = new FileReader();
      reader.onload = () => {
        google.script.run
          .withSuccessHandler(result => {
            if (result.success) {
              callback(result.fileUrl);
            } else {
              this.errorMessage = 'เกิดข้อผิดพลาดในการอัปโหลดไฟล์';
              callback(null);
            }
          })
          .withFailureHandler(err => {
            this.errorMessage = 'เกิดข้อผิดพลาดในการอัปโหลดไฟล์: ' + err.message;
            callback(null);
          })
          .uploadFile(file.name, reader.result.split(',')[1], file.type);
      };
      reader.readAsDataURL(file);
    },
    addEmployee() {
      if (!this.newEmployee.name) {
        this.errorMessage = 'กรุณากรอกชื่อ-นามสกุล';
        return;
      }
      const uploadPhoto = callback => this.uploadFile(this.fileToUpload.photo, callback);
      const uploadDocument = callback => this.uploadFile(this.fileToUpload.document, callback);

      uploadPhoto(photoUrl => {
        this.newEmployee.photo = photoUrl || '';
        uploadDocument(docUrl => {
          this.newEmployee.documents = docUrl || '';
          google.script.run
            .withSuccessHandler(result => {
              if (result.success) {
                this.loadEmployees();
                this.newEmployee = { 
                  name: '', 
                  position: '', 
                  department: '', 
                  photo: '', 
                  documents: '', 
                  preview: '',
                  nickname: '',
                  birthdate: '',
                  address: '',
                  education: '',
                  phone: '',
                  lineId: ''
                };
                this.fileToUpload.photo = null;
                this.fileToUpload.document = null;
                this.errorMessage = '';
                alert('เพิ่มพนักงานสำเร็จ');
              } else {
                this.errorMessage = 'เกิดข้อผิดพลาดในการเพิ่มพนักงาน';
              }
            })
            .withFailureHandler(err => {
              this.errorMessage = 'เกิดข้อผิดพลาด: ' + err.message;
            })
            .addEmployee(this.newEmployee);
        });
      });
    },
    startEditEmployee(employee) {
      this.editingEmployee = { ...employee, preview: '' };
      this.fileToUpload.editPhoto = null;
      this.fileToUpload.editDocument = null;
    },
    updateEmployee() {
      if (!this.editingEmployee.name) {
        this.errorMessage = 'กรุณากรอกชื่อ-นามสกุล';
        return;
      }
      const uploadPhoto = callback => this.uploadFile(this.fileToUpload.editPhoto, callback);
      const uploadDocument = callback => this.uploadFile(this.fileToUpload.editDocument, callback);

      uploadPhoto(photoUrl => {
        if (photoUrl) this.editingEmployee.photo = photoUrl;
        uploadDocument(docUrl => {
          if (docUrl) this.editingEmployee.documents = docUrl;
          google.script.run
            .withSuccessHandler(result => {
              if (result.success) {
                this.loadEmployees();
                this.editingEmployee = null;
                this.fileToUpload.editPhoto = null;
                this.fileToUpload.editDocument = null;
                this.errorMessage = '';
                alert('แก้ไขข้อมูลพนักงานสำเร็จ');
              } else {
                this.errorMessage = result.message || 'เกิดข้อผิดพลาดในการแก้ไขข้อมูลพนักงาน';
              }
            })
            .withFailureHandler(err => {
              this.errorMessage = 'เกิดข้อผิดพลาด: ' + err.message;
            })
            .updateEmployee(this.editingEmployee);
        });
      });
    },
    cancelEdit() {
      this.editingEmployee = null;
      this.fileToUpload.editPhoto = null;
      this.fileToUpload.editDocument = null;
    },
    confirmDelete(employee) {
      this.employeeToDelete = employee;
    },
    deleteEmployee(id) {
      google.script.run
        .withSuccessHandler(result => {
          if (result.success) {
            this.loadEmployees();
            this.employeeToDelete = null;
            alert('ลบพนักงานสำเร็จ');
          } else {
            this.errorMessage = result.message || 'เกิดข้อผิดพลาดในการลบพนักงาน';
          }
        })
        .withFailureHandler(err => {
          this.errorMessage = 'เกิดข้อผิดพลาด: ' + err.message;
        })
        .deleteEmployee(id);
    },
    addDepartment() {
      if (!this.newDepartment.name) {
        this.errorMessage = 'กรุณากรอกชื่อแผนก';
        return;
      }
      google.script.run
        .withSuccessHandler(result => {
          if (result.success) {
            this.loadDepartments();
            this.newDepartment.name = '';
            alert('เพิ่มแผนกสำเร็จ');
          } else {
            this.errorMessage = 'เกิดข้อผิดพลาดในการเพิ่มแผนก';
          }
        })
        .withFailureHandler(err => {
          this.errorMessage = 'เกิดข้อผิดพลาด: ' + err.message;
        })
        .addDepartment(this.newDepartment);
    },
    startEditDepartment(department) {
      this.editingDepartment = { ...department };
    },
    updateDepartment() {
      if (!this.editingDepartment.name) {
        this.errorMessage = 'กรุณากรอกชื่อแผนก';
        return;
      }
      google.script.run
        .withSuccessHandler(result => {
          if (result.success) {
            this.loadDepartments();
            this.editingDepartment = null;
            alert('แก้ไขแผนกสำเร็จ');
          } else {
            this.errorMessage = result.message || 'เกิดข้อผิดพลาดในการแก้ไขแผนก';
          }
        })
        .withFailureHandler(err => {
          this.errorMessage = 'เกิดข้อผิดพลาด: ' + err.message;
        })
        .updateDepartment(this.editingDepartment);
    },
    cancelEditDepartment() {
      this.editingDepartment = null;
    },
    confirmDeleteDepartment(department) {
      this.departmentToDelete = department;
    },
    deleteDepartment(id) {
      google.script.run
        .withSuccessHandler(result => {
          if (result.success) {
            this.loadDepartments();
            this.departmentToDelete = null;
            alert('ลบแผนกสำเร็จ');
          } else {
            this.errorMessage = result.message || 'เกิดข้อผิดพลาดในการลบแผนก';
          }
        })
        .withFailureHandler(err => {
          this.errorMessage = 'เกิดข้อผิดพลาด: ' + err.message;
        })
        .deleteDepartment(id);
    },
    addAttendance() {
      if (!this.newAttendance.employeeId || !this.newAttendance.status || !this.newAttendance.date) {
        this.errorMessage = 'กรุณากรอกข้อมูลการลงเวลาให้ครบถ้วน';
        return;
      }
      google.script.run
        .withSuccessHandler(result => {
          if (result.success) {
            this.fetchAttendanceRecords();
            this.newAttendance = {
              employeeId: '',
              status: '',
              date: new Date().toISOString().split('T')[0]
            };
            alert('บันทึกการลงเวลาสำเร็จ');
          } else {
            this.errorMessage = 'เกิดข้อผิดพลาดในการบันทึกการลงเวลา';
          }
        })
        .withFailureHandler(err => {
          this.errorMessage = 'เกิดข้อผิดพลาด: ' + err.message;
        })
        .addAttendance(this.newAttendance);
    },
    startEditAttendance(attendance) {
      this.editingAttendance = { ...attendance };
    },
    updateAttendance() {
      if (!this.editingAttendance.employeeId || !this.editingAttendance.status || !this.editingAttendance.date) {
        this.errorMessage = 'กรุณากรอกข้อมูลการลงเวลาให้ครบถ้วน';
        return;
      }
      google.script.run
        .withSuccessHandler(result => {
          if (result.success) {
            this.fetchAttendanceRecords();
            this.editingAttendance = null;
            alert('แก้ไขการลงเวลาสำเร็จ');
          } else {
            this.errorMessage = result.message || 'เกิดข้อผิดพลาดในการแก้ไขการลงเวลา';
          }
        })
        .withFailureHandler(err => {
          this.errorMessage = 'เกิดข้อผิดพลาด: ' + err.message;
        })
        .updateAttendance(this.editingAttendance);
    },
    cancelEditAttendance() {
      this.editingAttendance = null;
    },
    confirmDeleteAttendance(attendance) {
      this.attendanceToDelete = attendance;
    },
    deleteAttendance(id) {
      google.script.run
        .withSuccessHandler(result => {
          if (result.success) {
            this.fetchAttendanceRecords();
            this.attendanceToDelete = null;
            alert('ลบการลงเวลาสำเร็จ');
          } else {
            this.errorMessage = result.message || 'เกิดข้อผิดพลาดในการลบการลงเวลา';
          }
        })
        .withFailureHandler(err => {
          this.errorMessage = 'เกิดข้อผิดพลาด: ' + err.message;
        })
        .deleteAttendance(id);
    },
    addUser() {
      if (!this.newUser.email || !this.newUser.password) {
        this.errorMessage = 'กรุณากรอกอีเมลและรหัสผ่าน';
        return;
      }
      google.script.run
        .withSuccessHandler(result => {
          if (result.success) {
            this.newUser = { email: '', password: '', role: 'employee' };
            alert('เพิ่มผู้ใช้งานสำเร็จ');
          } else {
            this.errorMessage = 'เกิดข้อผิดพลาดในการเพิ่มผู้ใช้งาน';
          }
        })
        .withFailureHandler(err => {
          this.errorMessage = 'เกิดข้อผิดพลาด: ' + err.message;
        })
        .addUser(this.newUser);
    },
    getEmployeeName(employeeId) {
      const employee = this.employees.find(emp => emp.id === employeeId);
      return employee ? employee.name : 'ไม่พบพนักงาน';
    },
    translateStatus(status) {
      const statusMap = {
        present: 'มาทำงาน',
        absent: 'ขาดงาน',
        leave: 'ลากิจ',
        sick: 'ลาป่วย',
        out: 'นอกหน่วย'
      };
      return statusMap[status] || status;
    },
    formatDate(date) {
      if (!date) return '';
      try {
        return new Date(date).toLocaleDateString('th-TH', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });
      } catch (e) {
        return date;
      }
    },
    getStatusClass(status) {
      const classes = {
        present: 'text-green-600',
        absent: 'text-red-600',
        leave: 'text-yellow-600',
        sick: 'text-orange-600',
        out: 'text-purple-600'
      };
      return classes[status] || 'text-gray-600';
    },
    renderChart() {
  if (this.chart) {
    this.chart.destroy();
  }
  const ctx = document.getElementById('statusChart').getContext('2d');
  const status = this.dashboardData.status || {};
  const data = [
    Number(status.present) || 0,
    Number(status.absent) || 0,
    Number(status.leave) || 0,
    Number(status.sick) || 0,
    Number(status.out) || 0
  ];
  this.chart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: ['มาทำงาน', 'ขาดงาน', 'ลากิจ', 'ลาป่วย', 'นอกหน่วย'],
      datasets: [{
        label: 'จำนวนพนักงาน',
        data: data,
        backgroundColor: [
          'rgba(34, 197, 94, 0.6)',
          'rgba(239, 68, 68, 0.6)',
          'rgba(234, 179, 8, 0.6)',
          'rgba(249, 115, 22, 0.6)',
          'rgba(168, 85, 247, 0.6)'
        ],
        borderColor: [
          'rgba(34, 197, 94, 1)',
          'rgba(239, 68, 68, 1)',
          'rgba(234, 179, 8, 1)',
          'rgba(249, 115, 22, 1)',
          'rgba(168, 85, 247, 1)'
        ],
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true, // เปลี่ยนเป็น true เพื่อรักษาสัดส่วน
      aspectRatio: 2, // กำหนดสัดส่วนกว้าง:สูง (2:1)
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            stepSize: 1
          }
        }
      },
      plugins: {
        legend: {
          display: false
        }
      }
    }
  });
},
  mounted() {
    if (this.isLoggedIn && this.currentPage === 'dashboard') {
      this.loadDashboard();
    }
  }
});
