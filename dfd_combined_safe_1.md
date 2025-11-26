```mermaid
flowchart TD

classDef entity fill:#f9f,stroke:#333,stroke-width:1px;
classDef process fill:#bbf,stroke:#333,stroke-width:1px;
classDef datastore fill:#bfb,stroke:#333,stroke-width:1px;

    User([User]):::entity
subgraph Frontend_assets["assets Frontend"]
    assets_FE_unichemLogoBase64(unichemLogoBase64):::process
end

    User --> assets_FE_unichemLogoBase64
subgraph Frontend_components["components Frontend"]
    components_FE_Button(Button):::process
    components_FE_CanAccess(CanAccess):::process
    components_FE_ConfirmDeleteModal(ConfirmDeleteModal):::process
    components_FE_ConfirmLoginModal(ConfirmLoginModal):::process
    components_FE_DonutChart(DonutChart):::process
    components_FE_InputField(InputField):::process
    components_FE_ProtectedRoute(ProtectedRoute):::process
    components_FE_RadioGroup(RadioGroup):::process
    components_FE_Sidebar(Sidebar):::process
    components_FE_sidebarConfig(sidebarConfig):::process
    components_FE_DynamicForm(DynamicForm):::process
    components_FE_Stepper(Stepper):::process
end

    User --> components_FE_Button
    User --> components_FE_CanAccess
    User --> components_FE_ConfirmDeleteModal
    User --> components_FE_ConfirmLoginModal
    User --> components_FE_DonutChart
    User --> components_FE_InputField
    User --> components_FE_ProtectedRoute
    User --> components_FE_RadioGroup
    User --> components_FE_Sidebar
    User --> components_FE_sidebarConfig
    User --> components_FE_DynamicForm
    User --> components_FE_Stepper
subgraph Frontend_context["context Frontend"]
    context_FE_AbilityContext(AbilityContext):::process
    context_FE_ApplicationsContext(ApplicationsContext):::process
    context_FE_ApproverContext(ApproverContext):::process
    context_FE_AuthContext(AuthContext):::process
    context_FE_FormContext(FormContext):::process
    context_FE_UserContext(UserContext):::process
end

    User --> context_FE_AbilityContext
    User --> context_FE_ApplicationsContext
    User --> context_FE_ApproverContext
    User --> context_FE_AuthContext
    User --> context_FE_FormContext
    User --> context_FE_UserContext
subgraph Frontend_data["data Frontend"]
    data_FE_formFields(formFields):::process
    data_FE_mockUsers(mockUsers):::process
    data_FE_plantAdminLimited(plantAdminLimited):::process
end

    User --> data_FE_formFields
    User --> data_FE_mockUsers
    User --> data_FE_plantAdminLimited
subgraph Frontend_pages["pages Frontend"]
    pages_FE_AccessDenied(AccessDenied):::process
    pages_FE_AccessDetails(AccessDetails):::process
    pages_FE_AccessRequestDetails(AccessRequestDetails):::process
    pages_FE_AccessRequestModal(AccessRequestModal):::process
    pages_FE_AccessRequests(AccessRequests):::process
    pages_FE_AccessRequestsTable(AccessRequestsTable):::process
    pages_FE_ActivityLogContext(ActivityLogContext):::process
    pages_FE_ActivityMasterTable(ActivityMasterTable):::process
    pages_FE_ProfileIconWithLogout(ProfileIconWithLogout):::process
    pages_FE_AddRolePanel(AddRolePanel):::process
    pages_FE_AddUserFormPage(AddUserFormPage):::process
    pages_FE_AddUserPanel(AddUserPanel):::process
    pages_FE_EditUserFormPage(EditUserFormPage):::process
    pages_FE_DashboardStats(DashboardStats):::process
    pages_FE_RecentActivity(RecentActivity):::process
    pages_FE_AddApplicationFormPage(AddApplicationFormPage):::process
    pages_FE_AddApplicationMaster(AddApplicationMaster):::process
    pages_FE_ApplicationMasterTable(ApplicationMasterTable):::process
    pages_FE_EditApplicationFormPage(EditApplicationFormPage):::process
    pages_FE_EditApplicationMaster(EditApplicationMaster):::process
    pages_FE_ApprovalHistoryTable(ApprovalHistoryTable):::process
    pages_FE_CorporateWorkflowBuilder(CorporateWorkflowBuilder):::process
    pages_FE_CorporateWorkflowList(CorporateWorkflowList):::process
    pages_FE_PlantWorkflowBuilder(PlantWorkflowBuilder):::process
    pages_FE_PlantWorkflowList(PlantWorkflowList):::process
    pages_FE_types(types):::process
    pages_FE_WorkflowBuilder(WorkflowBuilder):::process
    pages_FE_workflowHelpers(workflowHelpers):::process
    pages_FE_ApproverDashboard(ApproverDashboard):::process
    pages_FE_ComplianceReports(ComplianceReports):::process
    pages_FE_AddDeptFormPage(AddDeptFormPage):::process
    pages_FE_DepartmentContext(DepartmentContext):::process
    pages_FE_EditDeptFormPage(EditDeptFormPage):::process
    pages_FE_DepartmentMasterTable(DepartmentMasterTable):::process
    pages_FE_ProfileIconWithLogout(ProfileIconWithLogout):::process
    pages_FE_DepartmentTable(DepartmentTable):::process
    pages_FE_GenerateCredentials(GenerateCredentials):::process
    pages_FE_Login(Login):::process
    pages_FE_AddPlantITSupportMaster(AddPlantITSupportMaster):::process
    pages_FE_EditAddPlantITSupportMaster(EditAddPlantITSupportMaster):::process
    pages_FE_PlantITSupport(PlantITSupport):::process
    pages_FE_PlantITSupportMaster(PlantITSupportMaster):::process
    pages_FE_ProfileIconWithLogout(ProfileIconWithLogout):::process
    pages_FE_AddPlantMaster(AddPlantMaster):::process
    pages_FE_EditPlantMaster(EditPlantMaster):::process
    pages_FE_PlantContext(PlantContext):::process
    pages_FE_PlantMasterTable(PlantMasterTable):::process
    pages_FE_ProfileIconWithLogout(ProfileIconWithLogout):::process
    pages_FE_ReviewSubmit(ReviewSubmit):::process
    pages_FE_RoleMasterTable(RoleMasterTable):::process
    pages_FE_AddServerInventoryMaster(AddServerInventoryMaster):::process
    pages_FE_EditServerInventoryMaster(EditServerInventoryMaster):::process
    pages_FE_ServerContext(ServerContext):::process
    pages_FE_ServerInventoryMasterTable(ServerInventoryMasterTable):::process
    pages_FE_ServiceRequestContext(ServiceRequestContext):::process
    pages_FE_ServiceRequestForm(ServiceRequestForm):::process
    pages_FE_ProfileIconWithLogout(ProfileIconWithLogout):::process
    pages_FE_ServiceRequestTable(ServiceRequestTable):::process
    pages_FE_AddServiceTaskClosureForm(AddServiceTaskClosureForm):::process
    pages_FE_ProfileIconWithLogout(ProfileIconWithLogout):::process
    pages_FE_ServiceTaskClosureTracking(ServiceTaskClosureTracking):::process
    pages_FE_ServiceTaskContext(ServiceTaskContext):::process
    pages_FE_ServiceTaskDetailView(ServiceTaskDetailView):::process
    pages_FE_Settings(Settings):::process
    pages_FE_SuperAdmin(SuperAdmin):::process
    pages_FE_SystemAdministration(SystemAdministration):::process
    pages_FE_AddSystemInventory(AddSystemInventory):::process
    pages_FE_EditSystemInventory(EditSystemInventory):::process
    pages_FE_SystemContext(SystemContext):::process
    pages_FE_SystemInventoryMasterTable(SystemInventoryMasterTable):::process
    pages_FE_AddTaskClosureForm(AddTaskClosureForm):::process
    pages_FE_ProfileIconWithLogout(ProfileIconWithLogout):::process
    pages_FE_TaskClosureTracking(TaskClosureTracking):::process
    pages_FE_TaskContext(TaskContext):::process
    pages_FE_TaskDetailView(TaskDetailView):::process
    pages_FE_TrackRequest(TrackRequest):::process
    pages_FE_TrackRequest(TrackRequest):::process
    pages_FE_UserInformation(UserInformation):::process
    pages_FE_UserManagement(UserManagement):::process
    pages_FE_UserMasterTable(UserMasterTable):::process
    pages_FE_UserRequestContext(UserRequestContext):::process
    pages_FE_UserRequestForm(UserRequestForm):::process
    pages_FE_ProfileIconWithLogout(ProfileIconWithLogout):::process
    pages_FE_UserRequestTable(UserRequestTable):::process
    pages_FE_AddVendorMaster(AddVendorMaster):::process
    pages_FE_ConfirmLoginModal(ConfirmLoginModal):::process
    pages_FE_EditVendorMaster(EditVendorMaster):::process
    pages_FE_VendorContext(VendorContext):::process
    pages_FE_ProfileIconWithLogout(ProfileIconWithLogout):::process
    pages_FE_VendorMasterTable(VendorMasterTable):::process
    pages_FE_WorkflowBuilder(WorkflowBuilder):::process
end

    User --> pages_FE_AccessDenied
    User --> pages_FE_AccessDetails
    User --> pages_FE_AccessRequestDetails
    User --> pages_FE_AccessRequestModal
    User --> pages_FE_AccessRequests
    User --> pages_FE_AccessRequestsTable
    User --> pages_FE_ActivityLogContext
    User --> pages_FE_ActivityMasterTable
    User --> pages_FE_ProfileIconWithLogout
    User --> pages_FE_AddRolePanel
    User --> pages_FE_AddUserFormPage
    User --> pages_FE_AddUserPanel
    User --> pages_FE_EditUserFormPage
    User --> pages_FE_DashboardStats
    User --> pages_FE_RecentActivity
    User --> pages_FE_AddApplicationFormPage
    User --> pages_FE_AddApplicationMaster
    User --> pages_FE_ApplicationMasterTable
    User --> pages_FE_EditApplicationFormPage
    User --> pages_FE_EditApplicationMaster
    User --> pages_FE_ApprovalHistoryTable
    User --> pages_FE_CorporateWorkflowBuilder
    User --> pages_FE_CorporateWorkflowList
    User --> pages_FE_PlantWorkflowBuilder
    User --> pages_FE_PlantWorkflowList
    User --> pages_FE_types
    User --> pages_FE_WorkflowBuilder
    User --> pages_FE_workflowHelpers
    User --> pages_FE_ApproverDashboard
    User --> pages_FE_ComplianceReports
    User --> pages_FE_AddDeptFormPage
    User --> pages_FE_DepartmentContext
    User --> pages_FE_EditDeptFormPage
    User --> pages_FE_DepartmentMasterTable
    User --> pages_FE_ProfileIconWithLogout
    User --> pages_FE_DepartmentTable
    User --> pages_FE_GenerateCredentials
    User --> pages_FE_Login
    User --> pages_FE_AddPlantITSupportMaster
    User --> pages_FE_EditAddPlantITSupportMaster
    User --> pages_FE_PlantITSupport
    User --> pages_FE_PlantITSupportMaster
    User --> pages_FE_ProfileIconWithLogout
    User --> pages_FE_AddPlantMaster
    User --> pages_FE_EditPlantMaster
    User --> pages_FE_PlantContext
    User --> pages_FE_PlantMasterTable
    User --> pages_FE_ProfileIconWithLogout
    User --> pages_FE_ReviewSubmit
    User --> pages_FE_RoleMasterTable
    User --> pages_FE_AddServerInventoryMaster
    User --> pages_FE_EditServerInventoryMaster
    User --> pages_FE_ServerContext
    User --> pages_FE_ServerInventoryMasterTable
    User --> pages_FE_ServiceRequestContext
    User --> pages_FE_ServiceRequestForm
    User --> pages_FE_ProfileIconWithLogout
    User --> pages_FE_ServiceRequestTable
    User --> pages_FE_AddServiceTaskClosureForm
    User --> pages_FE_ProfileIconWithLogout
    User --> pages_FE_ServiceTaskClosureTracking
    User --> pages_FE_ServiceTaskContext
    User --> pages_FE_ServiceTaskDetailView
    User --> pages_FE_Settings

```