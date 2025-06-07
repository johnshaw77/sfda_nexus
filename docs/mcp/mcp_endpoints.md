```JSON
{
"message": "MCP Server is running",
"version": "1.0.0",
"endpoints": {
"health": "/health",
"tools": "/tools",
"toolTest": "/tools/:toolName",
"toolStats": "/tools/stats",
"toolHealth": "/tools/health",
"mcp": "/mcp",
"sse": "/sse",
"sseStats": "/sse/stats",
"hrApi": "/api/hr/:toolName",
"hrTools": "/api/hr/tools",
"financeApi": "/api/finance/:toolName",
"financeTools": "/api/finance/tools",
"tasksApi": "/api/tasks/:toolName",
"tasksTools": "/api/tasks/tools",
"qualityOverview": "/api/quality/overview",
"qualityCache": "/api/quality/cache",
"qualityVersions": "/api/quality/versions",
"qualityStats": "/api/quality/stats"
},
"modules": {
"hr": {
"endpoint": "/api/hr/:toolName",
"tools": [
"get_employee_info",
"get_employee_list",
"get_attendance_record",
"get_salary_info",
"get_department_list"
]
},
"finance": {
"endpoint": "/api/finance/:toolName",
"tools": [
"get_budget_status"
]
},
"tasks": {
"endpoint": "/api/tasks/:toolName",
"tools": [
"create_task",
"get_task_list"
]
}
},
"mcp": {
"protocolVersion": "2024-11-05",
"supported": true
},
"toolsRegistered": 8
}
解釋
```
