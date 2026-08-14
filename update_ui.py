import re

with open('src/pages/Devices.tsx', 'r') as f:
    content = f.read()

# 1. Update the top header metrics replacing '{totalCount} TOTAL'
header_search = r'<span className="px-2 py-0\.5 bg-emerald-100 text-emerald-700 text-xs font-bold rounded-full border border-emerald-200">\s*\{totalCount\} TOTAL\s*</span>'
header_replace = """<div className="flex gap-2">
            <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-xs font-bold rounded-full border border-emerald-200">
              {deviceStats.totalCount} TOTAL
            </span>
            <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-bold rounded-full border border-blue-200">
              {deviceStats.percentageActive}% ACTIVE
            </span>
            <span className="px-2 py-0.5 bg-rose-100 text-rose-700 text-xs font-bold rounded-full border border-rose-200">
              {deviceStats.totalErrorAlerts} ERRORS
            </span>
          </div>"""
content = re.sub(header_search, header_replace, content)

# 2. Update the select element
select_search = r'<select className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500">'
select_replace = """<select
              value={selectedStatus}
              onChange={e => { setSelectedStatus(e.target.value); setPage(1); }}
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >"""
content = re.sub(select_search, select_replace, content)

# 3. Update table rendering from `devices.map` to `filteredDevices.map`
table_search = r'devices\.map\(\(device\) => \('
table_replace = 'filteredDevices.map((device) => ('
content = re.sub(table_search, table_replace, content)

with open('src/pages/Devices.tsx', 'w') as f:
    f.write(content)
