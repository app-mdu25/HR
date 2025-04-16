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
    isLoading: false,
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
        (emp.phone || '').toLowerCase().includes(query.toLowerCase())
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
      this.isLoading = true;
      google.script.run
        .withSuccessHandler(result => {
          this.isLoading = false;
          if (result.success) {
            this.isLoggedIn = true;
            this.userRole = result.role;
            this.errorMessage = '';
            Swal.fire({
              icon: 'success',
              title: 'เข้าสู่ระบบสำเร็จ',
              showConfirmButton: false,
              timer: 1500
            });
            this.loadEmployees();
            this.loadDepartments();
            this.loadAttendance();
            if (this.currentPage === 'dashboard') {
              this.loadDashboard();
            }
          } else {
            this.errorMessage = result.message + ' กรุณาตรวจสอบอีเมลและรหัสผ่าน';
            Swal.fire({
              icon: 'error',
              title: 'เข้าสู่ระบบล้มเหลว',
              text: this.errorMessage
            });
          }
        })
        .withFailureHandler(err => {
          this.isLoading = false;
          this.errorMessage = 'เกิดข้อผิดพลาดในการเชื่อมต่อ: ' + err.message;
          Swal.fire({
            icon: 'error',
            title: 'ข้อผิดพลาด',
            text: this.errorMessage
          });
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
      Swal.fire({
        icon: 'success',
        title: 'ออกจากระบบสำเร็จ',
        showConfirmButton: false,
        timer: 1500
      });
    },
    loadDashboard() {
      this.isLoading = true;
      google.script.run
        .withSuccessHandler(data => {
          this.isLoading = false;
          this.dashboardData = data;
          if (this.currentPage === 'dashboard') {
            this.$nextTick(() => {
              this.renderChart();
            });
          }
        })
        .withFailureHandler(err => {
          this.isLoading = false;
          this.errorMessage = 'เกิดข้อผิดพลาดในการโหลดข้อมูลแดชบอร์ด: ' + err.message;
          Swal.fire({
            icon: 'error',
            title: 'ข้อผิดพลาด',
            text: this.errorMessage
          });
        })
        .getDashboardData();
    },
    loadEmployees() {
      this.isLoading = true;
      google.script.run
        .withSuccessHandler(data => {
          this.isLoading = false;
          this.employees = data;
        })
        .withFailureHandler(err => {
          this.isLoading = false;
          this.errorMessage = 'เกิดข้อผิดพลาดในการโหลดข้อมูลพนักงาน: ' + err.message;
          Swal.fire({
            icon: 'error',
            title: 'ข้อผิดพลาด',
            text: this.errorMessage
          });
        })
        .getEmployees();
    },
    loadDepartments() {
      this.isLoading = true;
      google.script.run
        .withSuccessHandler(data => {
          this.isLoading = false;
          this.departments = data;
        })
        .withFailureHandler(err => {
          this.isLoading = false;
          this.errorMessage = 'เกิดข้อผิดพลาดในการโหลดข้อมูลแผนก: ' + err.message;
          Swal.fire({
            icon: 'error',
            title: 'ข้อผิดพลาด',
            text: this.errorMessage
          });
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
            this.isLoading = false;
            this.errorMessage = 'เกิดข้อผิดพลาดในการโหลดข้อมูลพนักงาน: ' + err.message;
            this.isAttendanceLoaded = true;
            Swal.fire({
              icon: 'error',
              title: 'ข้อผิดพลาด',
              text: this.errorMessage
            });
          })
          .getEmployees();
      } else {
        this.fetchAttendanceRecords();
      }
    },
    fetchAttendanceRecords() {
      this.isLoading = true;
      google.script.run
        .withSuccessHandler(data => {
          this.isLoading = false;
          this.attendanceRecords = Array.isArray(data) ? data : [];
          this.isAttendanceLoaded = true;
        })
        .withFailureHandler(err => {
          this.isLoading = false;
          this.errorMessage = 'เกิดข้อผิดพลาดในการโหลดข้อมูลการลงเวลา: ' + err.message;
          this.attendanceRecords = [];
          this.isAttendanceLoaded = true;
          Swal.fire({
            icon: 'error',
            title: 'ข้อผิดพลาด',
            text: this.errorMessage
          });
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
      this.isLoading = true;
      const reader = new FileReader();
      reader.onload = () => {
        google.script.run
          .withSuccessHandler(result => {
            this.isLoading = false;
            if (result.success) {
              callback(result.fileUrl);
            } else {
              this.errorMessage = 'เกิดข้อผิดพลาดในการอัปโหลดไฟล์';
              Swal.fire({
                icon: 'error',
                title: 'ข้อผิดพลาด',
                text: this.errorMessage
              });
              callback(null);
            }
          })
          .withFailureHandler(err => {
            this.isLoading = false;
            this.errorMessage = 'เกิดข้อผิดพลาดในการอัปโหลดไฟล์: ' + err.message;
            Swal.fire({
              icon: 'error',
              title: 'ข้อผิดพลาด',
              text: this.errorMessage
            });
            callback(null);
          })
          .uploadFile(file.name, reader.result.split(',')[1], file.type);
      };
      reader.readAsDataURL(file);
    },
    addEmployee() {
