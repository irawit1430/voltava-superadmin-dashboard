with open('src/pages/Dashboard.tsx', 'r') as f:
    content = f.read()

# Update grid layout for KPIs
content = content.replace(
    'className="grid grid-cols-1 md:grid-cols-4 gap-6"',
    'className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"'
)

# Update map container
content = content.replace(
    'className="h-40 bg-slate-800 rounded-lg relative w-full overflow-hidden mb-4 border border-slate-700"',
    'className="w-full h-[300px] sm:h-[400px] bg-slate-800 rounded-lg relative overflow-hidden mb-4 border border-slate-700"'
)

with open('src/pages/Dashboard.tsx', 'w') as f:
    f.write(content)
print("Updated Dashboard.tsx")
