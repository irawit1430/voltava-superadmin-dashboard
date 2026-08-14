import re

# Update Sidebar.tsx
with open('src/components/Sidebar.tsx', 'r') as f:
    sidebar_content = f.read()

sidebar_content = sidebar_content.replace(
    "import { LayoutDashboard, GraduationCap, Cpu, Users, Settings } from 'lucide-react';",
    "import { LayoutDashboard, GraduationCap, Cpu, Users, Settings, X } from 'lucide-react';"
)

sidebar_content = sidebar_content.replace(
    "export function Sidebar() {",
    "export function Sidebar({ isOpen, setIsOpen }: { isOpen: boolean; setIsOpen: (val: boolean) => void }) {"
)

sidebar_content = sidebar_content.replace(
    "<aside className=\"w-64 bg-slate-900 text-slate-400 h-screen flex flex-col fixed left-0 top-0 shrink-0\">",
    "<aside className={cn(\"w-64 bg-slate-900 text-slate-400 h-screen flex flex-col fixed left-0 top-0 shrink-0 z-50 transition-transform duration-300\", isOpen ? \"translate-x-0\" : \"-translate-x-full lg:translate-x-0\")}>"
)

sidebar_content = sidebar_content.replace(
    "Fleet Intelligence</p>\n          </div>\n        </div>\n      </div>",
    "Fleet Intelligence</p>\n          </div>\n        </div>\n        <button onClick={() => setIsOpen(false)} className=\"lg:hidden ml-auto p-1 hover:bg-slate-800 rounded text-slate-400\">\n          <X className=\"w-5 h-5\" />\n        </button>\n      </div>"
)

sidebar_content = re.sub(
    r"const isActive = location\.pathname === link\.href[^\n]*\n\s*return \(",
    r"const isActive = location.pathname === link.href || (link.href !== '/' && location.pathname.startsWith(link.href));\n          \n          return (",
    sidebar_content
)

# Add onclick to links to close sidebar
sidebar_content = re.sub(
    r"<Link\n\s*key={link\.name}\n\s*to={link\.href}\n\s*className={cn",
    r"<Link\n              key={link.name}\n              to={link.href}\n              onClick={() => setIsOpen(false)}\n              className={cn",
    sidebar_content
)

with open('src/components/Sidebar.tsx', 'w') as f:
    f.write(sidebar_content)


# Update Layout.tsx
with open('src/components/Layout.tsx', 'r') as f:
    layout_content = f.read()

layout_content = layout_content.replace(
    "import { Outlet, Navigate } from 'react-router-dom';",
    "import { Outlet, Navigate, useLocation } from 'react-router-dom';\nimport { useState, useEffect } from 'react';"
)

layout_content = layout_content.replace(
    "export function Layout() {",
    "export function Layout() {\n  const [sidebarOpen, setSidebarOpen] = useState(false);\n  const location = useLocation();\n\n  useEffect(() => {\n    setSidebarOpen(false);\n  }, [location.pathname]);\n"
)

layout_content = layout_content.replace(
    "<Sidebar />\n      <div className=\"flex-1 flex flex-col min-w-0\">",
    "      {sidebarOpen && (\n        <div \n          className=\"fixed inset-0 bg-slate-900/50 z-40 lg:hidden\" \n          onClick={() => setSidebarOpen(false)}\n        />\n      )}\n      <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />\n      <div className=\"flex-1 flex flex-col min-w-0\">"
)

layout_content = layout_content.replace(
    "<Header />",
    "<Header onMenuClick={() => setSidebarOpen(true)} />"
)

layout_content = layout_content.replace(
    "<main className=\"flex-1 overflow-auto ml-64 p-8\">",
    "<main className=\"flex-1 overflow-auto lg:ml-64 p-4 sm:p-8\">"
)

with open('src/components/Layout.tsx', 'w') as f:
    f.write(layout_content)

print("Updated Sidebar.tsx and Layout.tsx")
