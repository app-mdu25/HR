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
      if (!this.newEmployee.name || !this.newEmployee.position || !this.newEmployee.department) {
        Swal.fire({
          icon: 'error',
          title: 'ข้อผิดพลาด',
          text: 'กรุณากรอกชื่อ, ตำแหน่ง และแผนกให้ครบถ้วน'
        });
        return;
      }
      this.isLoading = true;
      const uploadPhoto = this.fileToUpload.photo;
      const uploadDocument = this.fileToUpload.document;
      const employeeData = { ...this.newEmployee };
      const uploadPromises = [];
      if (uploadPhoto) {
        uploadPromises.push(new Promise(resolve => {
          this.uploadFile(uploadPhoto, url => {
            employeeData.photo = url || '';
            resolve();
          });
        }));
      }
      if (uploadDocument) {
        uploadPromises.push(new Promise(resolve => {
          this.uploadFile(uploadDocument, url => {
            employeeData.documents = url || '';
            resolve();
          });
        }));
      }
      Promise.all(uploadPromises).then(() => {
        google.script.run
          .withSuccessHandler(result => {
            this.isLoading = false;
            if (result.success) {
              Swal.fire({
                icon: 'success',
                title: 'เพิ่มพนักงานสำเร็จ',
                showConfirmButton: false,
                timer: 1500
              });
              this.loadEmployees();
              this.resetNewEmployee();
            } else {
              Swal.fire({
                icon: 'error',
                title: 'ข้อผิดพลาด',
                text: 'ไม่สามารถเพิ่มพนักงานได้'
              });
            }
          })
          .withFailureHandler(err => {
            this.isLoading = false;
            Swal.fire({
              icon: 'error',
              title: 'ข้อผิดพลาด',
              text: 'เกิดข้อผิดพลาด: ' + err.message
            });
          })
          .addEmployee(employeeData);
      }).catch(err => {
        this.isLoading = false;
        Swal.fire({
          icon: 'error',
          title: 'ข้อผิดพลาด',
          text: 'เกิดข้อผิดพลาดในการอัปโหลดไฟล์: ' + err.message
        });
      });
    },
    resetNewEmployee() {
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
    },
    startEditEmployee(employee) {
      this.editingEmployee = { ...employee, preview: employee.photo };
      this.fileToUpload.editPhoto = null;
      this.fileToUpload.editDocument = null;
    },
    updateEmployee() {
      if (!this.editingEmployee.name || !this.editingEmployee.position || !this.editingEmployee.department) {
        Swal.fire({
          icon: 'error',
          title: 'ข้อผิดพลาด',
          text: 'กรุณากรอกชื่อ, ตำแหน่ง และแผนกให้ครบถ้วน'
        });
        return;
      }
      this.isLoading = true;
      const uploadPhoto = this.fileToUpload.editPhoto;
      const uploadDocument = this.fileToUpload.editDocument;
      const employeeData = { ...this.editingEmployee };
      const uploadPromises = [];
      if (uploadPhoto) {
        uploadPromises.push(new Promise(resolve => {
          this.uploadFile(uploadPhoto, url => {
            employeeData.photo = url || employeeData.photo;
            resolve();
          });
        }));
      }
      if (uploadDocument) {
        uploadPromises.push(new Promise(resolve => {
          this.uploadFile(uploadDocument, url => {
            employeeData.documents = url || employeeData.documents;
            resolve();
          });
        }));
      }
      Promise.all(uploadPromises).then(() => {
        google.script.run
          .withSuccessHandler(result => {
            this.isLoading = false;
            if (result.success) {
              Swal.fire({
                icon: 'success',
                title: 'แก้ไขพนักงานสำเร็จ',
                showConfirmButton: false,
                timer: 1500
              });
              this.loadEmployees();
              this.editingEmployee = null;
            } else {
              Swal.fire({
                icon: 'error',
                title: 'ข้อผิดพลาด',
                text: result.message || 'ไม่สามารถแก้ไขพนักงานได้'
              });
            }
          })
          .withFailureHandler(err => {
            this.isLoading = false;
            Swal.fire({
              icon: 'error',
              title: 'ข้อผิดพลาด',
              text: 'เกิดข้อผิดพลาด: ' + err.message
            });
          })
          .updateEmployee(employeeData);
      }).catch(err => {
        this.isLoading = false;
        Swal.fire({
          icon: 'error',
          title: 'ข้อผิดพลาด',
          text: 'เกิดข้อผิดพลาดในการอัปโหลดไฟล์: ' + err.message
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
      this.isLoading = true;
      google.script.run
        .withSuccessHandler(result => {
          this.isLoading = false;
          if (result.success) {
            Swal.fire({
              icon: 'success',
              title: 'ลบพนักงานสำเร็จ',
              showConfirmButton: false,
              timer: 1500
            });
            this.loadEmployees();
            this.employeeToDelete = null;
          } else {
            Swal.fire({
              icon: 'error',
              title: 'ข้อผิดพลาด',
              text: result.message || 'ไม่สามารถลบพนักงานได้'
            });
          }
        })
        .withFailureHandler(err => {
          this.isLoading = false;
          Swal.fire({
            icon: 'error',
            title: 'ข้อผิดพลาด',
            text: 'เกิดข้อผิดพลาด: ' + err.message
          });
        })
        .deleteEmployee(id);
    },
    addDepartment() {
      if (!this.newDepartment.name) {
        Swal.fire({
          icon: 'error',
          title: 'ข้อผิดพลาด',
          text: 'กรุณากรอกชื่อแผนก'
        });
        return;
      }
      this.isLoading = true;
      google.script.run
        .withSuccessHandler(result => {
          this.isLoading = false;
          if (result.success) {
            Swal.fire({
              icon: 'success',
              title: 'เพิ่มแผนกสำเร็จ',
              showConfirmButton: false,
              timer: 1500
            });
            this.loadDepartments();
            this.newDepartment.name = '';
          } else {
            Swal.fire({
              icon: 'error',
              title: 'ข้อผิดพลาด',
              text: 'ไม่สามารถเพิ่มแผนกได้'
            });
          }
        })
        .withFailureHandler(err => {
          this.isLoading = false;
          Swal.fire({
            icon: 'error',
            title: 'ข้อผิดพลาด',
            text: 'เกิดข้อผิดพลาด: ' + err.message
          });
        })
        .addDepartment(this.newDepartment);
    },
    startEditDepartment(department) {
      this.editingDepartment = { ...department };
    },
    updateDepartment() {
      if (!this.editingDepartment.name) {
        Swal.fire({
          icon: 'error',
          title: 'ข้อผิดพลาด',
          text: 'กรุณากรอกชื่อแผนก'
        });
        return;
      }
      this.isLoading = true;
      google.script.run
        .withSuccessHandler(result => {
          this.isLoading = false;
          if (result.success) {
            Swal.fire({
              icon: 'success',
              title: 'แก้ไขแผนกสำเร็จ',
              showConfirmButton: false,
              timer: 1500
            });
            this.loadDepartments();
            this.editingDepartment = null;
          } else {
            Swal.fire({
              icon: 'error',
              title: 'ข้อผิดพลาด',
              text: result.message || 'ไม่สามารถแก้ไขแผนกได้'
            });
          }
        })
        .withFailureHandler(err => {
          this.isLoading = false;
          Swal.fire({
            icon: 'error',
            title: 'ข้อผิดพลาด',
            text: 'เกิดข้อผิดพลาด: ' + err.message
          });
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
      this.isLoading = true;
      google.script.run
        .withSuccessHandler(result => {
          this.isLoading = false;
          if (result.success) {
            Swal.fire({
              icon: 'success',
              title: 'ลบแผนกสำเร็จ',
              showConfirmButton: false,
              timer: 1500
            });
            this.loadDepartments();
            this.departmentToDelete = null;
          } else {
            Swal.fire({
              icon: 'error',
              title: 'ข้อผิดพลาด',
              text: result.message || 'ไม่สามารถลบแผนกได้'
            });
          }
        })
        .withFailureHandler(err => {
          this.isLoading = false;
          Swal.fire({
            icon: 'error',
            title: 'ข้อผิดพลาด',
            text: 'เกิดข้อผิดพลาด: ' + err.message
          });
        })
        .deleteDepartment(id);
    },
    addAttendance() {
      if (!this.newAttendance.employeeId || !this.newAttendance.status || !this.newAttendance.date) {
        Swal.fire({
          icon: 'error',
          title: 'ข้อผิดพลาด',
          text: 'กรุณากรอกข้อมูลการลงเวลาให้ครบถ้วน'
        });
        return;
      }
      this.isLoading = true;
      google.script.run
        .withSuccessHandler(result => {
          this.isLoading = false;
          if (result.success) {
            Swal.fire({
              icon: 'success',
              title: 'บันทึกการลงเวลาสำเร็จ',
              showConfirmButton: false,
              timer: 1500
            });
            this.loadAttendance();
            this.newAttendance = {
              employeeId: '',
              status: '',
              date: new Date().toISOString().split('T')[0]
            };
          } else {
            Swal.fire({
              icon: 'error',
              title: 'ข้อผิดพลาด',
              text: 'ไม่สามารถบันทึกการลงเวลาได้'
            });
          }
        })
        .withFailureHandler(err => {
          this.isLoading = false;
          Swal.fire({
            icon: 'error',
            title: 'ข้อผิดพลาด',
            text: 'เกิดข้อผิดพลาด: ' + err.message
          });
        })
        .addAttendance(this.newAttendance);
    },
    startEditAttendance(attendance) {
      this.editingAttendance = { ...attendance };
    },
    updateAttendance() {
      if (!this.editingAttendance.employeeId || !this.editingAttendance.status || !this.editingAttendance.date) {
        Swal.fire({
          icon: 'error',
          title: 'ข้อผิดพลาด',
          text: 'กรุณากรอกข้อมูลการลงเวลาให้ครบถ้วน'
        });
        return;
      }
      this.isLoading = true;
      google.script.run
        .withSuccessHandler(result => {
          this.isLoading = false;
          if (result.success) {
            Swal.fire({
              icon: 'success',
              title: 'แก้ไขการลงเวลาสำเร็จ',
              showConfirmButton: false,
              timer: 1500
            });
            this.loadAttendance();
            this.editingAttendance = null;
          } else {
            Swal.fire({
              icon: 'error',
              title: 'ข้อผิดพลาด',
              text: result.message || 'ไม่สามารถแก้ไขการลงเวลาได้'
            });
          }
        })
        .withFailureHandler(err => {
          this.isLoading = false;
          Swal.fire({
            icon: 'error',
            title: 'ข้อผิดพลาด',
            text: 'เกิดข้อผิดพลาด: ' + err.message
          });
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
      this.isLoading = true;
      google.script.run
        .withSuccessHandler(result => {
          this.isLoading = false;
          if (result.success) {
            Swal.fire({
              icon: 'success',
              title: 'ลบการลงเวลาสำเร็จ',
              showConfirmButton: false,
              timer: 1500
            });
            this.loadAttendance();
            this.attendanceToDelete = null;
          } else {
            Swal.fire({
              icon: 'error',
              title: 'ข้อผิดพลาด',
              text: result.message || 'ไม่สามารถลบการลงเวลาได้'
            });
          }
        })
        .withFailureHandler(err => {
          this.isLoading = false;
          Swal.fire({
            icon: 'error',
            title: 'ข้อผิดพลาด',
            text: 'เกิดข้อผิดพลาด: ' + err.message
          });
        })
        .deleteAttendance(id);
    },
    addUser() {
      if (!this.newUser.email || !this.newUser.password) {
        Swal.fire({
          icon: 'error',
          title: 'ข้อผิดพลาด',
          text: 'กรุณากรอกอีเมลและรหัสผ่าน'
        });
        return;
      }
      this.isLoading = true;
      google.script.run
        .withSuccessHandler(result => {
          this.isLoading = false;
          if (result.success) {
            Swal.fire({
              icon: 'success',
              title: 'เพิ่มผู้ใช้งานสำเร็จ',
              showConfirmButton: false,
              timer: 1500
            });
            this.newUser = { email: '', password: '', role: 'employee' };
          } else {
            Swal.fire({
              icon: 'error',
              title: 'ข้อผิดพลาด',
              text: 'ไม่สามารถเพิ่มผู้ใช้งานได้'
            });
          }
        })
        .withFailureHandler(err => {
          this.isLoading = false;
          Swal.fire({
            icon: 'error',
            title: 'ข้อผิดพลาด',
            text: 'เกิดข้อผิดพลาด: ' + err.message
          });
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
      } catch {
        return date;
      }
    },
    renderChart() {
      if (this.chart) {
        this.chart.destroy();
      }
      const ctx = document.getElementById('statusChart').getContext('2d');
      this.chart = new Chart(ctx, {
        type: 'bar',
        data: {
          labels: ['มาทำงาน', 'ขาดงาน', 'ลากิจ', 'ลาป่วย', 'นอกหน่วย'],
          datasets: [{
            label: 'จำนวนพนักงาน',
            data: [
              this.dashboardData.present,
              this.dashboardData.absent,
              this.dashboardData.leave,
              this.dashboardData.sick,
              this.dashboardData.out
            ],
            backgroundColor: [
              'rgba(34, 197, 94, 0.6)',
              'rgba(239, 68, 68, 0.6)',
              'rgba(234, 179, 8, 0.6)',
              'rgba(168, 85, 247, 0.6)',
              'rgba(59, 130, 246, 0.6)'
            ],
            borderColor: [
              'rgba(34, 197, 94, 1)',
              'rgba(239, 68, 68, 1)',
              'rgba(234, 179, 8, 1)',
              'rgba(168, 85, 247, 1)',
              'rgba(59, 130, 246, 1)'
            ],
            borderWidth: 1
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
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
    }
  },
  mounted() {
    if (this.isLoggedIn) {
      this.loadEmployees();
      this.loadDepartments();
      this.loadAttendance();
      if (this.currentPage === 'dashboard') {
        this.loadDashboard();
      }
    }
  }
});
